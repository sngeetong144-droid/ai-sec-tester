import Link from "next/link";

const SCALENDO = {
  basic: "https://link.fastpaydirect.com/payment-link/6a2d547c03b17c94f57161ea",
  proMonthly: "https://link.fastpaydirect.com/payment-link/6a2d573603b17c94f57161ed",
  proAnnual: "https://link.fastpaydirect.com/payment-link/6a2d578503b17c94f57161ee",
};

export function PricingTiers() {
  return (
    <section className="mt-16">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-800">Plans</h2>
        <p className="mt-1 text-sm text-slate-500">
          Paid plans for ongoing assurance · Enterprise for authorized deep scans
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Basic */}
        <div className="flex flex-col rounded-2xl border border-violet-100 bg-white/70 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Basic</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">$10</p>
            <p className="mt-1 text-sm text-slate-400">one-time · per scan</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-500">
            {[
              "5 OWASP LLM checks",
              "Pass/Fail scorecard",
              "Priority scan processing",
              "Branded PDF audit report",
              "Evidence per finding",
              "Remediation guidance",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={SCALENDO.basic}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-violet-200 py-2.5 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-brand-500 hover:text-brand-600"
          >
            Buy Basic — $10
          </a>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-2xl border border-brand-500/40 bg-brand-50 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full border border-brand-500/40 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-600">
              Most Popular
            </span>
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">Pro</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">
              $10<span className="text-base font-normal text-slate-400">/mo</span>
            </p>
            <p className="mt-1 text-sm text-slate-400">or $50 one-time annual report</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-500">
            {[
              "Everything in Basic",
              "Monthly automated scans",
              "PDF report emailed monthly",
              "Scan history & trend tracking",
              "Cancel anytime",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-500">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={SCALENDO.proMonthly}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-brand-500 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Start Monthly — $10/mo
          </a>
          <a
            href={SCALENDO.proAnnual}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block rounded-lg border border-brand-500/40 py-2 text-center text-xs font-semibold text-brand-600 transition-colors hover:border-brand-500"
          >
            Or get annual report — $50 one-time
          </a>
        </div>

        {/* Enterprise */}
        <div className="relative flex flex-col rounded-2xl border border-violet-300/50 bg-white/70 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full border border-violet-300/50 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700">
              Authorized Deep Scan
            </span>
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-700">Enterprise</p>
            <p className="mt-1 text-3xl font-bold text-slate-800">$499</p>
            <p className="mt-1 text-sm text-slate-400">one-time · per chatbot</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-500">
            {[
              "Everything in Pro",
              "Authorization + identity verification",
              "Automated risk triage (score + flags)",
              "Human review before scan runs",
              "Full report + remediation plan",
              "1 free re-scan after fixes",
              "Secure token-gated report page",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-violet-600">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/enterprise"
            className="block rounded-lg bg-violet-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-violet-700"
          >
            Apply for Enterprise Scan
          </Link>
        </div>
      </div>
    </section>
  );
}
