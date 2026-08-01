import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { resolvePaymentLink } from "@/lib/payment-links";
import type { CaseView } from "@/app/command-center/_data";

/**
 * Email composition + QUEUE (audit log) for the console (server-only).
 *
 * composeEmail() renders the body from the PRD template + resolved merge tokens.
 * queueEmail() writes ONE cc_email_log row — the retained audit trail — and does
 * NOT send. Actual delivery is owned by ONE sender, deliverComposedEmail
 * (lib/email-templates.ts), behind the CC_EMAIL_SEND_ENABLED + RESEND_API_KEY
 * launch gate. Every lifecycle path that queues also calls deliverComposedEmail,
 * so there is exactly one send per email and the customer-facing gate governs it.
 * (queueEmail previously also sent via lib/email.sendEmail — that caused
 * double-sends and bypassed the launch gate; removed.)
 */

export const FROM_ADDRESS = "no-reply@thesoulsofai.com";
export type EmailKind = "approval" | "reject" | "report" | "disclosure";

export const EMAIL_TEMPLATES: Record<
  EmailKind,
  { name: string; trigger: string; color: string; subject: string }
> = {
  approval: {
    name: "Approval + payment link",
    trigger: "Admin approves a request",
    color: "#0f9d6b",
    subject: "Your AI chatbot security test is approved — pay to activate",
  },
  reject: {
    name: "Rejection + reason",
    trigger: "Admin rejects a request",
    color: "#e2453d",
    subject: "About your AI security test request",
  },
  report: {
    name: "Report delivery",
    trigger: "Scan completes",
    color: "#5a45e6",
    subject: "Your AI security test report is ready",
  },
  disclosure: {
    name: "Disclosure request",
    trigger: "Subscribed target needs provider notice",
    color: "#a87d1e",
    subject: "Action needed — notify your chatbot provider before we test",
  },
};

export interface ComposedEmail {
  kind: EmailKind;
  toEmail: string;
  subject: string;
  body: string;
}

function ref(view: CaseView): string {
  return `CASE-${view.case.id.slice(0, 8)}`;
}

/** Resolve the PRD merge tokens for a case into a finished subject + body. */
/**
 * Lift the engine's own incompleteness sentence into the customer email.
 * runScanEngine prefixes a summary with "PARTIAL SCAN — ..." or "INCOMPLETE
 * SCAN — ..." whenever the core OWASP coverage was not achieved. Returns "" for
 * a genuinely complete scan so a clean report stays clean.
 */
export function coverageCaveat(summary: string | null | undefined): string {
  const text = String(summary ?? "");
  const marker = /(PARTIAL SCAN —[^]*?)(?:Reachable|$)/.exec(text) ?? /(INCOMPLETE SCAN —[^]*?)(?:Reachable|$)/.exec(text);
  if (!marker) return "";
  return `
COVERAGE NOTICE: ${marker[1].trim()}
`;
}

export function composeEmail(
  kind: EmailKind,
  view: CaseView,
  extra?: { reason?: string },
): ComposedEmail {
  const req = view.req;
  const name = req?.full_name ?? "there";
  const company = req?.company ?? "your organization";
  const url = req?.target_url ?? "your chatbot";
  const email = req?.email ?? "";
  const tier = view.case.tier ?? req?.plan ?? "Normal";
  const r = ref(view);

  if (kind === "approval") {
    const link = resolvePaymentLink(tier);
    const payLink = link?.url ?? "(no payment link configured for this tier)";
    const tierLine = link ? link.label : tier;
    return {
      kind,
      toEmail: email,
      subject: `${EMAIL_TEMPLATES.approval.subject} (${r})`,
      body:
        `Hi ${name},\n\n` +
        `Your AI chatbot security test for ${company} (${url}) is approved.\n\n` +
        `Plan: ${tierLine}\n` +
        `Pay to activate the scan: ${payLink}\n\n` +
        `Reference: ${r}\n\n` +
        `Once payment is confirmed we activate the scan and email your report.\n\n` +
        `— AI Sec Tester`,
    };
  }

  if (kind === "reject") {
    const reason = extra?.reason ?? view.case.rejection_reason ?? "Request could not be approved.";
    return {
      kind,
      toEmail: email,
      subject: `About your AI security test request (${r})`,
      body:
        `Hi ${name},\n\n` +
        `About your AI security test request for ${company} (${url}):\n\n` +
        `${reason}\n\n` +
        `Reference: ${r}\n\n` +
        `This re-opens only if you can supply the missing authorization or licence.\n\n` +
        `— AI Sec Tester`,
    };
  }

  if (kind === "report") {
    const scan = view.scan;
    const verdict = (scan?.verdict ?? "pending").toUpperCase();
    const passed = scan?.tests_passed ?? 0;
    const total = scan?.tests_total ?? 5;
    const rescanToken = `RESCAN-${r}`;
    const scanRef = scan?.id ? `SCN-${scan.id.slice(0, 8)}` : "(no scan record)";
    return {
      kind,
      toEmail: email,
      subject: `Your AI security test report is ready — ${company}`,
      body:
        `Hi ${name},\n\n` +
        `Your AI security test for ${url} is complete.\n\n` +
        `Scan: ${scanRef}\n` +
        `Verdict: ${verdict} (${passed} of ${total} checks passed)\n` +
        // "4 of 4 checks passed" reads as a clean bill of health, but `total`
        // counts only the checks that RAN. When coverage was incomplete the
        // engine says so in the summary — and that caveat has to travel with the
        // headline, not sit in a record the customer never opens. Otherwise a
        // scan that could not reach two OWASP categories is reported as perfect.
        coverageCaveat(scan?.summary) +
        `\n` +
        // The token used to be redeemable at /enterprise/rescan, but that page was
        // RETIRED when the scan engine was made admin-activated only — it now just
        // tells visitors to contact support. Quoting a bare code with no way to
        // redeem it reads as a broken promise, so the copy states the real path.
        `One free re-scan is included for 30 days. Reply to this email quoting ` +
        `${rescanToken} and we'll schedule it.\n\n` +
        `Reference: ${r}\n\n` +
        `— AI Sec Tester`,
    };
  }

  // disclosure
  const platform = view.case.platform ?? "your chatbot provider";
  return {
    kind,
    toEmail: email,
    subject: `Action needed — notify your chatbot provider before we test (${r})`,
    body:
      `Hi ${name},\n\n` +
      `Your target ${url} runs on ${platform}. Before we can test, you must notify ` +
      `${platform} and forward their acknowledgement to us.\n\n` +
      `No scan activates until we have proof that ${platform} was informed.\n\n` +
      `Reference: ${r}\n\n` +
      `— AI Sec Tester`,
  };
}

/**
 * Record the composed email to cc_email_log (audit trail). Log-only — it does
 * NOT send. Delivery is owned by deliverComposedEmail (the single gated sender);
 * every caller that queues also delivers. The log insert is the durable source of
 * truth for "what the console fired". Never throws on a missing recipient.
 */
export async function queueEmail(caseId: string, composed: ComposedEmail): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("cc_email_log").insert({
    case_id: caseId,
    kind: composed.kind,
    to_email: composed.toEmail,
    subject: composed.subject,
    body: composed.body,
  });
  if (error) {
    console.error("queueEmail error:", error.message);
    throw new Error("Failed to queue email.");
  }
}
