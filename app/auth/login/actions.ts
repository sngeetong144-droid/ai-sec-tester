"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Derive the OAuth return origin from the actual request, not a build-time env
// var. NEXT_PUBLIC_* bakes in at build; when it's missing/stale the redirect
// silently fell back to localhost, so Supabase rejected the redirectTo and sent
// the code to the Site URL (the landing) instead of /auth/callback. The request
// host is always correct in prod. NEXT_PUBLIC_SITE_URL still wins if explicitly set.
async function siteOrigin(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // Default identity scopes only (openid, email, profile). No Gmail/Drive/etc.
      // No ?next query — the callback defaults to /command-center, so the allowed
      // redirect URL stays a bare path that Supabase's allowlist matches exactly.
      redirectTo: `${origin}/auth/callback`,
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
