import { Shell } from "@/app/command-center/_components/shell";
import { loadCases, tierKind, STATUS_META, gateRowsFor } from "@/app/command-center/_data";
import { Card, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";
import { ApproveForm } from "@/app/command-center/_components/action-forms";
import { RejectButton } from "@/app/command-center/_components/reject-button";

export const dynamic = "force-dynamic";

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const cases = await loadCases();
  const queue = cases.filter((c) => c.case.status === "approval");

  return (
    <Shell eyebrow="Pipeline" title="Approval queue" subtitle="Reviewed before pay — approve to send the payment link." caseParam={caseParam}>
      <Card style={{ marginBottom: 14, background: COLORS.accentBg, border: `1px solid ${COLORS.accent}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent }}>
          Every request is reviewed before payment. No self-serve scans.
        </div>
      </Card>

      {queue.length === 0 ? (
        <EmptyState title="Approval queue clear." hint="Triaged requests ready for a decision land here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {queue.map((c) => {
            const gate = gateRowsFor(c);
            return (
              <Card key={c.case.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink }}>
                      {c.req?.company ?? c.req?.full_name ?? "Unknown"}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Mono>{c.req?.target_url ?? "—"}</Mono>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge kind={tierKind(c.case.tier)}>{c.case.tier ?? "Normal"}</Badge>
                    <Badge kind={STATUS_META[c.case.status].kind}>{STATUS_META[c.case.status].label}</Badge>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0" }}>
                  {gate.map((g) => (
                    <Badge key={g.label} kind={g.kind}>
                      {g.label}: {g.value}
                    </Badge>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <ApproveForm caseId={c.case.id} />
                  <RejectButton caseId={c.case.id} />
                  <a href={`/command-center/approval?case=${c.case.id}`} style={{ fontSize: 12.5, color: COLORS.accent, textDecoration: "none" }}>
                    Review details →
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
