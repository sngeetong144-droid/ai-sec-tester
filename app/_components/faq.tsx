// FAQ section + schema.org JSON-LD for the anonymous landing.
// ponytail: FAQS drives BOTH the visible <details> list and the FAQPage JSON-LD,
// so the answer-engine schema can never drift from what humans read.
// Prices come from lib/payment-links.ts (single source of truth) — never hardcode.

import { PAYMENT_LINKS } from "@/lib/payment-links";

const ACCENT = "#0f9d6b";
const SITE_URL = "https://scan.thesoulsofai.com";

const { basic: NORMAL, advanced: ADVANCED, enterprise: ENTERPRISE } = PAYMENT_LINKS;

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is AI Sec Tester?",
    a: "AI Sec Tester is a chatbot security scanner that runs automated, OWASP LLM Top-10 aligned prompt-injection and jailbreak checks against your AI chatbot and returns a Pass/Fail security scorecard with remediation guidance in seconds.",
  },
  {
    q: "What is prompt injection and why does it matter?",
    a: "Prompt injection is when a crafted message overrides your chatbot's instructions or hijacks its behavior — for example tricking it into ignoring its system prompt, leaking data, or taking unauthorized actions. It is the top risk in the OWASP Top-10 for LLM Applications (LLM01) and the most common way AI chatbots are exploited.",
  },
  {
    q: "Which security checks does the scanner run?",
    a: "The scan covers OWASP LLM risks including prompt injection (LLM01), insecure output handling (LLM02), sensitive information disclosure (LLM06), system prompt leakage (LLM07), and excessive agency (LLM08), plus common jailbreak and guardrail-bypass patterns.",
  },
  {
    q: "How long does a scan take?",
    a: "Most scans complete in seconds. You get a Pass/Fail scorecard with evidence per finding and plain-language remediation guidance, plus a branded PDF audit report you can share with your team.",
  },
  {
    q: "Is it safe and legal to run against my chatbot?",
    a: "Yes, when used defensively. AI Sec Tester runs non-invasive, OWASP-aligned checks and is intended only for chatbots you own or are explicitly authorized to test. It does not send exploit payloads or perform infrastructure penetration testing.",
  },
  {
    q: "How much does it cost?",
    a: `Every plan is a one-time charge, reviewed by a human before you pay — there is no self-serve scanning. Normal is $${NORMAL.priceUsd} per scan with 5 OWASP LLM checks and a branded PDF scorecard. Advanced is $${ADVANCED.priceUsd} for full OWASP LLM Top-10 coverage with deeper probes per category. Enterprise is $${ENTERPRISE.priceUsd} per chatbot and adds authorization plus identity verification, human review before the scan runs, and one free re-scan after fixes.`,
  },
  {
    q: "Do I need to install anything?",
    a: "No. AI Sec Tester is fully hosted — point it at your chatbot endpoint or widget and run the scan from the browser. There is nothing to install or deploy.",
  },
];

export function SeoJsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Souls of AI",
    url: "https://thesoulsofai.com",
    brand: { "@type": "Brand", name: "AI Sec Tester" },
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AI Sec Tester",
    applicationCategory: "SecurityApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "Chatbot security scanner that runs OWASP LLM Top-10 aligned prompt-injection and jailbreak checks and returns a Pass/Fail security scorecard with remediation guidance.",
    publisher: { "@type": "Organization", name: "The Souls of AI", url: "https://thesoulsofai.com" },
    offers: [
      { "@type": "Offer", name: "Normal", price: String(NORMAL.priceUsd), priceCurrency: "USD", description: "One-time reviewed scan with 5 OWASP LLM checks and a branded PDF scorecard." },
      { "@type": "Offer", name: "Advanced", price: String(ADVANCED.priceUsd), priceCurrency: "USD", description: "One-time scan with full OWASP LLM Top-10 coverage and deeper probes per category." },
      { "@type": "Offer", name: "Enterprise", price: String(ENTERPRISE.priceUsd), priceCurrency: "USD", description: "Authorization + identity verification, human review before scan, full report, and one free re-scan." },
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      {[organization, software, faqPage].map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-14">
      <div className="mb-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
          FAQ
        </span>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Chatbot security scanning, answered.
        </h2>
      </div>
      <div className="space-y-3">
        {FAQS.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-xl border border-violet-100 bg-white p-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-base font-bold text-slate-800">
              {q}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="size-5 shrink-0 transition-transform group-open:rotate-45"
                style={{ color: ACCENT }}
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </summary>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-500">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
