"use server";

import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(email: string): Promise<{ error?: string }> {
  if (!email || !email.includes("@")) return { error: "Enter a valid email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://scan.thesoulsofai.com"}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return {};
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
