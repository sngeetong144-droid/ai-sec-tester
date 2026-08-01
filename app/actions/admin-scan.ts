"use server";

import { runScanVariant, type AdminScanMode } from "@/lib/admin-scan-core";
import type { ScanTier } from "@/lib/payment-links";
import { isAdminSession, decideAdminSelfScan, ScanAuthorizationError } from "@/lib/command-center/admin";

/**
 * Admin self-scan: an operator scans a public target THEY chose, independent of
 * the customer approve -> pay -> scan flow. It creates an admin-owned scans row
 * and runs the SAME engine (runScanEngine) so results land in /scans/[id].
 *
 * THIS FILE IS THE AUTHORIZATION LAYER, NOTHING ELSE. Deny by default: an admin
 * session is required. The scan body itself lives in lib/admin-scan-core
 * (runScanVariant) so the CRON_SECRET-gated matrix runner at
 * app/api/dev/scan-matrix can drive the identical code path without this session
 * check being duplicated, weakened, or forked. Nothing that authorizes lives in
 * that module; nothing that scans lives in this one.
 *
 * It does NOT go through decideScanAuthorization, so the customer paid-case gate
 * is untouched. Behaviour, modes, SSRF posture and persistence are documented in
 * lib/admin-scan-core.
 */

// NO type re-export here. A "use server" module may only export async
// functions; Turbopack compiled `export type { AdminScanMode }` into a value
// reference and every render of /command-center/scan died with
// "ReferenceError: AdminScanMode is not defined". Import the type from
// @/lib/admin-scan-core, which is where it is declared.

export interface AdminSelfScanInput {
  target: string;
  label?: string;
  /**
   * "endpoint" = target is a chatbot API; "website" = discover the chatbot
   * endpoint on the page; "passive" = transport/secret checks only. Legacy
   * `chatbot: true` maps to "endpoint".
   */
  mode?: AdminScanMode;
  /** @deprecated use mode:"endpoint". */
  chatbot?: boolean;
  /** Optional JSON body template with a {{prompt}} placeholder. Default: {"message":"{{prompt}}"} */
  bodyTemplate?: string;
  /** Optional bearer token for the endpoint. Secret — never persisted or logged. */
  authToken?: string;
  /** Test set to run: "basic" = core 5; advanced/enterprise = full OWASP-10 (15). Default "enterprise". */
  tier?: ScanTier;
}

export async function runAdminSelfScan(input: AdminSelfScanInput): Promise<string> {
  const decision = decideAdminSelfScan({ isAdmin: await isAdminSession() });
  if (!decision.authorized) {
    throw new ScanAuthorizationError(decision.reason);
  }

  const result = await runScanVariant({
    target: input?.target,
    label: input?.label,
    mode: input?.mode ?? (input?.chatbot ? "endpoint" : "passive"),
    bodyTemplate: input?.bodyTemplate,
    authToken: input?.authToken,
    tier: input?.tier ?? "enterprise",
  });

  return result.scanId;
}