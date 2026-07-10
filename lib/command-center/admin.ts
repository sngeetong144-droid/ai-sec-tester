/**
 * Command-center admin session + the single scan-execution authorization gate.
 *
 * SERVER-ONLY (imports the request-bound Supabase client). The scan engine is
 * private: it runs ONLY when an admin operator activates a paid case in the
 * console. `decideScanAuthorization` is the pure decision; `isAdminSession`
 * resolves the "admin" input from the live session. Both fail closed.
 */
import { createClient } from "@/lib/supabase/server";
import type { CaseRecord } from "@/lib/command-center/queries";

/**
 * Admin allowlist. Deny by default: an absent/empty ADMIN_EMAILS env means
 * NOBODY is admin. Comma-separated, case-insensitive.
 *
 * ponytail: env allowlist is the deny-by-default floor. The console's real admin
 * login + MFA (built last, before prod) layers ON TOP of this — it does not
 * replace it. Upgrade path: swap the env read for the MFA-backed session lookup.
 */
function adminEmails(): ReadonlySet<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/** True only for a logged-in Supabase user whose email is on the admin allowlist. */
export async function isAdminSession(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export interface ScanAuthorizationInput {
  isAdmin: boolean;
  caseRecord: Pick<CaseRecord, "status" | "paid"> | null;
}

export interface ScanAuthorizationDecision {
  authorized: boolean;
  reason: string;
}

/**
 * THE gate. A scan may execute only when BOTH hold:
 *   - the caller is an admin session, AND
 *   - the command-center case is activated + paid (status "scanning", the state
 *     activateCase() produces after payment is confirmed).
 *
 * Strict identity (`=== true`, exact status string) is deliberate: a truthy
 * string, number, or injection payload is not `true`, so untrusted input can
 * never flip an unmet condition open. Deny by default; no bypass parameter.
 */
export function decideScanAuthorization(
  input: ScanAuthorizationInput,
): ScanAuthorizationDecision {
  if (input?.isAdmin !== true) {
    return { authorized: false, reason: "caller is not an admin session" };
  }
  const c = input?.caseRecord;
  if (!c) {
    return { authorized: false, reason: "no command-center case" };
  }
  if (c.status !== "scanning") {
    return {
      authorized: false,
      reason: `case not activated (status ${String(c.status)})`,
    };
  }
  if (c.paid !== true) {
    return { authorized: false, reason: "case payment not confirmed" };
  }
  return { authorized: true, reason: "admin session; case activated and paid" };
}

/** Thrown by the scan choke point when the gate denies. HTTP callers map to 403. */
export class ScanAuthorizationError extends Error {
  readonly status = 403;
  constructor(reason: string) {
    super(`Scan not authorized: ${reason}`);
    this.name = "ScanAuthorizationError";
  }
}
