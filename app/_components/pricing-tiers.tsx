import Link from "next/link";

export function PricingTiers() {
  return (
    <section className="mt-16">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-100">Plans</h2>
        <p className="mt-1 text-sm text-slate-500">
          Free for quick checks · Enterprise for authorized deep scans
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Free
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-100">$0</p>
            <p className="mt-1 text-sm text-slate-500">No signup required</p>
          </div>

          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-400">
            {[
              "5 standard jailbreak/injection checks",
              "Pass/Fail scorecard",
              "Downloadable PDF audit report",
              "OWASP LLM Top-10 aligned",
              "Passive — no payloads sent",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-400">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href="#scanner"
            className="block rounded-lg border border-slate-700 py-2.5 text-center text-sm font-semibold text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            Try it now — free
          </a>
        </div>

        {/* Enterprise */}
        <div className="relative flex flex-col rounded-2xl border border-brand-500/40 bg-brand-500/5 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full border border-brand-500/40 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-400">
              Authorized Deep Scan
            </span>
          </div>

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">
              Enterprise
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-100">$499</p>
            <p className="mt-1 text-sm text-slate-500">one-time · per chatbot</p>
          </div>

          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-400">
            {[
              "Everything in Free",
              "Authorization + identity verification",
              "Automated 1st-layer risk triage",
              "Manual approval before scan runs",
              "Full report emailed to you",
              "One complimentary re-scan included",
              "Ownership evidence on file",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-400">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            href="/enterprise"
            className="block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600"
          >
            Apply for Enterprise Scan
          </Link>
        </div>
      </div>
    </section>
  );
}
