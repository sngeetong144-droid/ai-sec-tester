import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureSessionId } from "@/lib/session";
import { extractDomain, generateChallenge } from "@/lib/ownership-verification";

export const dynamic = "force-dynamic";

/**
 * POST /api/ownership/challenge
 * Body: { domain | target_url: string, email?: string }
 * Returns: { proof_id, token, dns_txt_record, well_known_path }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const domain = extractDomain(String(body?.domain ?? body?.target_url ?? ""));
  const email = typeof body?.email === "string" ? body.email.slice(0, 320) : null;

  if (!domain) {
    return NextResponse.json(
      { error: "Enter a valid domain, for example example.com." },
      { status: 400 },
    );
  }

  const challenge = generateChallenge(domain);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Ties this proof to whoever requested it (HIGH #4): logged-in caller by
  // user_id, anonymous demo caller by session cookie.
  const sessionId = user ? null : await ensureSessionId();

  // ownership_tokens is service-role-only for reads (0003) — the anon key has
  // no SELECT policy, so insert().select() via the anon client would fail on
  // the RETURNING read. Write + read back the id via the service client.
  const service = createServiceClient();
  const { data, error } = await service
    .from("ownership_tokens")
    .insert({
      email,
      target_domain: domain,
      challenge_type: "dns_txt",
      token: challenge.token,
      user_id: user?.id ?? null,
      session_id: sessionId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Could not create the challenge. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    proof_id: data.id,
    token: challenge.token,
    dns_txt_record: challenge.dns_txt_record,
    well_known_path: challenge.well_known_path,
  });
}
