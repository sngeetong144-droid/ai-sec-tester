import { Shell } from "@/app/command-center/_components/shell";
import { loadCases, loadUningestedRequests, tierKind, deriveJur } from "@/app/command-center/_data";
import { Card, CardTitle, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";
import { IngestForm } from "@/app/command-center/_components/action-forms";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const [cases, uningested] = await Promise.all([loadCases(), loadUningestedRequests()]);
  const intakeCases = cases.filter((c) => c.case.status === "intake");

  return (
    <Shell eyebrow="Pipeline" title="Intake queue" subtitle="New scan-request submissions awaiting triage." caseParam={caseParam}>
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: 100, background: "#0f9d6b" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>Form connected</span>
          <span style={{ fontSize: 12, color: COLORS.ink3 }}>webhook · POST /api/scan-request</span>
        </div>
        <Badge kind="subtle">{uningested.length} un-ingested</Badge>
      </Card>

      {uningested.length > 0 && (
        <Card style={{ marginBottom: 14 }}>
          <CardTitle>New submissions — add to the case queue</CardTitle>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {uningested.map((r) => {
              const j = deriveJur(r);
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 12,
                    background: COLORS.inset,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>
                      {r.company ?? r.full_name}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Mono>{r.target_url}</Mono>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <Badge kind={tierKind(r.plan)}>{r.plan ?? "Normal"}</Badge>
                      <Badge kind={j.kind}>{j.label}</Badge>
                    </div>
                  </div>
                  <IngestForm requestId={r.id} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>In triage</CardTitle>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {intakeCases.length === 0 ? (
            <EmptyState title="Intake queue clear" hint="Ingested requests awaiting triage appear here." />
          ) : (
            intakeCases.map((c) => {
              const j = deriveJur(c.req);
              return (
                <a
                  key={c.case.id}
                  href={`/command-center/intake?case=${c.case.id}`}
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
                      {c.req?.company ?? c.req?.full_name ?? "Unknown"}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Mono>{c.req?.target_url ?? "—"}</Mono>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge kind={tierKind(c.case.tier)}>{c.case.tier ?? "Normal"}</Badge>
                    <Badge kind={j.kind}>{j.label}</Badge>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </Card>
    </Shell>
  );
}
