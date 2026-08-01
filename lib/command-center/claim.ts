/**
 * The atomic dispatch claim on scan_requests. Free of the "server-only" import
 * run-scan.ts carries, so this — the concurrency guarantee for the money path —
 * stays reachable from bun tests. Why a TTL, and the full rationale:
 * supabase/migrations/0009_scan_request_claim.sql
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Supa = { from(table: string): any }; // real client is structurally compatible

/** Equal to STALE_RUN_MS in run-scan.ts so claim and staleness expire together. */
export const CLAIM_TTL_MS = 6 * 60 * 1000;

export function availableClaimFilter(now: number = Date.now()): string {
  return `claimed_at.is.null,claimed_at.lt.${new Date(now - CLAIM_TTL_MS).toISOString()}`;
}

/**
 * Claim ONE request. True only for the caller that won the row: Postgres
 * serialises the concurrent UPDATEs and the loser's WHERE stops matching.
 * Fail-CLOSED — lost race, wrong status and query error all return false.
 */
export async function claimScanRequest(
  supabase: Supa,
  id: string,
  worker: string,
  now: number = Date.now(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from("scan_requests")
    .update({ claimed_at: new Date(now).toISOString(), claimed_by: worker })
    .eq("id", id)
    .eq("status", "paid_scanning")
    .or(availableClaimFilter(now))
    .select("id");
  // An error is NOT an empty result: `data`-only destructuring would make a
  // broken claim path read exactly like a lost race.
  if (error) {
    console.warn(`claim failed for scan_request ${id}: ${error.message}`);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Release a claim we will not act on, so retry needn't wait out the TTL. */
export async function releaseScanRequestClaim(supabase: Supa, id: string, worker: string) {
  const { error } = await supabase.from("scan_requests")
    .update({ claimed_at: null, claimed_by: null }).eq("id", id).eq("claimed_by", worker);
  if (error) console.warn(`claim release failed for ${id}: ${error.message}`);
}
