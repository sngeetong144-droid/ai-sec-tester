/**
 * Command-center data layer — service-role query helpers over cc_cases.
 *
 * SERVER-ONLY: cc_cases / cc_audit_log / cc_email_log are service-role only
 * (RLS with no anon policies, migration 0005). Never import from a "use client"
 * file. Every mutation is guarded by canTransition (lib/command-center/state.ts)
 * and records a cc_audit_log row (append-only) before returning. No scan
 * execution happens here — `activate` only flips the payment/scanning state and
 * links a scan row; the engine is invoked elsewhere.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { recordCaseAudit } from "@/lib/audit-log";
import { canTransition, type CaseStatus } from "@/lib/command-center/state";

export interface CaseRecord {
  id: string;
  created_at: string;
  updated_at: string;
  scan_request_id: string | null;
  tier: string | null;
  status: CaseStatus;
  paid: boolean;
  scan_id: string | null;
  report_delivered_at: string | null;
  rescan_used: boolean;
  subscribed: boolean;
  platform: string | null;
  disclosure_state: "informed" | "requested" | "pending" | null;
  rejection_reason: string | null;
}

export async function listCases(limit = 100): Promise<CaseRecord[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cc_cases")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listCases error:", error.message);
    return [];
  }
  return (data as CaseRecord[]) ?? [];
}

export async function getCase(id: string): Promise<CaseRecord | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cc_cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getCase error:", error.message);
    return null;
  }
  return (data as CaseRecord) ?? null;
}

/**
 * Guarded status transition: load the case, verify from->to is allowed, apply
 * `patch` + the new status in one update, then append a cc_audit_log row.
 * Returns the updated case, or null if the case is missing or the transition is
 * illegal (fails closed — no write happens). The update re-asserts the expected
 * `status` in its WHERE clause so a concurrent transition cannot double-apply.
 */
async function transition(
  id: string,
  to: CaseStatus,
  patch: Partial<CaseRecord>,
  audit: { eventType: string; detail?: string | null; ref?: string | null },
): Promise<CaseRecord | null> {
  const current = await getCase(id);
  if (!current) return null;
  if (!canTransition(current.status, to)) {
    console.error(`transition denied: ${current.status} -> ${to} (case ${id})`);
    return null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("cc_cases")
    .update({ ...patch, status: to })
    .eq("id", id)
    .eq("status", current.status)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    console.error("transition update error:", error?.message ?? "row changed concurrently");
    return null;
  }

  await recordCaseAudit({ caseId: id, ...audit });
  return data as CaseRecord;
}

/** approval -> approved. Opens the payment gate (paid stays false until activate). */
export function approveCase(id: string): Promise<CaseRecord | null> {
  return transition(id, "approved", { paid: false }, { eventType: "REQUEST_APPROVED" });
}

/** intake|approval -> rejected. Reason is required (preset chip or free text). */
export function rejectCase(id: string, reason: string): Promise<CaseRecord | null> {
  const trimmed = reason?.trim();
  if (!trimmed) {
    console.error("rejectCase: reason is required");
    return Promise.resolve(null);
  }
  return transition(
    id,
    "rejected",
    { rejection_reason: trimmed },
    { eventType: "REQUEST_REJECTED", detail: trimmed },
  );
}

/**
 * approved -> scanning. Confirms payment (simulates the Stripe webhook) and
 * links the activated scan row. Does NOT run the scan engine.
 */
export function activateCase(id: string, scanId: string): Promise<CaseRecord | null> {
  return transition(
    id,
    "scanning",
    { paid: true, scan_id: scanId },
    { eventType: "GATE_ACTIVATED", ref: scanId },
  );
}

/** scanning -> complete. Stamps report delivery. */
export function completeCase(id: string): Promise<CaseRecord | null> {
  return transition(
    id,
    "complete",
    { report_delivered_at: new Date().toISOString() },
    { eventType: "REPORT_DELIVERED" },
  );
}
