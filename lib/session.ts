import { cookies } from "next/headers";

const COOKIE = "aist_sid";

/** Read the anonymous session id from cookies, if present (read-only context). */
export async function readSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/**
 * Get-or-create the anonymous session id. Only call from a Server Action or
 * Route Handler — Server Components cannot set cookies.
 */
export async function ensureSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;
  const sid = crypto.randomUUID();
  store.set(COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return sid;
}
