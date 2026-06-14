import Link from "next/link";

const SCALENDO = {
  basic: "https://link.fastpaydirect.com/payment-link/6a2d547c03b17c94f57161ea",
  proMonthly: "https://link.fastpaydirect.com/payment-link/6a2d573603b17c94f57161ed",
  proAnnual: "https://link.fastpaydirect.com/payment-link/6a2d578503b17c94f57161ee",
  enterprise: "https://link.fastpaydirect.com/payment-link/6a2d57be71a0aa761e464949",
};

export function PricingTiers() {
  return (
    <section className="mt-16">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-slate-100">Plans</h2>
        <p className="mt-1 text-sm text-slate-500">
          Free for quick checks · Paid plans for ongoing assurance · Enterprise for authorized deep scans
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Free */}
        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Free</p>
            <p className="mt-1 text-3xl font-bold text-slate-100">$0</p>
            <p className="mt-1 text-sm text-slate-500">No signup required</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-400">
            {[
              "5 OWASP LLM checks",
              "Pass/Fail scorecard",
              "PDF audit report",
              "Instant results",
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
            Try it free
          </a>
        </div>

        {/* Basic */}
        <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Basic</p>
            <p className="mt-1 text-3xl font-bold text-slate-100">$10</p>
            <p className="mt-1 text-sm text-slate-500">one-time · per scan</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-400">
            {[
              "Everything in Free",
              "Priority scan processing",
              "Branded PDF audit report",
              "Evidence per finding",
              "Remediation guidance",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={SCALENDO.basic}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-slate-600 py-2.5 text-center text-sm font-semibold text-slate-200 hover:border-slate-400 hover:text-white"
          >
            Buy Basic — $10
          </a>
        </div>

        {/* Pro */}
        <div className="relative flex flex-col rounded-2xl border border-violet-500/40 bg-violet-500/5 p-6">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="rounded-full border border-violet-500/40 bg-slate-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-400">
              Most Popular
            </span>
          </div>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">Pro</p>
            <p className="mt-1 text-3xl font-bold text-slate-100">$10<span className="text-base font-normal text-slate-400">/mo</span></p>
            <p className="mt-1 text-sm text-slate-500">or $50 one-time annual report</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-400">
            {[
              "Everything in Basic",
              "Monthly automated scans",
              "PDF report emailed monthly",
              "Scan history & trend tracking",
              "Cancel anytime",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-0.5 text-violet-400">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <a
            href={SCALENDO.proMonthly}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-violet-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-violet-500"
          >
            Start Monthly — $10/mo
          </a>
          <a
            href={SCALENDO.proAnnual}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block rounded-lg border border-violet-500/40 py-2 text-center text-xs font-semibold text-violet-400 hover:border-sky-400"
          >
            Or get annual report — $50 one-time
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
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">Enterprise</p>
            <p className="mt-1 text-3xl font-bold text-slate-100">$499</p>
            <p className="mt-1 text-sm text-slate-500">one-time · per chatbot</p>
          </div>
          <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-400">
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
