import { Shell } from "@/app/command-center/_components/shell";
import { loadCases, loadAuditLog, STATUS_META } from "@/app/command-center/_data";
import { Card, CardTitle, COLORS, Badge, EmptyState, StatCard, Label, Mono } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

function attentionNote(status: string): string {
  if (status === "intake") return "Needs triage review before a decision.";
  if (status === "approval") return "Gate ready — approve to send the payment link.";
  if (status === "approved") return "Approved — awaiting payment to activate the scan.";
  return "";
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const [cases, audit] = await Promise.all([loadCases(), loadAuditLog(5)]);

  const count = (s: string) => cases.filter((c) => c.case.status === s).length;
  const reports = cases.filter((c) => c.case.report_delivered_at).length;
  const attention = cases.filter((c) => ["intake", "approval", "approved"].includes(c.case.status));

  return (
    <Shell eyebrow="Command" title="Overview" subtitle="Live state of the pen-test pipeline." caseParam={caseParam}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <StatCard label="Pending intake" value={count("intake")} href="/command-center/intake" />
        <StatCard label="Awaiting approval" value={count("approval")} accent={COLORS.accent} href="/command-center/approval" />
        <StatCard label="Active scans" value={count("scanning")} accent="#0f9d6b" href="/command-center/cases" />
        <StatCard label="Reports issued" value={reports} href="/command-center/reports" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Card>
          <CardTitle>Needs your attention</CardTitle>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {attention.length === 0 ? (
              <EmptyState title="Nothing waiting on you" hint="New intake requests will surface here." />
            ) : (
              attention.map((c) => {
                const base =
                  c.case.status === "intake"
                    ? "/command-center/intake"
                    : c.case.status === "approval"
                      ? "/command-center/approval"
                      : "/command-center/cases";
                return (
                  <a
                    key={c.case.id}
                    href={`${base}?case=${c.case.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: COLORS.inset,
                      textDecoration: "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>
                        {c.req?.company ?? c.req?.full_name ?? "Unknown requestor"}
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.ink3 }}>{attentionNote(c.case.status)}</div>
                    </div>
                    <Badge kind={STATUS_META[c.case.status].kind}>{STATUS_META[c.case.status].label}</Badge>
                  </a>
                );
              })
            )}
          </div>
        </Card>

        <Card style={{ background: COLORS.darkCard, color: "#fff", border: "none" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Activation gate — this week</div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "#c9c6de" }}>
            <GateStat label="Ownership proofs verified" value={`0 of ${cases.length}`} />
            <GateStat label="Sanctions auto-rejections" value={String(cases.filter((c) => c.case.rejection_reason?.toLowerCase().includes("sanction")).length)} />
            <GateStat label="Licence-required holds" value="0" />
            <GateStat label="Due-diligence holds (geo mismatch)" value="0" />
            <GateStat label="Disclosure proofs on file" value={`${cases.filter((c) => c.case.disclosure_state === "informed").length} of ${cases.filter((c) => c.case.subscribed).length}`} />
          </div>
          <div style={{ marginTop: 12, fontSize: 11.5, color: "#8f8caf" }}>
            No bypass parameter exists. Every scan clears the gate or does not run.
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle>Recent audit trail</CardTitle>
          <a href="/command-center/audit" style={{ fontSize: 12, color: COLORS.accent, textDecoration: "none" }}>
            View all
          </a>
        </div>
        <div style={{ marginTop: 10 }}>
          {audit.length === 0 ? (
            <EmptyState title="No audit events yet" hint="Every case mutation is appended here." />
          ) : (
            audit.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "5px 0", fontSize: 12.5 }}>
                <Mono>{new Date(a.created_at).toISOString().slice(0, 16).replace("T", " ")}</Mono>
                <span style={{ color: COLORS.ink2 }}>
                  {a.event_type}
                  {a.detail ? ` · ${a.detail}` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </Shell>
  );
}

function GateStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{label}</span>
      <span style={{ color: "#fff", fontWeight: 700 }}>{value}</span>
    </div>
  );
}
