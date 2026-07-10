import { Shell } from "@/app/command-center/_components/shell";
import { Card, CardTitle, COLORS, Badge } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

const GATE_CARDS = [
  { title: "Ownership", desc: "Authorization proven via DNS TXT, a /.well-known file, or an HTML meta tag — never by country." },
  { title: "SSRF guard", desc: "Target must be a public address. Loopback, RFC1918, and cloud-metadata endpoints are rejected." },
  { title: "Sanctions", desc: "Deny-only. A hit rejects; a clear match is never on its own sufficient to approve." },
  { title: "Disclosure", desc: "Subscribed targets require provider-notice proof before a scan activates." },
  { title: "Payment", desc: "Scalendo Stripe-backed link; the approval email carries it. No charge until approved." },
];

const JUR_POLICY: { code: string; name: string; kind: "warn" | "bad" }[] = [
  { code: "SG", name: "Licence required", kind: "warn" },
  { code: "MY", name: "Licence required", kind: "warn" },
  { code: "CU", name: "Sanctioned", kind: "bad" },
  { code: "IR", name: "Sanctioned", kind: "bad" },
  { code: "KP", name: "Sanctioned", kind: "bad" },
  { code: "SY", name: "Sanctioned", kind: "bad" },
  { code: "RU", name: "Sanctioned", kind: "bad" },
  { code: "BY", name: "Sanctioned", kind: "bad" },
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
          Static policy list v1 — upgrade path is live OFAC/SDN.
        </div>
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
              Policy list
            </div>
            {JUR_POLICY.map((j) => (
              <div key={j.code} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
                <span style={{ fontSize: 12.5, color: COLORS.ink2, fontFamily: "var(--font-mono), monospace" }}>{j.code}</span>
                <Badge kind={j.kind}>{j.name}</Badge>
              </div>
            ))}
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
