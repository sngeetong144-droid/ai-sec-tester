"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/command-center/access";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { recordCaseAudit } from "@/lib/audit-log";
import {
  runScanForRequest,
  deliverCaseReport,
  type RunScanRow,
} from "@/lib/command-center/run-scan";
import {
  approveCase,
  rejectCase,
  advanceToApproval,
  completeCase,
} from "@/lib/command-center/queries";
import { loadCase } from "@/app/command-center/_data";
import { composeEmail, queueEmail } from "@/app/command-center/_email";
import { deliverComposedEmail } from "@/lib/email-templates";
import { executeScan } from "@/app/actions/scans";
import {
  approveScanRequestPayment,
  markRequestPaid,
} from "@/app/actions/scan-request-lifecycle";
import { resolvePaymentLink } from "@/lib/payment-links";
import { discoverChatbotEndpoint } from "@/lib/chatbot-discovery";

/**
 * Command-center mutations (server actions). EVERY action calls requireAdmin()
 * first, routes the state change through the guarded queries.ts helpers (which
 * append the append-only cc_audit_log row), then QUEUES the outbound email into
 * cc_email_log with status implicit "queued" — nothing is actually sent, and no
 * payment is charged. revalidatePath refreshes the console after each change.
 */

function revalidateConsole() {
  revalidatePath("/command-center", "layout");
}

/** Ingest a raw scan_requests intake into a cc_case (the intake-form → queue wiring). */
export async function ingestIntakeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  const supabase = createServiceClient();
  const { data: req } = await supabase
    .from("scan_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return;

  // ponytail: subscribed/platform default false/null — the intake form has no
  // provider field yet, so the console admin sets disclosure state manually.
  const { data: created, error } = await supabase
    .from("cc_cases")
    .insert({
      scan_request_id: req.id,
      tier: req.plan ?? null,
      status: "intake",
    })
    .select("id")
    .maybeSingle();
  if (error || !created) {
    console.error("ingestIntakeAction error:", error?.message);
    return;
  }
  await recordCaseAudit({
    caseId: created.id as string,
    eventType: "REQUEST_SUBMITTED",
    detail: req.full_name ?? null,
  });
  revalidateConsole();
}

/**
 * intake → approval. A freshly-ingested case lands in `intake` (triage review);
 * the Approve/Reject decision only renders at `approval`. This is the missing
 * link that made the whole downstream lifecycle unreachable — it clears triage
 * and hands the case to the decision step. Audit-logged via the transition.
 */
export async function advanceToApprovalAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  await advanceToApproval(id);
  revalidateConsole();
}

/**
 * approval → approved; stamp the linked scan_request with its payment link
 * (status approved_awaiting_payment + stripe_client_reference_id +
 * payment_link_sent_at), then queue the approval email carrying that EXACT
 * param-appended link. The customer pays → the Stripe webhook flips the request to
 * paid_scanning → the cron dispatch job runs the scan. No charge, no send here —
 * the email is QUEUED (existing repo pattern).
 */
export async function approveCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const updated = await approveCase(id);
  if (!updated) return;
  const view = await loadCase(id);
  if (!view) {
    revalidateConsole();
    return;
  }

  const composed = composeEmail("approval", view);
  const req = view.req;
  if (req) {
    const pay = await approveScanRequestPayment(
      req.id,
      view.case.tier ?? req.plan,
      req.email,
    );
    // Inject the exact param-appended checkout URL into the templated body (the
    // template renders the bare link.url; swap it for the client_reference_id one).
    if (pay) composed.body = composed.body.replace(pay.baseUrl, pay.url);
  }
  await queueEmail(id, composed);
  await deliverComposedEmail(composed);
  revalidateConsole();
}

/** intake|approval → rejected; reason required; queue rejection email. */
export async function rejectCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return;
  const updated = await rejectCase(id, reason);
  if (!updated) return;
  const view = await loadCase(id);
  if (view) {
    const composed = composeEmail("reject", view, { reason });
    await queueEmail(id, composed);
    await deliverComposedEmail(composed);
  }
  revalidateConsole();
}

/**
 * Run the security engine for an activated case (scanning state). This is the
 * production scan trigger: it hands off to executeScan (app/actions/scans.ts),
 * the SINGLE choke point that re-verifies isAdminSession() + the activated/paid
 * gate itself — so this action's requireAdmin() is defense-in-depth, not the only
 * check. executeScan reuses the case's linked `pending` scans row, advancing it to
 * running/complete; loadCase then reads real results. No engine call happens here
 * directly — the guard lives in one place. paid===true is already satisfied by the
 * prior activate step (which confirms payment); we do NOT bypass it.
 */
export async function runScanAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const view = await loadCase(id);
  if (!view) return;

  const target = view.scan?.target_url || view.req?.target_url || "";
  if (!target) {
    console.error("runScanAction: no target url for case", id);
    return;
  }

  try {
    // Tier and chatbot MUST be passed. executeScan defaults to tier "basic" with
    // no chatbot, so omitting them silently downgraded every Advanced ($197) and
    // Enterprise ($497) case to a 5-check transport-only scan with the interactive
    // OWASP probes recorded as not-run — the customer paid for 15 and got 5, with
    // nothing in the UI showing the downgrade. The cron path already does this
    // correctly; this mirrors lib/command-center/run-scan.ts.
    let chatbot: { url: string } | null = null;
    try {
      const found = await discoverChatbotEndpoint(target);
      if (found.endpoint) chatbot = { url: found.endpoint };
    } catch {
      chatbot = null; // discovery failure never blocks the transport checks
    }

    await executeScan({
      caseId: id,
      target,
      label: view.req?.company ?? null,
      email: view.req?.email ?? null,
      sessionId: null,
      chatbot,
      tier: resolvePaymentLink(view.req?.plan)?.tier ?? "basic",
    });
  } catch (err) {
    // Gate denials (ScanAuthorizationError) and engine errors surface in the
    // scans row (executeScan stamps `failed`) + server logs; the console refreshes.
    console.error(
      "runScanAction executeScan error:",
      err instanceof Error ? err.message : String(err),
    );
  }
  revalidateConsole();
}

