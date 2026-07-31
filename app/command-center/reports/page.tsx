import { Shell } from "@/app/command-center/_components/shell";
import { loadCases, loadRecentScans } from "@/app/command-center/_data";
import { Card, CardTitle, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

export default async function ReportHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const [cases, operatorScans] = await Promise.all([loadCases(), loadRecentScans()]);
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
                    <th style={{ padding: "6px 8px" }}>Report</th>
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
                        <td style={{ padding: "8px" }}>
                          {c.req?.report_url ? (
                            <a href={c.req.report_url} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: "none", fontWeight: 700, fontSize: 12.5 }}>
                              PDF →
                            </a>
                          ) : (
                            <Badge kind="subtle">Not generated</Badge>
                          )}
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
      {/* Operator-run scans. Separate query, separate table: these come straight
          off the scans engine table (admin self-scans never create a cc_case), so
          the customer-case section above cannot show them. */}
      <Card style={{ marginTop: 16 }}>
        <CardTitle>Operator scans</CardTitle>
        <div style={{ marginTop: 4, fontSize: 12.5, color: COLORS.ink3 }}>
          Scans you ran yourself from the console. These are not delivered
          customer reports — no case, no customer, nothing emailed.
        </div>
        <div style={{ marginTop: 12 }}>
          {operatorScans.length === 0 ? (
            <EmptyState
              title="No operator scans yet"
              hint="Scans started from the console scan tool appear here."
            />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: COLORS.ink3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    <th style={{ padding: "6px 8px" }}>Target</th>
                    <th style={{ padding: "6px 8px" }}>Run</th>
                    <th style={{ padding: "6px 8px" }}>State</th>
                    <th style={{ padding: "6px 8px" }}>Verdict</th>
                    <th style={{ padding: "6px 8px" }}>Score</th>
                    <th style={{ padding: "6px 8px" }}>Checks</th>
                    <th style={{ padding: "6px 8px" }}>Report</th>
                  </tr>
                </thead>
                <tbody>
                  {operatorScans.map((s) => {
                    const verdict = (s.verdict ?? "pending").toUpperCase();
                    const vk = verdict === "PASS" ? "ok" : verdict === "FAIL" ? "bad" : "warn";
                    const sk =
                      s.status === "complete" ? "ok" : s.status === "failed" ? "bad" : "info";
                    return (
                      <tr key={s.id} style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
                        <td style={{ padding: "8px" }}>
                          <div style={{ color: COLORS.ink, fontWeight: 700 }}>
                            {s.target_label ?? "Unlabelled scan"}
                          </div>
                          <div><Mono>{s.target_url}</Mono></div>
                        </td>
                        <td style={{ padding: "8px", color: COLORS.ink2 }}>
                          {new Date(s.created_at).toISOString().slice(0, 16).replace("T", " ")}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <Badge kind={sk as "ok" | "bad" | "info"}>{s.status.toUpperCase()}</Badge>
                        </td>
                        <td style={{ padding: "8px" }}>
                          <Badge kind={vk as "ok" | "bad" | "warn"}>{verdict}</Badge>
                        </td>
                        <td style={{ padding: "8px", color: COLORS.ink2 }}>
                          {s.score === null ? "—" : s.score}
                        </td>
                        <td style={{ padding: "8px", color: COLORS.ink2 }}>
                          {s.tests_passed}/{s.tests_total}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <a href={`/scans/${s.id}`} style={{ color: COLORS.accent, textDecoration: "none", fontWeight: 700, fontSize: 12.5 }}>
                            Open →
                          </a>
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
