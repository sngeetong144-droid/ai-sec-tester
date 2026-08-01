"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureSessionId } from "@/lib/session";
import { runEngineAndPersist } from "@/lib/scan-persistence";
import type { ChatbotEndpointConfig } from "@/lib/real-scan-engine";
import type { ScanTier } from "@/lib/payment-links";
import { getCase } from "@/lib/command-center/queries";
import {
  isAdminSession,
  decideScanAuthorization,
  decideAdminSelfScan,
  ScanAuthorizationError,
} from "@/lib/command-center/admin";

/**
 * Core scan routine and the SINGLE choke point for scan execution. Every path
 * that runs the engine funnels through here, so the authorization gate lives
 * here and nowhere else (root-cause: one guard in the shared function, not a
 * copy in each caller). Deny by default — a scan runs only for an admin session
 * AND a command-center case that is activated + paid. There is no self-serve
 * entry point: the public/authenticated app no longer offers scanning.
 *
 * Throws ScanAuthorizationError (status 403) when the gate denies; the scan row
 * is never created, so a denied request cannot produce a partial scan.
 */
export async function executeScan(input: {
  /** The activated + paid command-center case authorizing this scan. */
  caseId: string;
  target: string;
  label?: string | null;
  email?: string | null;
  sessionId?: string | null;
  /** Optional connected chatbot endpoint for real interactive probes (feature-flagged). */
  chatbot?: ChatbotEndpointConfig | null;
  /** Purchased tier — gates the check set (basic=5, advanced/enterprise=15). Defaults "basic". */
  tier?: ScanTier;
  /**
   * Trusted server-to-server invocation secret (the cron dispatch job). This is a
   * server action — a client could call it with a forged flag, so we do NOT accept a
   * boolean "trusted": authorization is proven by presenting CRON_SECRET, which only
   * server code (after verifying the inbound Bearer) knows. It substitutes for the
   * admin-session check ONLY; the case must still be scanning + paid. Empty/unset
   * never grants (falsy short-circuit), so deny-by-default is preserved.
   */
  cronSecret?: string;
  /** Absolute epoch-ms budget for the interactive suite — see ScanEngineOptions. */
  deadlineAtMs?: number;
}): Promise<string> {
  // ── Authorization gate ──────────────────────────────────────────────────────
  const cronOk =
    Boolean(input.cronSecret) && input.cronSecret === process.env.CRON_SECRET;
  const isAdmin = cronOk ? true : await isAdminSession();
  const caseRecord = await getCase(input.caseId);
  const decision = decideScanAuthorization({ isAdmin, caseRecord });
  if (!decision.authorized) {
    throw new ScanAuthorizationError(decision.reason);
  }

  // DB writes go through the service-role client (0007 removes the anon
  // policies). RLS is bypassed, which is safe ONLY because the gate above
  // already denied non-admin/non-cron callers. The anon server client is kept
  // solely to resolve the caller's auth user for user_id stamping.
  const db = createServiceClient();
  const supabase = await createClient();
  const sessionId =
    input.sessionId !== undefined ? input.sessionId : await ensureSessionId();

  const { data: { user } } = await supabase.auth.getUser();

  const scanRow = {
    target_url: input.target,
    target_label: input.label ?? null,
    email: input.email ?? null,
    session_id: sessionId,
    user_id: user?.id ?? null,
    authorized: true,
    status: "running" as const,
  };

  // Resolve the scan row. Case activation (activateCase) already created a
  // `pending` scans row and linked it (caseRecord.scan_id) — reuse it so it
  // advances pending -> running -> complete and stays the row the console reads.
  // This closes the activate->run chicken/egg: activate mints the id, run consumes
  // it. Only insert a fresh row when nothing is linked.
  // ponytail: reuse assumes the linked row has no prior results (true for a fresh
  // pending row). A re-run/rescan would need scan_results cleared first — add that
  // when the rescan path goes live.
  let scanId = caseRecord?.scan_id ?? null;
  if (scanId) {
    const { error: reuseErr } = await db
      .from("scans")
      .update(scanRow)
      .eq("id", scanId);
    if (reuseErr) throw new Error(reuseErr.message);
  } else {
    const { data: created, error: insErr } = await db
      .from("scans")
      .insert(scanRow)
      .select("id")
      .single();
    if (insErr || !created) {
      throw new Error(insErr?.message ?? "Could not create scan.");
    }
    scanId = created.id as string;
  }

  await runEngineAndPersist(
    db,
    scanId,
    input.target,
    input.chatbot ?? null,
    input.tier ?? "basic",
    input.deadlineAtMs,
  );

  return scanId;
}

/**
 * Delete a scan row. This is a `use server` action reachable by anyone who can
 * POST the form, so it enforces the SAME deny-by-default admin gate as the scan
 * engine (mirrors executeScan): only an admin session may delete. Without this,
 * any visitor could delete any scan by id. Fail closed — a non-admin throws 403
 * before the delete runs. Deletion is not tied to a case, so it uses the admin
 * self-scan sibling gate (admin session, no paid case required).
 */
export async function deleteScan(formData: FormData): Promise<void> {
  const decision = decideAdminSelfScan({ isAdmin: await isAdminSession() });
  if (!decision.authorized) {
    throw new ScanAuthorizationError(decision.reason);
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  // Service-role delete (0007 drops anon policies); safe only behind the
  // admin gate above — RLS no longer backstops this.
  const db = createServiceClient();
  await db.from("scans").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
