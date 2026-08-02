// SEO JSON-LD for the anonymous landing (Organization + SoftwareApplication +
// FAQPage). The FAQPage schema consumes the SAME FAQS array that the visible
// landing accordion renders (app/_components/landing.tsx), so the answer-engine
// schema can never drift from what humans read — Google's FAQ rich-result
// policy requires the marked-up Q&A to be visible on the page.
// Prices come from lib/payment-links.ts (single source of truth) — never hardcode.

import { PAYMENT_LINKS } from "@/lib/payment-links";
import { FAQS } from "@/app/_components/landing";

const SITE_URL = "https://scan.thesoulsofai.com";

// Enterprise is NOT destructured — retired by ruling R-15. A schema.org Offer is a
// machine-readable price quote to answer engines; emitting one for a tier nobody can
// buy advertises a product that does not exist.
const { basic: NORMAL, advanced: ADVANCED } = PAYMENT_LINKS;

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
      { "@type": "Offer", name: "Advanced", price: String(ADVANCED.priceUsd), priceCurrency: "USD", description: "One-time scan covering all 10 OWASP LLM categories: 7 probed live, 3 advisory." },
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