/** Best-effort admin identity for the audit trail (requireAdmin already ran). */
async function adminEmail(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? "admin";
}

/**
 * MANUAL override for the "payment webhook never fired" case: a paid customer is
 * stuck in `approved` because Scalendo/FastPayDirect's checkout.session.completed
 * didn't reach us, so the cron dispatcher never saw `paid_scanning`. An admin who
 * has verified payment out-of-band runs the EXACT same guarded flow the cron uses
 * (runScanForRequest, no cronSecret — the admin session authorizes the engine).
 *
 * Not a gate bypass: executeScan still requires the case be scanning + paid, which
 * activateCase (inside runScanForRequest) sets. Idempotent — already-running or
 * already-complete cases return in_flight/reconciled without a double-run or throw.
 */
export async function manualActivateScanAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  if (!id) return;

  const supabase = createServiceClient();
  // The form carries the cc_case id; bridge to its scan_request (runScanForRequest
  // re-derives the cc_case from the request, mirroring the cron entry point).
  const { data: cc } = await supabase
    .from("cc_cases")
    .select("scan_request_id")
    .eq("id", id)
    .maybeSingle();
  const requestId = (cc as { scan_request_id: string | null } | null)?.scan_request_id ?? null;
  if (!requestId) {
    revalidateConsole();
    return;
  }

  const { data: req } = await supabase
    .from("scan_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) {
    revalidateConsole();
    return;
  }

  // Mark the request paid — idempotent: flips approved_awaiting_payment →
  // paid_scanning only (a duplicate or any other status no-ops). Keeps the
  // scan_requests payment lifecycle in sync with this manual activation even
  // though runScanForRequest itself keys off the cc_cases state.
  await markRequestPaid(requestId);

  try {
    const who = await adminEmail();
    const outcome = await runScanForRequest(supabase, req as RunScanRow, {});
    await recordCaseAudit({
      caseId: id,
      eventType: "MANUAL_ACTIVATION",
      detail: `${who} — ${outcome.status}${outcome.reason ? `: ${outcome.reason}` : ""}`,
    });
  } catch (err) {
    // Gate denials / engine errors already surface in the scans row + logs; keep
    // the action non-throwing so the console refreshes to the real state.
    console.error(
      "manualActivateScanAction error:",
      err instanceof Error ? err.message : String(err),
    );
  }
  revalidateConsole();
}

/**
 * scanning → complete; store the report artifact (fail-soft → signed URL),
 * stamp scan_requests.report_url, queue + deliver the report email. Routes
 * through the SAME deliverCaseReport helper the cron/manual finalize uses, so
 * the pure-console "Generate & email report" button now also produces a
 * downloadable report_url instead of leaving it null.
 */
export async function deliverCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");

  // REFUSE to finalize a case whose scan has not finished. Without this the
  // action completed the case and emailed the customer a report reading
  // "Verdict: PENDING (0 of 5 checks passed)" while the scan was still running
  // and had persisted ZERO results — which is exactly what a paying customer
  // received on 2026-08-01. Delivering an empty report is worse than delivering
  // nothing: it closes the case, consumes the customer's purchase, and reports
  // a security posture that was never measured.
  const pre = await loadCase(id);
  if (!pre) {
    revalidateConsole();
    return;
  }
  const scanDone = pre.scan?.status === "complete";
  const hasResults = (pre.checks?.length ?? 0) > 0;
  if (!scanDone || !hasResults) {
    await recordCaseAudit({
      caseId: id,
      eventType: "REPORT_BLOCKED_SCAN_INCOMPLETE",
      detail:
        `refused to deliver: scan status=${pre.scan?.status ?? "none"}, ` +
        `${pre.checks?.length ?? 0} result row(s). Re-run the scan, then deliver.`,
    });
    revalidateConsole();
    return;
  }

  const updated = await completeCase(id);
  if (!updated) return;
  const view = await loadCase(id);
  if (!view) {
    revalidateConsole();
    return;
  }
  const supabase = createServiceClient();
  const reportUrl = await deliverCaseReport(supabase, view);
  if (view.req?.id) {
    await supabase
      .from("scan_requests")
      .update({ status: "complete", report_url: reportUrl })
      .eq("id", view.req.id);
  }
  revalidateConsole();
}

/** Set disclosure_state = requested; audit; queue the disclosure email. */
export async function requestDisclosureAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("cc_cases")
    .update({ disclosure_state: "requested" })
    .eq("id", id);
  if (error) {
    console.error("requestDisclosureAction error:", error.message);
    return;
  }
  await recordCaseAudit({ caseId: id, eventType: "DISCLOSURE_REQUESTED" });
  const view = await loadCase(id);
  if (view) {
    const composed = composeEmail("disclosure", view);
    await queueEmail(id, composed);
    await deliverComposedEmail(composed);
  }
  revalidateConsole();
}
