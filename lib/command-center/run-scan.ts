import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { activateCase, completeCase } from "@/lib/command-center/queries";
import { loadCase, type CaseView } from "@/app/command-center/_data";
import { composeEmail, queueEmail } from "@/app/command-center/_email";
import { deliverComposedEmail } from "@/lib/email-templates";
import { executeScan } from "@/app/actions/scans";
import { resolvePaymentLink } from "@/lib/payment-links";

/**
 * The SINGLE activate→run→finalize flow, shared by the two callers that need it:
 *   - the cron dispatcher (app/api/cron/dispatch-scans) — presents CRON_SECRET.
 *   - the manual admin override (manualActivateScanAction) — presents nothing,
 *     relying on the admin session to satisfy executeScan's gate.
 *
 * Root cause of the "webhook never fired → case stuck in approved" bug is NOT in
 * either caller: it's that this flow only ran from the cron path. Extracting it
 * lets an admin trigger the exact same guarded sequence by hand. One function,
 * both callers — a guard added here protects both.
 *
 * Guards (identical to the original cron dispatchOne):
 *   - no cc_case linked → skip
 *   - cc_case already complete → reconcile the scan_request, don't re-run
 *   - linked scan running → in_flight (no double-run; no distributed lock, relies
 *     on cron spacing + this status check)
 *   - linked scan failed → skip (manual review, no auto-retry)
 *   - cc_case approved → mint pending scan + activateCase, then run
 *   - cc_case scanning → run (reuses the linked pending row)
 */

type Supa = ReturnType<typeof createServiceClient>;

// Bounded auto-retry for a paid scan whose engine run failed. A transient failure
// (target blip, LLM-judge timeout) previously stuck the case in 'failed' forever
// with no retry; a permanent failure must still stop and fall to manual review.
const MAX_SCAN_ATTEMPTS = 3;

const REPORT_BUCKET = process.env.SCAN_REPORT_BUCKET ?? "reports";
const REPORT_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d — matches the free-rescan window.

/**
 * Upload the report body to Supabase Storage and return a signed URL.
 * Additive + fail-soft: any error (bucket missing, storage disabled, absent
 * env) logs a warning and returns null so the finalize path is unchanged.
 * ponytail: the artifact IS the composed report email body (plain text).
 * Upgrade to a rendered PDF/HTML here once a report generator exists.
 */
