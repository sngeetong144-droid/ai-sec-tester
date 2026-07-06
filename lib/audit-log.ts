import { createClient } from "@/lib/supabase/server";

export interface ScanAuditInput {
  scanId: string | null;
  email: string | null;
  targetUrl: string;
  tier: string | null;
  ownershipProofId: string | null;
  resultHash: string | null;
}

/**
 * Append an immutable audit row. Throws on failure so callers on the
 * fail-closed path (deep-scan: no audit row → no Stripe session) can abort
 * instead of silently proceeding. Callers that only want best-effort logging
 * (e.g. the dev-only local scanner) should catch and continue explicitly.
 */
export async function recordScanAudit(input: ScanAuditInput): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("scan_audit_log").insert({
    scan_id: input.scanId,
    email: input.email,
    target_url: input.targetUrl,
    tier: input.tier,
    ownership_proof_id: input.ownershipProofId,
    result_hash: input.resultHash,
  });
  if (error) {
    console.error("recordScanAudit error:", error.message);
    throw new Error("Failed to record scan audit.");
  }
}
