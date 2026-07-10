import { Shell } from "@/app/command-center/_components/shell";
import { Card, CardTitle, COLORS, Badge, Mono } from "@/app/command-center/_ui";
import {
  LICENSE_RESTRICTED_JURISDICTIONS,
  SANCTIONS_CITATIONS,
  JURISDICTION_POLICY,
} from "@/lib/jurisdiction-policy";

export const dynamic = "force-dynamic";

const GATE_CARDS = [
  { title: "Ownership", desc: "Authorization proven via DNS TXT, a /.well-known file, or an HTML meta tag — never by country." },
  { title: "SSRF guard", desc: "Target must be a public address. Loopback, RFC1918, and cloud-metadata endpoints are rejected." },
  { title: "Sanctions", desc: "Deny-only. A hit rejects; a clear match is never on its own sufficient to approve." },
  { title: "Disclosure", desc: "Subscribed targets require provider-notice proof before a scan activates." },
  { title: "Payment", desc: "Scalendo Stripe-backed link; the approval email carries it. No charge until approved." },
];

const SIGNALS = [
  "Declared vs IP country — mismatch applies the stricter policy and flags due diligence.",
  "VPN / proxy / datacenter ASN — a hosting/anonymizer ASN marks the IP country untrusted.",
  "Browser timezone & locale — captured on submit; a US declaration with an Asia/Pyongyang tz is a critical conflict.",
  "Payment card country — Stripe issuing country is compared post-payment; a mismatch re-opens due diligence.",
];

const OWNERSHIP = [
  { title: "DNS TXT record", desc: "_aist-verify TXT on the target domain — strongest signal, needs domain admin." },
  { title: "Verification file", desc: "/.well-known/aist-verify.txt with the requestor email — needs hosting access." },
  { title: "HTML meta tag", desc: "<meta name=\"aist-verify\"> in the site head — needs code/CMS access." },
];

export default async function GatePage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;

  return (
    <Shell eyebrow="Configuration" title="Gate status" subtitle="The conditions every scan must clear. No bypass parameter exists." caseParam={caseParam}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {GATE_CARDS.map((g) => (
          <Card key={g.title}>
            <CardTitle>{g.title}</CardTitle>
            <div style={{ marginTop: 8, fontSize: 12.5, color: COLORS.ink2, lineHeight: 1.5 }}>{g.desc}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle>Jurisdiction engine</CardTitle>
          <Badge kind="ok">Active on intake</Badge>
        </div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: COLORS.ink2 }}>
          Dual-source: the declared country on the form and the IP-resolved country. The stricter of the two wins.
          Sanctions auto-reject; licence-required jurisdictions HOLD for manual review — they are never auto-rejected.
        </div>

        {JURISDICTION_POLICY.needsLegalReview && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(201,154,46,0.10)", border: "1px solid rgba(201,154,46,0.35)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#a87d1e" }}>
              Not legal advice — pending counsel sign-off
            </div>
            <div style={{ fontSize: 11.5, color: COLORS.ink2, marginTop: 4, lineHeight: 1.5 }}>
              These lists are engineering&rsquo;s best effort at encoding sanctions and licensing signals. Each entry
              shows the date it was last checked against its source, not that it is currently authoritative.
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.ink3, marginBottom: 8 }}>
              Due-diligence signals
            </div>
            {SIGNALS.map((s) => (
              <div key={s} style={{ fontSize: 12, color: COLORS.ink2, padding: "4px 0", lineHeight: 1.4 }}>• {s}</div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.ink3, marginBottom: 8 }}>
              Licence required — hold for review
            </div>
            {LICENSE_RESTRICTED_JURISDICTIONS.map((j) => (
              <div key={j.code} style={{ padding: "4px 0", borderBottom: `1px solid ${COLORS.hairline}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, color: COLORS.ink2 }}>
                    <Mono>{j.code}</Mono> {j.name}
                  </span>
                  <Badge kind="warn">Hold for review</Badge>
                </div>
                {j.lastReviewed && (
                  <div style={{ fontSize: 10.5, color: COLORS.ink3, marginTop: 2 }}>Reviewed {j.lastReviewed} · {j.regulator}</div>
                )}
              </div>
            ))}

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: COLORS.ink3, margin: "12px 0 8px" }}>
              Sanctions — auto-reject
            </div>
            <div style={{ maxHeight: 220, overflowY: "auto" }}>
              {SANCTIONS_CITATIONS.map((s) => (
                <div key={s.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                  <span style={{ fontSize: 12, color: COLORS.ink2 }}>
                    <Mono>{s.code}</Mono> {s.name}
                    <span style={{ fontSize: 10.5, color: COLORS.ink3 }}> · reviewed {s.lastReviewed}</span>
                  </span>
                  <Badge kind="bad">{s.comprehensive ? "Comprehensive" : "Targeted"}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <CardTitle>Ownership challenge types</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
          {OWNERSHIP.map((o) => (
            <div key={o.title} style={{ background: COLORS.inset, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{o.title}</div>
              <div style={{ fontSize: 11.5, color: COLORS.ink3, marginTop: 6, lineHeight: 1.5 }}>{o.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop: 14, background: COLORS.darkCard, border: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Consent & declaration</div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: "#c9c6de", lineHeight: 1.5 }}>
          The requestor signs that they own or are authorized to test the target, and that subscribed services have
          been informed. Signature, timestamp, IP, and user-agent are stored with the record.
        </div>
      </Card>
    </Shell>
  );
}