export async function storeReportArtifact(
  supabase: Supa,
  requestId: string,
  body: string,
): Promise<string | null> {
  try {
    const path = `${requestId}.txt`;
    const { error: upErr } = await supabase.storage
      .from(REPORT_BUCKET)
      .upload(path, body, { contentType: "text/plain; charset=utf-8", upsert: true });
    if (upErr) {
      console.warn(`report artifact upload skipped: ${upErr.message}`);
      return null;
    }
    const { data, error: signErr } = await supabase.storage
      .from(REPORT_BUCKET)
      .createSignedUrl(path, REPORT_URL_TTL_SECONDS);
    if (signErr || !data?.signedUrl) {
      console.warn(`report signed-url skipped: ${signErr?.message ?? "no url"}`);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.warn(
      `report artifact delivery failed: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

/** Minimal shape runScanForRequest needs off a scan_requests row. */
export type RunScanRow = {
  id: string;
  target_url: string;
  company: string | null;
  email: string | null;
  /** Purchased plan string ("Advanced — $197") from scan_requests; resolves to the check-set tier. */
  plan?: string | null;
};

export interface DispatchOutcome {
  status: "dispatched" | "reconciled" | "in_flight" | "skipped";
  reason?: string;
}

export async function runScanForRequest(
  supabase: Supa,
  req: RunScanRow,
  opts: { cronSecret?: string },
): Promise<DispatchOutcome> {
  // Bridge to the cc_case that carries the guarded engine gate.
  const { data: cc } = await supabase
    .from("cc_cases")
    .select("*")
    .eq("scan_request_id", req.id)
    .maybeSingle();
  if (!cc) return { status: "skipped", reason: "no cc_case (request not ingested to console)" };

  const ccCase = cc as { id: string; status: string; scan_id: string | null };

  if (ccCase.status === "complete") {
    await supabase.from("scan_requests").update({ status: "complete" }).eq("id", req.id);
    return { status: "reconciled" };
  }

  // Inspect the linked scan to avoid double-running one already in progress/done.
  let scanStatus: string | null = null;
  if (ccCase.scan_id) {
    const { data: sc } = await supabase
      .from("scans")
      .select("status")
      .eq("id", ccCase.scan_id)
      .maybeSingle();
    scanStatus = (sc as { status: string } | null)?.status ?? null;
  }
  // ponytail: no distributed lock — relies on 5-min cron spacing + this status check.
  // Upgrade path: a SELECT ... FOR UPDATE claim if scans ever run concurrently.
  if (scanStatus === "running") return { status: "in_flight" };

  // How many times this request's scan has already been attempted (bounds retry).
  const { data: reqRow } = await supabase
    .from("scan_requests")
    .select("scan_attempts")
    .eq("id", req.id)
    .maybeSingle();
  const attempts = (reqRow as { scan_attempts: number } | null)?.scan_attempts ?? 0;

  if (scanStatus === "failed") {
    if (attempts >= MAX_SCAN_ATTEMPTS) {
      return {
        status: "skipped",
        reason: `linked scan failed after ${attempts} attempts — manual review`,
      };
    }
    // Bounded retry: clear the stale (partial/empty) results and reset the failed
    // row to 'pending' so the scanning path below reuses it (executeScan reuses the
    // case's linked scan_id, and that reuse assumes no prior results — hence the
    // delete). cc_case stays 'scanning' from the original activate, so the branch
    // below falls straight through to executeScan.
    await supabase.from("scan_results").delete().eq("scan_id", ccCase.scan_id as string);
    await supabase
      .from("scans")
      .update({ status: "pending", summary: null })
      .eq("id", ccCase.scan_id as string);
  }

  if (ccCase.status === "approved") {
    // Mint the pending scan row and activate (approved → scanning, paid=true).
    const { data: scan, error } = await supabase
      .from("scans")
      .insert({
        target_url: req.target_url,
        target_label: req.company ?? null,
        email: req.email ?? null,
        authorized: true,
        status: "pending",
        tests_total: 5,
      })
      .select("id")
      .maybeSingle();
    if (error || !scan) {
      return { status: "skipped", reason: `scan insert failed: ${error?.message ?? "no row"}` };
    }
    const activated = await activateCase(ccCase.id, (scan as { id: string }).id);
    if (!activated) return { status: "skipped", reason: "activateCase denied" };
  } else if (ccCase.status !== "scanning") {
    return { status: "skipped", reason: `cc_case not runnable (status ${ccCase.status})` };
  }

  // Record the attempt BEFORE running so a mid-run crash still counts against the
  // cap (a run that throws in executeScan never returns here to increment).
  await supabase
    .from("scan_requests")
    .update({ scan_attempts: attempts + 1 })
    .eq("id", req.id);

  // THE single authorized engine path. cronSecret (when present) substitutes for
  // the admin session; when absent, executeScan falls through to isAdminSession().
  // Either way the gate still requires the case be scanning + paid (both true
  // after activate). Passing undefined is deny-by-default-safe (falsy short-circuit).
  await executeScan({
    caseId: ccCase.id,
    target: req.target_url,
    label: req.company ?? null,
    email: req.email ?? null,
    sessionId: null,
    tier: resolvePaymentLink(req.plan)?.tier ?? "basic",
    cronSecret: opts.cronSecret,
  });

  // Finalize: cc_case scanning → complete, queue+deliver report email, close request.
  await completeCase(ccCase.id);
  const view = await loadCase(ccCase.id);
  const reportUrl = view ? await deliverCaseReport(supabase, view) : null;
  await supabase
    .from("scan_requests")
    .update({ status: "complete", report_url: reportUrl })
    .eq("id", req.id);
  return { status: "dispatched" };
}

/**
 * COMPLETE → REPORT: the single report-delivery step, shared by the cron/manual
 * finalize (runScanForRequest) and the pure-console "Generate & email report"
 * button (deliverCaseAction). Composes the report email, stores the report
 * artifact to Storage (fail-soft → signed URL or null when the bucket is
 * absent), queues it to cc_email_log (audit), and attempts live delivery
 * (behind the CC_EMAIL_SEND_ENABLED + RESEND_API_KEY gate). Returns the signed
 * report URL, or null when no bucket/artifact — the email still sends with the
 * inline verdict summary (graceful degrade). Does NOT mutate scan_requests;
 * the caller decides how to stamp report_url/status.
 */
export async function deliverCaseReport(
  supabase: Supa,
  view: CaseView,
): Promise<string | null> {
  const report = composeEmail("report", view);
  const requestId = view.req?.id ?? null;
  const reportUrl = requestId
    ? await storeReportArtifact(supabase, requestId, report.body)
    : null;
  await queueEmail(view.case.id, report);
  await deliverComposedEmail(report, reportUrl ? { reportUrl } : undefined);
  return reportUrl;
}
