import "server-only";
import type { ComposedEmail, EmailKind } from "@/app/command-center/_email";

/**
 * Command-center outbound delivery for the customer lifecycle emails
 * (approval + payment link, rejection, report). Separate file by task boundary:
 * lib/email.ts is owned by another builder, so this does NOT import it — it
 * renders the already-composed plain-text body (from _email.ts composeEmail)
 * into a minimal branded HTML shell and posts it to Resend directly.
 *
 * HARD GATE (two flags, both default OFF):
 *   - RESEND_API_KEY must be set (the provider credential), AND
 *   - CC_EMAIL_SEND_ENABLED must be exactly "true".
 * Absent either, deliverComposedEmail is a no-op that logs and returns
 * {sent:false}. queueEmail() still records EVERY email in cc_email_log for the
 * audit trail regardless — delivery is the only thing behind the gate. This
 * mirrors the deliberate Creator gate in payment-links.ts / _email.ts: the
 * console records the outbound; actually sending a pay link / report to a
 * customer is a launch-gated live action until Creator lifts it.
 *
 * ponytail: hand-rolls the ~10-line Resend POST instead of reusing
 * lib/email.ts's send() because that helper is not exported and the file is
 * owned by another builder mid-flight. Upgrade path: call a shared exported
 * sender once email.ts exposes one.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const FROM_BY_KIND: Record<EmailKind, string> = {
  approval: "AI Sec Tester <no-reply@thesoulsofai.com>",
  reject: "AI Sec Tester <no-reply@thesoulsofai.com>",
  report: "AI Sec Tester <reports@thesoulsofai.com>",
  disclosure: "AI Sec Tester <no-reply@thesoulsofai.com>",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Wrap the composed plain-text body in a minimal branded HTML shell. */
export function renderComposedHtml(composed: ComposedEmail, reportUrl?: string): string {
  const body = escapeHtml(composed.body).replace(/\n/g, "<br>");
  const cta = reportUrl
    ? `<p style="margin:20px 0 0"><a href="${escapeHtml(reportUrl)}" style="background:#5a45e6;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Download your full report</a><br><span style="color:#94a3b8;font-size:12px">Link valid for 30 days.</span></p>`
    : "";
  return `<!DOCTYPE html>
<html><body style="background:#f7f6f2;color:#151321;font-family:system-ui,sans-serif;padding:28px;max-width:600px;margin:0 auto">
<div style="background:#fff;border-radius:14px;padding:26px;border:1px solid #e7e3d8">
<p style="margin:0 0 16px;font-size:14px;line-height:1.6">${body}</p>
${cta}
</div>
<p style="color:#8a8578;font-size:11px;margin:16px 4px 0">AI Sec Tester · The Souls of AI</p>
</body></html>`;
}

export interface DeliveryResult {
  sent: boolean;
  reason?: string;
}

/**
 * Deliver a composed lifecycle email via Resend, behind the two-flag gate.
 * Never throws — a delivery failure logs and returns {sent:false} so the
 * calling server action (approve/reject/report) still completes its state
 * change + audit + queue. Delivery is best-effort by design; the queued
 * cc_email_log row is the durable record.
 */
export async function deliverComposedEmail(
  composed: ComposedEmail,
  opts?: { reportUrl?: string },
): Promise<DeliveryResult> {
  const key = process.env.RESEND_API_KEY;
  const enabled = process.env.CC_EMAIL_SEND_ENABLED === "true";
  if (!key || !enabled) {
    console.log(
      `[cc-email] gated — not sent (${composed.kind} → ${composed.toEmail}); ` +
        `set RESEND_API_KEY + CC_EMAIL_SEND_ENABLED=true to deliver.`,
    );
    return { sent: false, reason: "delivery gated" };
  }
  if (!composed.toEmail) return { sent: false, reason: "no recipient" };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_BY_KIND[composed.kind],
        to: composed.toEmail,
        subject: composed.subject,
        html: renderComposedHtml(composed, opts?.reportUrl),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[cc-email] Resend error:", res.status, text);
      return { sent: false, reason: `resend ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[cc-email] delivery failed:", e instanceof Error ? e.message : String(e));
    return { sent: false, reason: "fetch failed" };
  }
}
