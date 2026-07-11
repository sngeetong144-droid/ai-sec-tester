import { runScanEngine } from "@/lib/scan-engine";
import type { ChatbotEndpointConfig } from "@/lib/real-scan-engine";
import type { createServiceClient } from "@/lib/supabase/service";

// Service-role client: RLS is bypassed here (0007 drops the anon policies), so
// AUTHORIZATION IS THE CALLER'S JOB — both callers gate before invoking
// (executeScan: admin/cron + paid case; runAdminSelfScan: admin session).
type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Runs the scan engine against `target` and persists results into an existing
 * `scans` row (`scanId`, already in "running"): inserts scan_results and advances
 * the row running -> complete, or -> failed on error (then re-throws).
 *
 * The SINGLE persistence implementation shared by both execution paths — the
 * customer paid-case choke point (executeScan) and the admin self-scan
 * (runAdminSelfScan). Callers own authorization + row creation; this owns the
 * engine run and its persistence, so the mapping/finalize logic lives in one place.
 */
export async function runEngineAndPersist(
  supabase: SupabaseServiceClient,
  scanId: string,
  target: string,
  chatbot: ChatbotEndpointConfig | null,
): Promise<void> {
  try {
    const engine = await runScanEngine(target, { chatbot });

    const rows = engine.results.map((r) => ({
      scan_id: scanId,
      test_key: r.key,
      test_name: r.name,
      category: r.category,
      severity: r.severity,
      // ponytail: DB CHECK allows pending|running|pass|fail only; persist the
      // engine's honest "not_run" as "pending" (= not run). Evidence carries the
      // full explanation. Upgrade path: add a migration allowing 'not_run'.
      status: r.status === "not_run" ? "pending" : r.status,
      detail: r.detail,
      evidence: r.evidence,
      remediation: r.status === "fail" ? r.remediation : null,
      sort_order: r.sort_order,
    }));
    const { error: resErr } = await supabase.from("scan_results").insert(rows);
    if (resErr) throw new Error(resErr.message);

    const { error: updErr } = await supabase
      .from("scans")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        score: engine.score,
        tests_total: engine.tests_total,
        tests_passed: engine.tests_passed,
        verdict: engine.verdict,
        summary: engine.summary,
      })
      .eq("id", scanId);
    if (updErr) throw new Error(updErr.message);
  } catch (err) {
    await supabase
      .from("scans")
      .update({ status: "failed", summary: String(err) })
      .eq("id", scanId);
    throw err;
  }
}
