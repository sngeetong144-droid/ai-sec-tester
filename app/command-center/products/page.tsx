import { Shell } from "@/app/command-center/_components/shell";
import { PAYMENT_LINKS, type ScanTier } from "@/lib/payment-links";
import { TIER_FEATURES } from "@/lib/tier-features";
import { Card, CardTitle, COLORS, Badge, Mono } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

const META: Record<ScanTier, { name: string; unit: string; mode: string; productLink: string; features: readonly string[] }> = {
  basic: {
    name: "Normal",
    unit: "one-time · per scan",
    mode: "Reviewed → pay",
    productLink: "scan.thesoulsofai.com/#pricing",
    features: TIER_FEATURES.basic,
  },
  advanced: {
    name: "Advanced",
    unit: "one-time · per scan",
    mode: "Reviewed → pay",
    productLink: "scan.thesoulsofai.com/#pricing",
    features: TIER_FEATURES.advanced,
  },
  // RETIRED by ruling R-15 (2026-08-02). Kept on this ADMIN surface only, so the
  // operator can still read the price and link behind the three historical
  // Enterprise sales. It is off every public buying surface.
  enterprise: {
    name: "Enterprise",
    unit: "one-time · per chatbot",
    mode: "Retired — no longer sold",
    productLink: "— withdrawn from sale",
    features: TIER_FEATURES.enterprise,
  },
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const tiers: ScanTier[] = ["basic", "advanced", "enterprise"];

  return (
    <Shell eyebrow="Configuration" title="Products & links" subtitle="Single source of truth — priced and linked from lib/payment-links.ts." caseParam={caseParam}>
      <Card style={{ marginBottom: 14, background: "rgba(15,157,107,0.08)", border: "1px solid rgba(15,157,107,0.3)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f9d6b" }}>
          Single source of truth. The approval email pulls {"{{payLink}}"} from this exact tier map.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {tiers.map((t) => {
          const link = PAYMENT_LINKS[t];
          const m = META[t];
          return (
            <Card key={t} style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink, fontFamily: "var(--font-head)" }}>{m.name}</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: COLORS.ink, fontFamily: "var(--font-head)", letterSpacing: "-0.02em", marginTop: 4 }}>
                ${link.priceUsd}
              </div>
              <div style={{ fontSize: 11.5, color: COLORS.ink3 }}>{m.unit}</div>
              <div style={{ marginTop: 8 }}><Badge kind={PAYMENT_LINKS[t].retired ? "warn" : "subtle"}>{m.mode}</Badge></div>
              <ul style={{ listStyle: "none", padding: 0, margin: "12px 0", flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {m.features.map((f) => (
                  <li key={f} style={{ fontSize: 12.5, color: COLORS.ink2, display: "flex", gap: 6 }}>
                    <span style={{ color: "#0f9d6b" }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <div style={{ borderTop: `1px solid ${COLORS.hairline}`, paddingTop: 10 }}>
                <div style={{ fontSize: 10.5, color: COLORS.ink3, textTransform: "uppercase", letterSpacing: "0.1em" }}>Product page</div>
                <div style={{ marginTop: 2, wordBreak: "break-all" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11.5, color: COLORS.accent }}>{m.productLink}</span>
                </div>
                <div style={{ fontSize: 10.5, color: COLORS.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 8 }}>
                  Scalendo link · Stripe (emailed on approval)
                </div>
                <div style={{ marginTop: 2, wordBreak: "break-all" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: "#0f9d6b" }}>{link.url}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card>
          <CardTitle>Add-ons</CardTitle>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: COLORS.ink2 }}>
            {/* "Included re-scan (Enterprise)" removed with ruling R-15. It was also
                never real — app/actions/scans.ts:90 says the rescan path is not live. */}
            <div style={{ color: COLORS.ink3 }}>No add-ons configured.</div>
          </div>
        </Card>
        <Card style={{ background: COLORS.darkCard, border: "none" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Every plan is reviewed before pay</div>
          <div style={{ marginTop: 8, fontSize: 12.5, color: "#c9c6de", lineHeight: 1.5 }}>
            Normal ($47) and Advanced ($197) run after approval + payment — the two tiers on sale. Every tier gets the same automated
            risk triage and human authorization review. No charge until approved. USD. Payments are Scalendo · Stripe-backed.
          </div>
        </Card>
      </div>
    </Shell>
  );
}
