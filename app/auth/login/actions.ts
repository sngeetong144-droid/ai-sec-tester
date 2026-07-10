"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Default identity scopes only (openid, email, profile). No Gmail/Drive/etc.
      redirectTo: `${SITE_URL}/auth/callback?next=/command-center`,
      queryParams: { prompt: "select_account" },
    },
  });

  // On failure there is no session to leak; bounce back to the gate.
  if (error || !data?.url) redirect("/auth/login?denied=1");
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
