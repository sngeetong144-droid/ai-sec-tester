import { PAYMENT_LINKS } from "@/lib/payment-links";
import { JURISDICTION_NOTICE } from "@/lib/jurisdiction-policy";

// Prices come from lib/payment-links.ts (single source of truth). Every tier is
// reviewed by a human before payment — the public page NEVER exposes a checkout
// link. Each CTA scrolls to the #request form and preselects its plan via
// data-plan (RequestForm listens for it); the link is emailed only after approval.
const NORMAL = PAYMENT_LINKS.basic;
const ADVANCED = PAYMENT_LINKS.advanced;
const ENTERPRISE = PAYMENT_LINKS.enterprise;

export function PricingTiers() {
  return (
    <section className="mt-16">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Plans</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every plan is reviewed before you pay — we verify authorization first,
          then activate the scan. One-time, per chatbot. No self-serve scanning.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-amber-700">
          {JURISDICTION_NOTICE}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Normal */}
        <div className="flex flex-col rounded-2xl border border-violet-100 bg-white/70 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Normal</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">${NORMAL.priceUsd}</p>
            <p className="mt-1 text-sm text-slate-400">one-time · reviewed before you pay</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-500">
            {[
              "5 OWASP LLM checks",
              "Pass/Fail scorecard",
              // Was "Priority scan processing" — nothing in the system prioritised
              // anything. The dispatcher had no ORDER BY at all, so the queue was
              // not even FIFO, let alone tiered. Replaced with a claim the code
              // actually backs: settlement triggers dispatch directly, no human
              // step. Measured 2026-08-01 on request 7fdd21ea — paid to delivered
              // PDF in under four minutes.
              "Scan starts automatically after payment",
              "Branded PDF audit report",
              "Evidence per finding + remediation",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href="#request"
            data-plan="basic"
            className="block rounded-lg border border-violet-200 py-2.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-brand-500 hover:text-brand-600"
          >
            Request Normal — ${NORMAL.priceUsd}
          </a>
        </div>

        {/* Advanced */}
        <div className="relative flex flex-col rounded-2xl border border-brand-500/40 bg-brand-50 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full border border-brand-500/40 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-600">
              Most Popular
            </span>
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Advanced</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">${ADVANCED.priceUsd}</p>
            <p className="mt-1 text-sm text-slate-400">one-time · reviewed before you pay</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-500">
            {[
              "Everything in Normal",
              "Full OWASP LLM Top-10 coverage",
              "Deeper probes per category",
              "PDF reports emailed automatically",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href="#request"
            data-plan="advanced"
            className="block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Request Advanced — ${ADVANCED.priceUsd}
          </a>
        </div>

        {/* Enterprise */}
        <div className="relative flex flex-col rounded-2xl border border-violet-300/50 bg-white/70 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full border border-violet-300/50 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Reviewed + identity verify
            </span>
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-700">Enterprise</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">${ENTERPRISE.priceUsd}</p>
            <p className="mt-1 text-sm text-slate-400">one-time · per chatbot</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-500">
            {[
              "Everything in Advanced",
              "Authorization + identity verification",
              "Automated risk triage (score + flags)",
              "Human review before scan runs",
              "Full report + 1 free re-scan after fixes",
              "Secure token-gated report page",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-violet-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href="#request"
            data-plan="enterprise"
            className="block rounded-lg bg-violet-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            Request Enterprise — ${ENTERPRISE.priceUsd}
          </a>
        </div>
      </div>
    </section>
  );
}
