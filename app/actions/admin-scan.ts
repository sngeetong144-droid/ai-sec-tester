"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureSessionId } from "@/lib/session";
import { assertPublicTarget } from "@/lib/scan-engine";
import { runEngineAndPersist } from "@/lib/scan-persistence";
import type { ChatbotEndpointConfig } from "@/lib/real-scan-engine";
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
  /**
   * When true, the target is treated as a chatbot message endpoint and the
   * interactive OWASP-LLM probes run against it (otherwise only the passive
   * transport/secret checks run — the reason a plain website scores 0/0).
   */
  chatbot?: boolean;
  /** Optional JSON body template with a {{prompt}} placeholder. Default: {"message":"{{prompt}}"} */
  bodyTemplate?: string;
  /** Optional bearer token for the endpoint. Secret — never persisted or logged. */
  authToken?: string;
}): Promise<string> {
  const target = String(input?.target ?? "").trim();
  const label = input?.label ? String(input.label).trim().slice(0, 200) : null;

  const chatbot: ChatbotEndpointConfig | null = input?.chatbot
    ? {
        url: target,
        bodyTemplate: input.bodyTemplate?.trim() || null,
        authToken: input.authToken?.trim() || null,
      }
    : null;

  const decision = decideAdminSelfScan({ isAdmin: await isAdminSession() });
  if (!decision.authorized) {
    throw new ScanAuthorizationError(decision.reason);
  }

  // SSRF guard BEFORE touching the DB or the engine — a rejection produces no row.
  await assertPublicTarget(target);

  // Service-role for the DB writes (0007 drops anon policies); safe only
  // behind the admin gate above. Anon client kept just for user_id stamping.
  const db = createServiceClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error: insErr } = await db
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

  await runEngineAndPersist(db, scanId, target, chatbot);
  return scanId;
}
