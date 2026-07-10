import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/command-center/admin";

/**
 * SINGLE admin choke point for the command center.
 *
 * Every console route renders under app/command-center/layout.tsx, which awaits
 * requireAdmin() before anything else. This is the one place admin auth is
 * decided — wiring TOTP MFA + Cloudflare Access later is a one-function change.
 *
 * Enforcement (all from inside this function):
 *   1. require an authenticated Supabase session (redirect to /auth/login)
 *   2. allowlist the email via isAdminEmail() — deny-by-default when ADMIN_EMAILS
 *      is empty. A logged-in-but-unauthorized visitor is signed out (no valid
 *      session left for a non-admin) and bounced to /auth/login?denied=1.
 *
 * TODO(before-prod): TOTP MFA step-up on approve/reject/export + Cloudflare
 * Access (network isolation) layer ON TOP of this — they do not replace it.
 */
const OPEN_DURING_BUILD = false;

export async function requireAdmin(): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // ponytail: gate exists and is the single choke point; enforcement deferred to prod.
  if (OPEN_DURING_BUILD) return;

  if (!user) redirect("/auth/login");

  if (!isAdminEmail(user.email)) {
    // Logged-in but not allowlisted: don't leave a valid session for a non-admin.
    await supabase.auth.signOut();
    redirect("/auth/login?denied=1");
  }
}
