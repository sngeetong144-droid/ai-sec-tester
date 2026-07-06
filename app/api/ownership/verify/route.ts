import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyChallengeSync } from "@/lib/ownership-verification";

export const dynamic = "force-dynamic";

/**
 * POST /api/ownership/verify
 * Body: { proof_id: string }
 * Checks the DNS TXT record / .well-known file for the issued token and, on
 * success, stamps verified_at + proof_hash on the token row.
 * Returns: { verified: boolean, proof_hash: string | null }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const proofId = typeof body?.proof_id === "string" ? body.proof_id : "";

  if (!proofId) {
    return NextResponse.json({ error: "Missing proof_id." }, { status: 400 });
  }

  // ownership_tokens is service-role-only for reads (0003) — the anon key has
  // no SELECT policy. Read the challenge row via the service client.
  const service = createServiceClient();
  const { data: row, error } = await service
    .from("ownership_tokens")
    .select("id, target_domain, token, verified_at")
    .eq("id", proofId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Challenge not found." }, { status: 404 });
  }

  if (row.verified_at) {
    return NextResponse.json({ verified: true, proof_hash: null });
  }

  const result = await verifyChallengeSync(row.target_domain, row.token);
  if (result.verified) {
    // CRITICAL #1 fix: anon/authenticated have no update policy on
    // ownership_tokens (see 0003 migration) — only service-role can stamp
    // verified_at/proof_hash, and only after the real DNS/well-known check
    // above actually passed.
    await service
      .from("ownership_tokens")
      .update({ verified_at: new Date().toISOString(), proof_hash: result.proof_hash })
      .eq("id", proofId);
  }

  return NextResponse.json(result);
}
