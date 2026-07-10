import { Shell } from "@/app/command-center/_components/shell";
import { loadAuditLog, type BadgeKind } from "@/app/command-center/_data";
import { Card, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

function eventKind(type: string): BadgeKind {
  const t = type.toUpperCase();
  if (t.includes("REJECT") || t.includes("SANCTIONS") || t.includes("DUE_DILIGENCE")) return "bad";
  if (t.includes("LICENCE") || t.includes("DISCLOSURE_REQUEST") || t.includes("HOLD")) return "warn";
  if (t.includes("VERIFIED") || t.includes("ACTIVATED") || t.includes("DELIVERED") || t.includes("CONFIRMED") || t.includes("RECEIVED") || t.includes("APPROVED")) return "ok";
  if (t.includes("RUNNING")) return "info";
  return "subtle";
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const rows = await loadAuditLog(300);

  return (
    <Shell eyebrow="Records" title="Audit log" subtitle="Append-only. No update or delete policy exists." caseParam={caseParam}>
      <Card>
        <div style={{ fontSize: 11.5, color: COLORS.ink3, marginBottom: 12 }}>
          Append-only — rows written by the service role; no update or delete policy exists.
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No audit events yet" hint="Every case mutation appends one immutable row here." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.hairline}` }}>
                    <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                      <Mono>{new Date(r.created_at).toISOString().slice(0, 19).replace("T", " ")}</Mono>
                    </td>
                    <td style={{ padding: "8px" }}>
                      <Badge kind={eventKind(r.event_type)}>{r.event_type}</Badge>
                    </td>
                    <td style={{ padding: "8px", color: COLORS.ink2 }}>{r.detail ?? "—"}</td>
                    <td style={{ padding: "8px" }}>{r.ref ? <Mono>{r.ref}</Mono> : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
