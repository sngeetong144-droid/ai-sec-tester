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
  // A case is subscribed if the console flag OR the intake's submitted
  // subscribed_platform (scan_requests, migration 0006) says so.
  const subscribed = cases.filter((c) => c.case.subscribed || c.req?.subscribed_platform);

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
                    <th style={{ padding: "6px 8px" }}>Disclosure proof</th>
                    <th style={{ padding: "6px 8px" }}>Status</th>
                    <th style={{ padding: "6px 8px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribed.map((c) => {
                    const s = c.case.disclosure_state;
                    // Lifecycle state falls back to the intake's submitted proof:
                    // provider_notified === true means the requestor attested notice.
                    const notified = c.req?.provider_notified === true;
                    const kind = s === "informed" ? "ok" : s === "requested" ? "info" : notified ? "ok" : "warn";
                    const label = s === "informed" ? "On file" : s === "requested" ? "Requested" : notified ? "Attested" : "Awaiting proof";
                    const platform = c.case.platform ?? c.req?.provider_name ?? "—";
                    const proofRef = c.req?.provider_notify_ref;
                    return (
                      <tr key={c.case.id} style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
                        <td style={{ padding: "8px" }}>
                          <div style={{ fontWeight: 700, color: COLORS.ink }}>{c.req?.company ?? c.req?.full_name ?? "Unknown"}</div>
                          <Mono>{c.req?.target_url ?? "—"}</Mono>
                        </td>
                        <td style={{ padding: "8px", color: COLORS.ink2 }}>{platform}</td>
                        <td style={{ padding: "8px", color: COLORS.ink2, fontSize: 12 }}>
                          {notified && proofRef ? (
                            <Mono>{proofRef}</Mono>
                          ) : notified ? (
                            <span style={{ color: "#0f9d6b" }}>Requestor attested notice</span>
                          ) : (
                            <span style={{ color: COLORS.ink3 }}>No proof on file</span>
                          )}
                        </td>
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
