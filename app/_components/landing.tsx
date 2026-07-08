import Link from "next/link";

// Presentational emerald landing for anonymous visitors.
// ponytail: pure Tailwind utilities scoped to this component — no global CSS,
// so the authed scanner views are untouched. Accent = #0f9d6b scanner sub-brand.

const ACCENT = "#0f9d6b";

const STEPS = [
  { no: "01", h: "Point it at your bot", p: "Give the scanner your chatbot endpoint or widget. Only scan bots you own or are authorized to test." },
  { no: "02", h: "We run OWASP LLM checks", p: "Automated prompt-injection, jailbreak and data-leak probes aligned to the OWASP Top-10 for LLM apps." },
  { no: "03", h: "Get scorecard + fixes", p: "A Pass/Fail report with evidence per finding and plain-language remediation guidance you can act on." },
];

const CHECKS = [
  { code: "LLM01", h: "Prompt injection", p: "Can a crafted message override your instructions or hijack the bot's behavior?" },
  { code: "LLM06", h: "Sensitive info disclosure", p: "Will it reveal secrets, keys, or other users' data when coaxed?" },
  { code: "LLM07", h: "System prompt leakage", p: "Can an attacker extract your hidden system prompt and business logic?" },
  { code: "LLM08", h: "Excessive agency", p: "Does the bot take actions or call tools it shouldn't be allowed to?" },
  { code: "JAILBREAK", h: "Guardrail bypass", p: "Common jailbreak patterns that trick the model past its safety rules." },
  { code: "OUTPUT", h: "Insecure output handling", p: "Unsafe content the bot returns that could break the page consuming it." },
];

const SCORECARD = [
  { code: "LLM01", name: "Prompt injection", verdict: "PASS" as const },
  { code: "LLM02", name: "Insecure output", verdict: "PASS" as const },
  { code: "LLM06", name: "Sensitive info leak", verdict: "REVIEW" as const },
  { code: "LLM07", name: "System prompt leakage", verdict: "PASS" as const },
  { code: "LLM08", name: "Excessive agency", verdict: "PASS" as const },
];

export function Landing() {
  return (
    <div className="text-slate-800">
      {/* HERO */}
      <header className="mx-auto max-w-6xl px-5 pt-16 pb-12 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{ borderColor: "rgba(15,157,107,.26)", color: ACCENT, background: "rgba(15,157,107,.08)" }}
            >
              <span className="size-1.5 rounded-full" style={{ background: ACCENT }} />
              AI Chatbot Security Scanner
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.03] tracking-tight sm:text-5xl lg:text-6xl">
              Is your AI chatbot{" "}
              <span style={{ color: ACCENT }}>easy to jailbreak?</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-500">
              Run OWASP-aligned prompt-injection and jailbreak checks against your
              chatbot. Get a Pass/Fail security scorecard with remediation guidance —
              in seconds.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ background: ACCENT, boxShadow: "0 8px 22px rgba(15,157,107,.26)" }}
              >
                Scan my chatbot
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a
                href="#how"
                className="rounded-lg border border-slate-200 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300"
              >
                How it works
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-5 text-sm font-semibold text-slate-400">
              {["OWASP-aligned", "Pass/Fail scorecard", "Results in seconds"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <span style={{ color: ACCENT }}>✦</span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* SCORECARD MOCK */}
          <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-violet-100 bg-white/60 px-6 py-5">
              <span className="font-extrabold">Security scorecard</span>
              <span className="font-mono text-[11px] text-slate-400">scan · support-bot</span>
            </div>
            <div className="flex items-center gap-4 px-6 py-6">
              <div
                className="grid size-[74px] place-items-center rounded-[20px] text-4xl font-extrabold text-white"
                style={{ background: ACCENT, boxShadow: "0 8px 22px rgba(15,157,107,.26)" }}
              >
                A−
              </div>
              <div>
                <b className="text-lg">Mostly resilient</b>
                <p className="text-[13px] text-slate-400">1 medium issue found · 5 checks run</p>
              </div>
            </div>
            <div className="px-6 pb-6">
              {SCORECARD.map((row) => (
                <div key={row.code} className="flex items-center justify-between border-t border-violet-100 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-400">{row.code}</span>
                    <span className="font-semibold text-slate-600">{row.name}</span>
                  </span>
                  {row.verdict === "PASS" ? (
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(15,157,107,.12)", color: ACCENT }}>
                      PASS
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-600">
                      REVIEW
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>How it works</span>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Three steps to a security scorecard.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.no} className="rounded-2xl border border-violet-100 bg-white p-7 transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="mb-4 grid size-10 place-items-center rounded-xl font-extrabold" style={{ background: "rgba(15,157,107,.08)", color: ACCENT }}>
                {s.no}
              </div>
              <h3 className="mb-1.5 text-lg font-bold">{s.h}</h3>
              <p className="text-[15px] text-slate-500">{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHAT WE CHECK */}
      <section id="checks" className="border-y border-violet-100 bg-white/50">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>What we check</span>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">The risks most chatbots miss.</h2>
            <p className="mt-2 max-w-2xl text-slate-500">
              Checks aligned with the OWASP Top-10 for LLM Applications — the failure
              modes attackers actually use.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CHECKS.map((c) => (
              <div key={c.code} className="flex items-start gap-4 rounded-xl border border-violet-100 bg-white p-5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: "rgba(15,157,107,.08)", color: ACCENT }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[19px]">
                    <path d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
                  </svg>
                </span>
                <div>
                  <div className="font-mono text-[11px] font-semibold" style={{ color: ACCENT }}>{c.code}</div>
                  <h4 className="mt-0.5 text-base font-bold">{c.h}</h4>
                  <p className="mt-0.5 text-[13.5px] text-slate-400">{c.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// CTA band rendered after pricing so its buttons point at the real pricing/login.
export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16">
      <div
        className="relative overflow-hidden rounded-[32px] px-8 py-16 text-center sm:px-10"
        style={{ background: "#101828" }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2fc48a" }}>
          Find out before an attacker does
        </span>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold text-white sm:text-4xl">
          Scan your chatbot today.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">
          Get a security scorecard and fixes in seconds — plans start at $10 per scan.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/auth/login"
            className="rounded-lg px-7 py-3.5 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: ACCENT, boxShadow: "0 8px 22px rgba(15,157,107,.26)" }}
          >
            Scan my chatbot
          </Link>
          <a
            href="#pricing"
            className="rounded-lg border border-white/20 px-7 py-3.5 text-base font-semibold text-white/90 transition-colors hover:border-white/40"
          >
            View plans
          </a>
        </div>
        <p className="mx-auto mt-6 max-w-2xl font-mono text-[13px] text-white/40">
          Checks aligned with OWASP Top-10 for LLM Applications. Only scan chatbots you
          own or are authorized to test.
        </p>
      </div>
    </section>
  );
}
