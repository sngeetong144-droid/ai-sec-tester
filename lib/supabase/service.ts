import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only; never import from a
 * "use client" file or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 * Used for writes/reads that must not go through the anon/authenticated
 * RLS policies (e.g. stamping ownership_tokens.verified_at, reading
 * scan_audit_log).
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
