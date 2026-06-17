"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "./actions";

export default function LoginPage() {
  const [email, setEmail]   = useState("");
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink(email);
      if (result.error) setError(result.error);
      else setSent(true);
    });
  }

  return (
    <main className="grid-bg min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-violet-100 bg-white/80 p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-slate-800">Sign in</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter your email — we'll send a magic link. No password needed.
        </p>

        {sent ? (
          <div className="rounded-xl bg-violet-50 p-4 text-center text-sm text-violet-700">
            Check your inbox for a magic link.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
            {error && (
              <p className="text-xs text-rose-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
