import "server-only";
import type { createServiceClient } from "@/lib/supabase/service";
import { activateCase, completeCase } from "@/lib/command-center/queries";
import { loadCase } from "@/app/command-center/_data";
import { composeEmail, queueEmail } from "@/app/command-center/_email";
import { executeScan } from "@/app/actions/scans";

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

const REPORT_BUCKET = process.env.SCAN_REPORT_BUCKET ?? "reports";
const REPORT_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d — matches the free-rescan window.

/**
 * Upload the report body to Supabase Storage and return a signed URL.
 * Additive + fail-soft: any error (bucket missing, storage disabled, absent
 * env) logs a warning and returns null so the finalize path is unchanged.
 * ponytail: the artifact IS the composed report email body (plain text).
 * Upgrade to a rendered PDF/HTML here once a report generator exists.
 */
async function storeReportArtifact(
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
  if (scanStatus === "failed") {
    return { status: "skipped", reason: "linked scan failed — manual review, no auto-retry" };
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
    cronSecret: opts.cronSecret,
  });

  // Finalize: cc_case scanning → complete, queue report email, close the request.
  await completeCase(ccCase.id);
  const view = await loadCase(ccCase.id);
  let reportUrl: string | null = null;
  if (view) {
    const report = composeEmail("report", view);
    await queueEmail(ccCase.id, report);
    // Store the report artifact + sign it; email SEND stays gated/queued above.
    reportUrl = await storeReportArtifact(supabase, req.id, report.body);
  }
  await supabase
    .from("scan_requests")
    .update({ status: "complete", report_url: reportUrl })
    .eq("id", req.id);
  return { status: "dispatched" };
}
