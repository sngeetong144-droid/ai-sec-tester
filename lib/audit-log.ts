import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

/**
 * Append an immutable command-center CASE audit row (cc_audit_log). Append-only:
 * the table has no update/delete policy and only the service-role client writes
 * it. Throws on failure so a mutation cannot silently proceed without its audit
 * trail. Server-only — never import from a "use client" file.
 */
export async function recordCaseAudit(input: {
  caseId: string;
  eventType: string;
  detail?: string | null;
  ref?: string | null;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("cc_audit_log").insert({
    case_id: input.caseId,
    event_type: input.eventType,
    detail: input.detail ?? null,
    ref: input.ref ?? null,
  });
  if (error) {
    console.error("recordCaseAudit error:", error.message);
    throw new Error("Failed to record case audit.");
  }
}
