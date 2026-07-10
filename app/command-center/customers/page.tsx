import { Shell } from "@/app/command-center/_components/shell";
import { loadCases, tierKind, STATUS_META } from "@/app/command-center/_data";
import { Card, COLORS, Badge, EmptyState } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const cases = await loadCases();

  return (
    <Shell eyebrow="Records" title="Customers & tests" subtitle="Every requestor and the state of their tests." caseParam={caseParam}>
      {cases.length === 0 ? (
        <EmptyState title="No customers yet" hint="Ingested intake requests become customer records here." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {cases.map((c) => {
            const company = c.req?.company ?? c.req?.full_name ?? "Unknown";
            const testsRun = c.scan ? 5 : 0;
            const reportsIssued = c.case.rescan_used ? 2 : c.case.report_delivered_at ? 1 : 0;
            return (
              <a key={c.case.id} href={`/command-center/customers?case=${c.case.id}`} style={{ textDecoration: "none" }}>
                <Card>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: COLORS.accentBg,
                        color: COLORS.accent,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 18,
                        fontFamily: "var(--font-head)",
                      }}
                    >
                      {company[0]?.toUpperCase() ?? "?"}
                    </span>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: COLORS.ink }}>{company}</div>
                      <div style={{ fontSize: 12, color: COLORS.ink3 }}>
                        {c.req?.full_name ?? "—"} · {c.req?.country_declared ?? "—"}
                      </div>
                    </div>
                    <span style={{ marginLeft: "auto" }}>
                      <Badge kind={tierKind(c.case.tier)}>{c.case.tier ?? "Normal"}</Badge>
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: COLORS.ink3 }}>
                    <span>{testsRun} tests run</span>
                    <span>{reportsIssued} reports</span>
                    <Badge kind={STATUS_META[c.case.status].kind}>{STATUS_META[c.case.status].label}</Badge>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
