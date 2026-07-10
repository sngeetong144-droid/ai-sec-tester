import { Shell } from "@/app/command-center/_components/shell";
import { loadCases } from "@/app/command-center/_data";
import { Card, CardTitle, COLORS, Badge } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

export default async function WorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const cases = await loadCases();
  const c = (s: string) => cases.filter((x) => x.case.status === s).length;

  const stages = [
    { title: "Landing + form", note: "scan.thesoulsofai.com", count: cases.length },
    { title: "Intake / triage", note: "auto-scored", count: c("intake") },
    { title: "Gate & jurisdiction", note: "ownership · SSRF · sanctions", count: cases.filter((x) => x.case.status === "intake" || x.case.status === "approval").length },
    { title: "Decision", note: "approve / reject", count: c("approval") },
    { title: "Payment", note: "Scalendo link", count: cases.filter((x) => x.case.status === "approved" && !x.case.paid).length },
    { title: "Scan (24h)", note: "5 LLM checks", count: c("scanning") },
    { title: "Report", note: "PDF + email", count: cases.filter((x) => x.case.report_delivered_at).length },
  ];

  const integrations = [
    { name: "Intake form", sub: "scan.thesoulsofai.com", status: "Connected", kind: "ok" as const },
    { name: "Scan engine", sub: `${c("scanning")} running`, status: "Ready", kind: "ok" as const },
    { name: "Payments", sub: "Scalendo → Stripe", status: "Link-based", kind: "ok" as const },
    { name: "Email delivery", sub: "Amazon SES", status: "Queued only", kind: "warn" as const },
    { name: "Jurisdiction feed", sub: "Sanctions + licensing", status: "Static v1", kind: "warn" as const },
    { name: "Admin auth", sub: "Login + MFA", status: "Build mode", kind: "warn" as const },
  ];

  return (
    <Shell eyebrow="Monitor" title="Workflow pipeline" subtitle="End-to-end request flow and live connections." caseParam={caseParam}>
      <Card>
        <CardTitle>End-to-end request flow</CardTitle>
        <div style={{ marginTop: 14, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {stages.map((s, i) => (
            <div key={s.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 132, flexShrink: 0, background: COLORS.inset, borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{s.title}</div>
                <div style={{ fontSize: 11, color: COLORS.ink3, marginTop: 2 }}>{s.note}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, marginTop: 8, fontFamily: "var(--font-head)" }}>{s.count}</div>
              </div>
              {i < stages.length - 1 && <span style={{ color: COLORS.faint }}>→</span>}
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle>Integrations — live connections</CardTitle>
          <Badge kind="info">Single source</Badge>
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {integrations.map((it) => (
            <div key={it.name} style={{ background: COLORS.inset, borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{it.name}</div>
              <div style={{ fontSize: 11.5, color: COLORS.ink3, margin: "2px 0 8px" }}>{it.sub}</div>
              <Badge kind={it.kind}>{it.status}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card style={{ borderColor: "rgba(15,157,107,0.3)" }}>
          <Badge kind="ok">Approve path</Badge>
          <div style={{ marginTop: 10, fontSize: 12.5, color: COLORS.ink2, lineHeight: 1.5 }}>
            Triage → gate clears → approve → payment link emailed → payment confirmed → scan activates → report delivered.
          </div>
        </Card>
        <Card style={{ borderColor: "rgba(226,69,61,0.3)" }}>
          <Badge kind="bad">Reject path</Badge>
          <div style={{ marginTop: 10, fontSize: 12.5, color: COLORS.ink2, lineHeight: 1.5 }}>
            Any red gate condition, sanctions hit, or missing authorization → reject with reason → requestor emailed. Re-opens only on new proof.
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 14, background: COLORS.darkCard, border: "none" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>One command center, one source</div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: "#c9c6de", lineHeight: 1.5 }}>
          Intake config, products, payment links, email templates, jurisdiction policy, and every record live here — never on the public site.
        </div>
      </Card>
    </Shell>
  );
}
