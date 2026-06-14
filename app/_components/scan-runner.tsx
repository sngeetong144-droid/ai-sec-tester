"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { runScan, type RunScanState } from "@/app/actions/scans";

const STEPS = [
  "System Prompt Disclosure",
  "Prompt Injection / Instruction Override",
  "Jailbreak & Persona Bypass",
  "Sensitive Data Exposure",
  "Unsafe Content Generation",
];

const initial: RunScanState = { ok: false };

export function ScanRunner() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(runScan, initial);
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPending) {
      setStep(0);
      timer.current = setInterval(() => {
        setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
      }, 550);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isPending]);

  useEffect(() => {
    if (state.ok && state.scanId) {
      router.push(`/scans/${state.scanId}`);
    }
  }, [state, router]);

  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="rounded-2xl border border-violet-100 bg-white/70 p-6 shadow-sm backdrop-blur">
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="target_url"
            className="mb-1.5 block text-sm font-medium text-slate-600"
          >
            Chatbot URL
          </label>
          <input
            id="target_url"
            name="target_url"
            type="text"
            inputMode="url"
            placeholder="yourcompany.com  (the page your AI chatbot lives on)"
            required
            disabled={isPending}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="target_label"
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              Label <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="target_label"
              name="target_label"
              type="text"
              placeholder="Support bot"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-slate-600"
            >
              Email for report <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-300 outline-none focus:border-brand-500 disabled:opacity-60"
            />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-sm text-slate-600">
          <input
            type="checkbox"
            name="authorized"
            required
            disabled={isPending}
            className="mt-0.5 size-4 rounded border-slate-300 bg-white accent-brand-500"
          />
          <span>
            I own this chatbot, or I am authorized to run a security test
            against it. Only scan targets you have permission to test.
          </span>
        </label>

        {state.error && !isPending && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-brand-500 px-5 py-3 text-center font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? "Scanning…" : "Run Security Scan"}
        </button>
      </form>

      {isPending && (
        <div className="mt-6 space-y-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-violet-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <ul className="space-y-1.5 font-mono text-xs">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={`flex items-center gap-2 ${
                  i < step
                    ? "text-emerald-600"
                    : i === step
                      ? "text-brand-600 scan-pulse"
                      : "text-slate-300"
                }`}
              >
                <span className="w-4 text-center">
                  {i < step ? "✓" : i === step ? "▸" : "·"}
                </span>
                {i <= step ? `Running: ${s}` : s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
