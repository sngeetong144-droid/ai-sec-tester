import { Shell } from "@/app/command-center/_components/shell";
import { Card, CardTitle, COLORS, Badge } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

const CARDS: { title: string; status: string; kind: "warn" | "ok"; body: string }[] = [
  {
    title: "Admin login + MFA",
    status: "Before prod",
    kind: "warn",
    body: "Email + password then TOTP each sign-in, WebAuthn passkey, single owner (scoped operators later), step-up re-auth on approve / reject / export.",
  },
  {
    title: "Session security",
    status: "Before prod",
    kind: "warn",
    body: "Short-lived signed httpOnly SameSite=strict cookies. Idle 30 min / absolute 12 h. Fresh-auth on sensitive actions.",
  },
  {
    title: "Console isolation",
    status: "Enforced",
    kind: "ok",
    body: "No public route (private host / VPN / IP allowlist). robots noindex, never linked from the public site, excluded from scan target scope, separate origin from scan.thesoulsofai.com.",
  },
  {
    title: "Data protection",
    status: "Enforced",
    kind: "ok",
    body: "Encrypted at rest + signed expiring report URLs. Append-only audit — no update or delete. Records retained per policy. No secrets / CHD (targets are chatbots only).",
  },
];

const RETAINED = [
  "Client & requestor identity",
  "Signed ownership authorization",
  "Consent & declaration (IP, UA, timestamp)",
  "Third-party disclosure proof",
  "Scan results & per-check evidence",
  "Delivered report + re-scan token",
];

export default async function SecurityPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;

  return (
    <Shell eyebrow="Configuration" title="Access & security" subtitle="How the console is locked down before production." caseParam={caseParam}>
      <Card style={{ marginBottom: 14, background: "rgba(226,69,61,0.08)", border: "1px solid rgba(226,69,61,0.35)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2453d" }}>
          Build mode — access is currently open. Admin login + MFA lands last, immediately before production.
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {CARDS.map((c) => (
          <Card key={c.title}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle>{c.title}</CardTitle>
              <Badge kind={c.kind}>{c.status}</Badge>
            </div>
            <div style={{ marginTop: 8, fontSize: 12.5, color: COLORS.ink2, lineHeight: 1.5 }}>{c.body}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14 }}>
        <CardTitle>Records retained</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 12 }}>
          {RETAINED.map((r) => (
            <div key={r} style={{ fontSize: 12.5, color: COLORS.ink2, display: "flex", gap: 6 }}>
              <span style={{ color: "#0f9d6b" }}>✓</span> {r}
            </div>
          ))}
        </div>
      </Card>
    </Shell>
  );
}
