import type { Metadata } from "next";
import { signInWithGoogle } from "./actions";

// The gate itself is public, but must never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const denied = (await searchParams).denied === "1";

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-violet-100 bg-white/80 p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-slate-800">Admin sign in</h1>
        <p className="mb-6 text-sm text-slate-500">
          The command center is restricted to authorized admins.
        </p>

        {denied && (
          <div className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            This Google account is not authorized for admin access.
          </div>
        )}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
