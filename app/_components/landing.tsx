import type { ReactNode } from "react";
import Link from "next/link";

import { PAYMENT_LINKS } from "@/lib/payment-links";
import { RevealScripts, ChatBubble, RequestForm } from "@/app/_components/landing-client";

// Faithful port of the static design (Raw/package/ai-security-scanner). Markup
// mirrors ai-security-scanner.html; styling comes from app/landing.css (the
// design's own site.css + inline <style>, scoped under `.aist-landing`).
//
// Product flow: the public landing takes NO payment and shows NO checkout link.
// Every "Request a scan" / tier CTA routes to /enterprise (the existing scan
// authorization request flow). Prices are sourced from lib/payment-links.ts.

const REQUEST_HREF = "#request";

const STEPS = [
  { no: "01", h: "Point it at your bot", p: "Give the scanner your chatbot endpoint or widget. Only scan bots you own or are authorized to test." },
  { no: "02", h: "We run OWASP LLM checks", p: "Automated prompt-injection, jailbreak and data-leak probes aligned to the OWASP Top-10 for LLM apps." },
  { no: "03", h: "Get scorecard + fixes", p: "A Pass/Fail report with evidence per finding and plain-language remediation guidance you can act on." },
];

type Check = { code: string; h: string; p: string; icon: ReactNode };
const CHECKS: Check[] = [
  { code: "LLM01", h: "Prompt injection", p: "Can a crafted message override your instructions or hijack the bot's behavior?", icon: <path d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z" /> },
  { code: "LLM06", h: "Sensitive info disclosure", p: "Will it reveal secrets, keys, or other users' data when coaxed?", icon: <path d="M15 7a5 5 0 0 0-5-5 5 5 0 0 0-5 5v3H4v10h12V10h-1z" /> },
  { code: "LLM07", h: "System prompt leakage", p: "Can an attacker extract your hidden system prompt and business logic?", icon: <path d="M4 4h16v12H4zM8 20h8M12 16v4" /> },
  { code: "LLM08", h: "Excessive agency", p: "Does the bot take actions or call tools it shouldn't be allowed to?", icon: <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3" /> },
  { code: "JAILBREAK", h: "Guardrail bypass", p: "Common jailbreak patterns that trick the model past its safety rules.", icon: <><path d="M7 11V7a5 5 0 0 1 10 0v4" /><rect x="4" y="11" width="16" height="9" rx="2" /></> },
  { code: "OUTPUT", h: "Insecure output handling", p: "Unsafe content the bot returns that could break the page consuming it.", icon: <><path d="M12 3l7 3v6c0 4-3 7-7 8-4-1-7-4-7-8V6z" /><path d="M9 12l2 2 4-4" /></> },
];

const SCORECARD = [
  { code: "LLM01", name: "Prompt injection", verdict: "PASS" as const },
  { code: "LLM02", name: "Insecure output", verdict: "PASS" as const },
  { code: "LLM06", name: "Sensitive info leak", verdict: "REVIEW" as const },
  { code: "LLM07", name: "System prompt leakage", verdict: "PASS" as const },
  { code: "LLM08", name: "Excessive agency", verdict: "PASS" as const },
];

const { basic: NORMAL, advanced: ADVANCED, enterprise: ENTERPRISE } = PAYMENT_LINKS;

const TIERS = [
  {
    name: "Normal",
    price: NORMAL.priceUsd,
    unit: "one-time · per scan",
    desc: "A full one-off scan with a shareable report.",
    feat: false,
    tier: "basic",
    cta: "Request Normal scan",
    btnClass: "btn btn-ghost",
    features: [
      "5 OWASP LLM checks",
      "Pass/Fail scorecard",
      "Priority scan processing",
      "Branded PDF audit report",
      "Evidence per finding + remediation",
    ],
  },
  {
    name: "Advanced",
    price: ADVANCED.priceUsd,
    unit: "one-time",
    desc: "Full coverage with a deeper scan and audit report.",
    feat: true,
    tier: "advanced",
    cta: "Request Advanced scan",
    btnClass: "btn btn-accent",
    features: [
      "Everything in Normal",
      "Full OWASP LLM Top-10 coverage",
      "Deeper probes per category",
      "PDF reports emailed automatically",
    ],
  },
  {
    name: "Enterprise",
    price: ENTERPRISE.priceUsd,
    unit: "one-time · per chatbot",
    desc: "Authorized deep scan with human review.",
    feat: false,
    tier: "enterprise",
    cta: "Request Enterprise scan",
    btnClass: "btn btn-ghost",
    features: [
      "Everything in Advanced",
      "Authorization + identity verification",
      "Automated risk triage (score + flags)",
      "Human review before scan runs",
      "Full report + 1 free re-scan after fixes",
      "Secure token-gated report page",
    ],
  },
];

function Check16() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function Landing() {
  return (
    <div className="aist-landing">
      {/* Fonts used by the design (headings: Plus Jakarta Sans; body: Inter; code: JetBrains Mono). */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      {/* Progressive enhancement: without JS the reveal targets stay visible. */}
      <noscript>
        {/* eslint-disable-next-line react/no-danger */}
        <style dangerouslySetInnerHTML={{ __html: ".aist-landing [data-reveal]{opacity:1;transform:none}" }} />
      </noscript>

      {/* HERO */}
      <header className="s-hero">
        <div className="wrap s-hero-grid">
          <div>
            <span className="eyebrow line">AI Chatbot Security Scanner</span>
            <h1>
              Is your AI chatbot <em>easy to jailbreak?</em>
            </h1>
            <p className="dek">
              Run OWASP-aligned prompt-injection and jailbreak checks against your
              chatbot. Get a Pass/Fail security scorecard with remediation guidance —
              in seconds.
            </p>
            <div className="s-actions">
              <a href={REQUEST_HREF} className="btn btn-accent">
                Request a scan
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <a href="#how" className="btn btn-ghost">
                How it works
              </a>
            </div>
            <div className="s-ticks">
              <span>OWASP-aligned</span>
              <span>Pass/Fail scorecard</span>
              <span>Results in seconds</span>
            </div>
          </div>

          {/* SCORECARD MOCK */}
          <div className="scorecard" data-reveal data-reveal-delay="120">
            <div className="sc-top">
              <span className="t">Security scorecard</span>
              <span className="u">scan · support-bot</span>
            </div>
            <div className="sc-grade">
              <div className="badge">A&minus;</div>
              <div className="lbl">
                <b>Mostly resilient</b>
                <p>1 medium issue found · 5 checks run</p>
              </div>
            </div>
            <div className="sc-rows">
              {SCORECARD.map((row) => (
                <div key={row.code} className="sc-row">
                  <span>
                    <span className="code">{row.code}</span>{" "}
                    <span className="name">{row.name}</span>
                  </span>
                  <span className={`sc-tag ${row.verdict === "PASS" ? "pass" : "warn"}`}>
                    {row.verdict}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section className="blk" id="how" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <span className="eyebrow line">How it works</span>
            <h2>Three steps to a security scorecard.</h2>
          </div>
          <div className="steps3">
            {STEPS.map((s, i) => (
              <div key={s.no} className="st" data-reveal data-reveal-delay={i * 80}>
                <div className="no">{s.no}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE CHECK */}
      <section
        className="blk"
        id="checks"
        style={{ background: "var(--surface-2)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}
      >
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <span className="eyebrow line">What we check</span>
            <h2>The risks most chatbots miss.</h2>
            <p>
              Checks aligned with the OWASP Top-10 for LLM Applications — the failure
              modes attackers actually use.
            </p>
          </div>
          <div className="checks">
            {CHECKS.map((c, i) => (
              <div key={c.code} className="chk" data-reveal data-reveal-delay={i % 3 === 0 ? 0 : i % 3 === 1 ? 60 : 120}>
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {c.icon}
                  </svg>
                </span>
                <div>
                  <div className="code">{c.code}</div>
                  <h4>{c.h}</h4>
                  <p>{c.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="blk" id="pricing">
        <div className="wrap">
          <div className="sec-head center" data-reveal>
            <span className="eyebrow">Plans</span>
            <h2 style={{ marginTop: 14 }}>Choose a plan, then request your scan.</h2>
            <p>
              Every scan starts with a short authorization request — we verify you own
              or are allowed to test the target before any payment or scan runs.
            </p>
          </div>
          <div className="price">
            {TIERS.map((t, i) => (
              <div key={t.name} className={t.feat ? "tier feat" : "tier"} data-reveal data-reveal-delay={i * 100}>
                {t.feat && <span className="rib">Most popular</span>}
                <h3>{t.name}</h3>
                <div className="amt">
                  ${t.price} <small>{t.unit}</small>
                </div>
                <p className="desc">{t.desc}</p>
                <ul>
                  {t.features.map((f) => (
                    <li key={f}>
                      <Check16 />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={REQUEST_HREF} data-plan={t.tier} className={t.btnClass}>
                  {t.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REQUEST FORM */}
      <section className="blk" id="request">
        <div className="wrap req-grid">
          <div data-reveal>
            <span className="eyebrow line">Request a scan</span>
            <h2 style={{ fontSize: "clamp(28px,3.4vw,40px)", margin: "14px 0 12px" }}>Tell us what to scan.</h2>
            <p className="muted" style={{ fontSize: 16.5 }}>
              Submitting this request doesn&rsquo;t charge you. We review every request to
              confirm you&rsquo;re authorized to test the target, then email you a payment
              link (if approved) or the reason it wasn&rsquo;t.
            </p>
            <div className="req-assure">
              {["No charge until approved", "Reviewed within 1 business day", "Your details stay private"].map((t) => (
                <div className="ra" key={t}>
                  <span className="ic">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>{" "}
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div data-reveal data-reveal-delay="80">
            <RequestForm />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="blk" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="s-cta" data-reveal>
            <span className="eyebrow" style={{ color: "var(--accent-2)", justifyContent: "center", display: "flex" }}>
              Find out before an attacker does
            </span>
            <h2>Scan your chatbot today.</h2>
            <p>Get a security scorecard and fixes in seconds — starting at ${NORMAL.priceUsd} per scan.</p>
            <a href={REQUEST_HREF} className="btn btn-accent" style={{ fontSize: 16, padding: "15px 28px" }}>
              Request a scan
            </a>
            <p className="trustline" style={{ color: "rgba(255,255,255,.45)", marginTop: 20 }}>
              Checks aligned with OWASP Top-10 for LLM Applications. Only scan chatbots
              you own or are authorized to test.
            </p>
          </div>
        </div>
      </section>

      <ChatBubble />
      <RevealScripts />
    </div>
  );
}

// Rendered after the FAQ so the ported design footer closes the page. Kept in
// its own `.aist-landing` wrapper so the Tailwind FAQ between it and the hero is
// never touched by the design's CSS reset.
export function LandingFooter() {
  return (
    <div className="aist-landing">
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div>
              <a href="https://thesoulsofai.com" className="brand" style={{ fontSize: 19 }}>
                <img src="/assets/thesoulsofai_watermark.png" alt="" style={{ width: 32, height: 32 }} />
                <span>
                  AI Sec <b>Tester</b>
                </span>
              </a>
              <p>An AI security tool by The Souls of AI. Know your chatbot&rsquo;s risks before attackers do.</p>
            </div>
            <div>
              <h5>Scanner</h5>
              <a href="#how">How it works</a>
              <a href="#checks">What we check</a>
              <a href="#pricing">Pricing</a>
              <Link href="/enterprise">Enterprise</Link>
            </div>
            <div>
              <h5>The Souls of AI</h5>
              <a href="https://thesoulsofai.com">Main site</a>
              <a href="https://thesoulsofai.com/starter-map">Starter Map (Free)</a>
              <a href="https://thesoulsofai.com/blog">Blog</a>
            </div>
            <div>
              <h5>Legal</h5>
              <a href="https://thesoulsofai.com/privacy">Privacy Policy</a>
              <a href="https://thesoulsofai.com/terms">Terms of Service</a>
            </div>
          </div>
          <div className="foot-bot">
            <span>© 2026 The Souls of AI. All rights reserved.</span>
            <span className="foot-legal">
              <a href="https://thesoulsofai.com/privacy">Privacy Policy</a>
              <a href="https://thesoulsofai.com/terms">Terms of Service</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
