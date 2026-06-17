import { createClient } from "@/lib/supabase/server";
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
