import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readSessionId } from "@/lib/session";
import type { Scan, ScanResultRow, ScanWithResults } from "@/lib/types";

/**
 * Recent scans for the current visitor.
 * Authenticated users: see all scans linked to their user_id.
 * Anonymous: filter by session cookie.
 */
export async function getScans(limit = 25): Promise<Scan[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (user) {
    query = query.eq("user_id", user.id);
  } else {
    const sid = await readSessionId();
    if (sid) query = query.eq("session_id", sid);
  }

  const { data, error } = await query;
  if (error) {
    console.error("getScans error:", error.message);
    return [];
  }
  return (data as Scan[]) ?? [];
}

export async function getScan(id: string): Promise<ScanWithResults | null> {
  const supabase = await createClient();

  const { data: scan, error } = await supabase
    .from("scans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !scan) {
    if (error) console.error("getScan error:", error.message);
    return null;
  }

  const { data: results } = await supabase
    .from("scan_results")
    .select("*")
    .eq("scan_id", id)
    .order("sort_order", { ascending: true });

  return {
    ...(scan as Scan),
    results: (results as ScanResultRow[]) ?? [],
  };
}

export interface VerifiedOwnership {
  id: string;
  target_domain: string;
  email: string | null;
  proof_hash: string | null;
}

export interface RequestIdentity {
  userId: string | null;
  sessionId: string | null;
}

/** The current caller's identity: authenticated user id, else anon session id. */
export async function getRequestIdentity(): Promise<RequestIdentity> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { userId: user.id, sessionId: null };
  return { userId: null, sessionId: await readSessionId() };
}

/**
 * A verified ownership token (verified_at set) that belongs to `identity`, or
 * null. Scoping by identity stops a leaked/guessed proof_id from being reused
 * by someone who never proved ownership themselves. No identity → deny.
 */
export async function getVerifiedOwnership(
  proofId: string,
  identity: RequestIdentity,
): Promise<VerifiedOwnership | null> {
  if (!identity.userId && !identity.sessionId) return null;

  // ownership_tokens is service-role-only for reads (0003). Authorization is
  // enforced by the user_id/session_id filter below, not by RLS, so scoping is
  // preserved — a leaked proof_id still can't be read across identities.
  const supabase = createServiceClient();
  let query = supabase
    .from("ownership_tokens")
    .select("id, target_domain, email, proof_hash")
    .eq("id", proofId)
    .not("verified_at", "is", null);

  query = identity.userId
    ? query.eq("user_id", identity.userId)
    : query.eq("session_id", identity.sessionId as string);

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("getVerifiedOwnership error:", error.message);
    return null;
  }
  return (data as VerifiedOwnership) ?? null;
}

/** Server-only: audit rows are not anon/authenticated readable (RLS), so this
 * reads via the service-role client. Never call from client-exposed code. */
export async function getScanWithAudit(id: string) {
  const scan = await getScan(id);
  if (!scan) return null;

  const supabase = createServiceClient();
  const { data: audit } = await supabase
    .from("scan_audit_log")
    .select("*")
    .eq("scan_id", id)
    .order("created_at", { ascending: false });

  return { ...scan, audit: audit ?? [] };
}
