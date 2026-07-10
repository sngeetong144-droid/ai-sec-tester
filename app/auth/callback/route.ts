import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readSessionId } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // Admin login is the only auth flow, so default post-login to the console.
  // Supabase does not reliably preserve the custom ?next param on its redirect,
  // hence the default rather than relying on it. Still same-origin validated.
  const rawNext = searchParams.get("next") ?? "/command-center";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/command-center";

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Claim any anonymous scans from this session
      const sid = await readSessionId();
      if (sid) {
        await supabase
          .from("scans")
          .update({ user_id: user.id })
          .eq("session_id", sid)
          .is("user_id", null);
      }
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
