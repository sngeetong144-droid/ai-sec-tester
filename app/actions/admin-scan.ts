"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureSessionId } from "@/lib/session";
import { assertPublicTarget } from "@/lib/scan-engine";
import { runEngineAndPersist } from "@/lib/scan-persistence";
import {
  isAdminSession,
  decideAdminSelfScan,
  ScanAuthorizationError,
} from "@/lib/command-center/admin";

/**
 * Admin self-scan: an operator scans their OWN public target (URL + optional
 * label), independent of the customer approve -> pay -> scan flow. It creates an
 * admin-owned scans row (user_id = admin, no case link) and reuses the SAME
 * engine + persistence as executeScan, so results land in the standard
 * /scans/[id] report view.
 *
 * Deny by default and fail closed:
 *   1. requires an admin session (decideAdminSelfScan) — else 403,
 *   2. assertPublicTarget() rejects private/localhost/link-local BEFORE any
 *      scan work runs (SSRF guard). Creator forbids local targets — no bypass.
 * This does NOT go through decideScanAuthorization, so the customer paid-case
 * gate is untouched and still requires status "scanning" + paid.
 *
 * ponytail: the repo has no zod; input shape is validated inline (a string
 * target — assertPublicTarget does the real URL parse/scheme/SSRF checks — and
 * an optional capped label). Add zod only if a schema layer lands repo-wide.
 */
export async function runAdminSelfScan(input: {
  target: string;
  label?: string;
}): Promise<string> {
  const target = String(input?.target ?? "").trim();
  const label = input?.label ? String(input.label).trim().slice(0, 200) : null;

  const decision = decideAdminSelfScan({ isAdmin: await isAdminSession() });
  if (!decision.authorized) {
    throw new ScanAuthorizationError(decision.reason);
  }

  // SSRF guard BEFORE touching the DB or the engine — a rejection produces no row.
  await assertPublicTarget(target);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error: insErr } = await supabase
    .from("scans")
    .insert({
      target_url: target,
      target_label: label,
      email: null,
      session_id: await ensureSessionId(),
      user_id: user?.id ?? null,
      authorized: true,
      status: "running" as const,
    })
    .select("id")
    .single();
  if (insErr || !created) {
    throw new Error(insErr?.message ?? "Could not create scan.");
  }
  const scanId = created.id as string;

  await runEngineAndPersist(supabase, scanId, target, null);
  return scanId;
}
