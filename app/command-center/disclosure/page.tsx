import { Shell } from "@/app/command-center/_components/shell";
import { loadCases } from "@/app/command-center/_data";
import { Card, CardTitle, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";
import { DisclosureForm } from "@/app/command-center/_components/action-forms";

export const dynamic = "force-dynamic";

export default async function DisclosurePage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const cases = await loadCases();
  const subscribed = cases.filter((c) => c.case.subscribed);

  return (
    <Shell eyebrow="Records" title="Disclosure records" subtitle="Subscribed targets need provider-notice proof before any scan." caseParam={caseParam}>
      <Card style={{ marginBottom: 14, background: "rgba(201,154,46,0.10)", border: "1px solid rgba(201,154,46,0.35)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#a87d1e" }}>
          No scan activates on a subscribed platform until the provider has been notified and proof is on file.
        </div>
      </Card>

      <Card>
        <CardTitle>Subscribed targets</CardTitle>
        <div style={{ marginTop: 12 }}>
          {subscribed.length === 0 ? (
            <EmptyState title="No subscribed targets" hint="Cases flagged as running on a subscribed provider appear here." />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: COLORS.ink3, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    <th style={{ padding: "6px 8px" }}>Customer / target</th>
                    <th style={{ padding: "6px 8px" }}>Platform</th>
                    <th style={{ padding: "6px 8px" }}>Status</th>
                    <th style={{ padding: "6px 8px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribed.map((c) => {
                    const s = c.case.disclosure_state;
                    const kind = s === "informed" ? "ok" : s === "requested" ? "info" : "warn";
                    const label = s === "informed" ? "On file" : s === "requested" ? "Requested" : "Awaiting proof";
                    return (
                      <tr key={c.case.id} style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
                        <td style={{ padding: "8px" }}>
                          <div style={{ fontWeight: 700, color: COLORS.ink }}>{c.req?.company ?? "Unknown"}</div>
                          <Mono>{c.req?.target_url ?? "—"}</Mono>
                        </td>
                        <td style={{ padding: "8px", color: COLORS.ink2 }}>{c.case.platform ?? "—"}</td>
                        <td style={{ padding: "8px" }}><Badge kind={kind}>{label}</Badge></td>
                        <td style={{ padding: "8px" }}>
                          {s === "informed" ? (
                            <span style={{ color: "#0f9d6b", fontWeight: 700, fontSize: 12.5 }}>On file ✓</span>
                          ) : (
                            <DisclosureForm caseId={c.case.id} />
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
    </Shell>
  );
}
