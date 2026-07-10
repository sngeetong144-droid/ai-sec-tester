import { Shell } from "@/app/command-center/_components/shell";
import { loadCases } from "@/app/command-center/_data";
import { Card, CardTitle, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

export default async function ReportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const cases = await loadCases();
  const withReports = cases.filter((c) => c.case.report_delivered_at);

  return (
    <Shell eyebrow="Pipeline" title="Report history" subtitle="Delivered reports and their re-scan tokens." caseParam={caseParam}>
      <Card>
        <CardTitle>Delivered reports</CardTitle>
        <div style={{ marginTop: 12 }}>
          {withReports.length === 0 ? (
            <EmptyState title="No reports delivered yet" hint="Completed scans that were emailed appear here." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: COLORS.ink3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    <th style={{ padding: "6px 8px" }}>Customer / target</th>
                    <th style={{ padding: "6px 8px" }}>Verdict</th>
                    <th style={{ padding: "6px 8px" }}>Delivered</th>
                    <th style={{ padding: "6px 8px" }}>Re-scan token</th>
                  </tr>
                </thead>
                <tbody>
                  {withReports.map((c) => {
                    const verdict = (c.scan?.verdict ?? "pending").toUpperCase();
                    const vk = verdict === "PASS" ? "ok" : verdict === "FAIL" ? "bad" : "warn";
                    return (
                      <tr key={c.case.id} style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
                        <td style={{ padding: "8px" }}>
                          <a href={`/command-center/reports?case=${c.case.id}`} style={{ color: COLORS.ink, textDecoration: "none", fontWeight: 700 }}>
                            {c.req?.company ?? c.req?.full_name ?? "Unknown"}
                          </a>
                          <div><Mono>{c.req?.target_url ?? "—"}</Mono></div>
                        </td>
                        <td style={{ padding: "8px" }}><Badge kind={vk as "ok" | "bad" | "warn"}>{verdict}</Badge></td>
                        <td style={{ padding: "8px", color: COLORS.ink2 }}>
                          {new Date(c.case.report_delivered_at as string).toISOString().slice(0, 10)}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <Badge kind={c.case.rescan_used ? "subtle" : "ok"}>
                            {c.case.rescan_used ? "Redeemed" : "Unused"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </Shell>
  );
}
