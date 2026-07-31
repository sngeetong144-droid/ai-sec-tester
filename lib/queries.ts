import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { readSessionId } from "@/lib/session";
import { verifyReportToken } from "@/lib/hmac";
import { isAdminSession } from "@/lib/command-center/admin";
import type { Scan, ScanResultRow, ScanWithResults } from "@/lib/types";

/**
 * Resolve the enterprise request an HMAC report token authorizes, or null.
 * The token IS the authorization: an enterprise customer viewing their report
 * is not logged in (no session cookie), so the report page and the PDF route
 * both trust this signed token instead of scanOwnedByCaller. Verifies the HMAC
 * before returning so a forged token maps to nothing. Shared by the report page
 * and /api/scans/[id]/report.
 */
export async function enterpriseRequestForReportToken(
  token: string,
): Promise<{ id: string; scan_id: string | null } | null> {
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc(
    "get_enterprise_request_by_report_token",
    { p_token: token },
  );
  const req = (Array.isArray(rows) ? rows[0] : rows) as
    | { id: string; scan_id: string | null }
    | null
    | undefined;
  if (!req) return null;
  if (!verifyReportToken(req.id, token)) return null;
  return req;
}

/**
 * Recent scans for the current visitor.
 * Authenticated users: see all scans linked to their user_id.
 * Anonymous: filter by session cookie. No identity at all -> empty (fail
 * closed; previously an unfiltered query, which the anon RLS masked).
 *
 * Reads via the service-role client (0007 drops the anon policies), so the
 * user_id/session_id eq-filter below IS the authorization — same pattern as
 * getVerifiedOwnership/scanOwnedByCaller in this file.
 */
export async function getScans(limit = 25): Promise<Scan[]> {
  const identity = await getRequestIdentity();
  if (!identity.userId && !identity.sessionId) return [];

  let query = createServiceClient()
    .from("scans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  query = identity.userId
    ? query.eq("user_id", identity.userId)
    : query.eq("session_id", identity.sessionId as string);

  const { data, error } = await query;
  if (error) {
    console.error("getScans error:", error.message);
    return [];
  }
  return (data as Scan[]) ?? [];
}

/**
 * Raw scan + results fetch by id — NO ownership check here, and it reads via
 * the service-role client (RLS bypassed; 0007 drops the anon policies).
 * EVERY caller must gate first: scanOwnedByCaller (report route + scan page),
 * the HMAC report token (enterprise report page), or the verified-ownership
 * domain match (deep-scan route). Do not call from a new path without a gate.
 */
export async function getScan(id: string): Promise<ScanWithResults | null> {
  const supabase = createServiceClient();

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

/**
 * True when the current caller owns scan `id`, using the SAME ownership model as
 * getScans: an authenticated caller owns rows with a matching user_id; an
 * anonymous caller owns rows with a matching session cookie. Reads via the
 * service-role client so it works regardless of the scans-table RLS policy.
 *
 * Gate for the public report route + scan detail page (both are keyed only on the
 * scan UUID otherwise = IDOR). Admin/enterprise/paid delivery use their own routes
 * (console report_url, /enterprise/report/[token]) and never this path.
 * NOTE: the table-level anon-REST exposure (permissive RLS on scans/scan_results)
 * is the separate lockdown flagged in the deliverable — this closes the app routes.
 */
export async function scanOwnedByCaller(id: string): Promise<boolean> {
  // Admin bypass. Operator scans (console self-scans, and matrix/API runs that
  // have no signed-in user at all) belong to no visitor, so an ownership-only
  // gate made them permanently unopenable — including from the console's own
  // "Operator scans" list, which links straight at /scans/<id>. Admins are the
  // ADMIN_EMAILS allowlist, which is deny-by-default when unset.
  if (await isAdminSession()) return true;

  const identity = await getRequestIdentity();
  if (!identity.userId && !identity.sessionId) return false;

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("scans")
    .select("session_id, user_id")
    .eq("id", id)
    .maybeSingle();
  const row = data as { session_id: string | null; user_id: string | null } | null;
  if (!row) return false;

  if (identity.userId && row.user_id === identity.userId) return true;
  if (identity.sessionId && row.session_id === identity.sessionId) return true;
  return false;
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
