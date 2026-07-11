"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureSessionId } from "@/lib/session";
import { runEngineAndPersist } from "@/lib/scan-persistence";
import type { ChatbotEndpointConfig } from "@/lib/real-scan-engine";
import { getCase } from "@/lib/command-center/queries";
import {
  isAdminSession,
  decideScanAuthorization,
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
  /**
   * Trusted server-to-server invocation secret (the cron dispatch job). This is a
   * server action — a client could call it with a forged flag, so we do NOT accept a
   * boolean "trusted": authorization is proven by presenting CRON_SECRET, which only
   * server code (after verifying the inbound Bearer) knows. It substitutes for the
   * admin-session check ONLY; the case must still be scanning + paid. Empty/unset
   * never grants (falsy short-circuit), so deny-by-default is preserved.
   */
  cronSecret?: string;
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
    const { error: reuseErr } = await supabase
      .from("scans")
      .update(scanRow)
      .eq("id", scanId);
    if (reuseErr) throw new Error(reuseErr.message);
  } else {
    const { data: created, error: insErr } = await supabase
      .from("scans")
      .insert(scanRow)
      .select("id")
      .single();
    if (insErr || !created) {
      throw new Error(insErr?.message ?? "Could not create scan.");
    }
    scanId = created.id as string;
  }

  await runEngineAndPersist(supabase, scanId, input.target, input.chatbot ?? null);

  return scanId;
}

export async function deleteScan(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("scans").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
