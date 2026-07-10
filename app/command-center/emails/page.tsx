import { Shell } from "@/app/command-center/_components/shell";
import { loadEmailLog } from "@/app/command-center/_data";
import { EMAIL_TEMPLATES, FROM_ADDRESS, type EmailKind } from "@/app/command-center/_email";
import { Card, CardTitle, COLORS, Badge, EmptyState, Mono, QueuedTag } from "@/app/command-center/_ui";

export const dynamic = "force-dynamic";

const PREVIEWS: Record<EmailKind, { to: string; body: string }> = {
  approval: {
    to: "{{name}} <{{email}}>",
    body:
      "Hi {{name}},\n\nYour AI chatbot security test for {{company}} ({{url}}) is approved.\n\nPlan: {{tier}}\nPay to activate the scan: {{payLink}}\n\nReference: {{ref}}",
  },
  reject: {
    to: "{{name}} <{{email}}>",
    body:
      "Hi {{name}},\n\nAbout your AI security test request for {{company}} ({{url}}):\n\n{{reason}}\n\nReference: {{ref}}",
  },
  report: {
    to: "{{name}} <{{email}}>",
    body:
      "Hi {{name}},\n\nYour AI security test for {{url}} is complete.\n\nScan: {{scanRef}}\nVerdict: {{verdict}} ({{passed}} of 5 checks passed)\n\nOne free re-scan for 30 days: {{rescanToken}}\n\nReference: {{ref}}",
  },
  disclosure: {
    to: "{{name}} <{{email}}>",
    body:
      "Hi {{name}},\n\nYour target {{url}} runs on {{platform}}. Before we can test, you must notify {{platform}} and forward their acknowledgement.\n\nNo scan activates until {{platform}} is informed.\n\nReference: {{ref}}",
  },
};

function highlight(text: string) {
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
    part.startsWith("{{") ? (
      <span
        key={i}
        style={{
          background: COLORS.accentBg,
          color: COLORS.accent,
          borderRadius: 4,
          padding: "0 3px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 12,
        }}
      >
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string; tpl?: string }>;
}) {
  const { case: caseParam, tpl } = await searchParams;
  const sel = (["approval", "reject", "report", "disclosure"].includes(tpl ?? "") ? tpl : "approval") as EmailKind;
  const t = EMAIL_TEMPLATES[sel];
  const preview = PREVIEWS[sel];
  const log = await loadEmailLog(20);

  return (
    <Shell eyebrow="Configuration" title="Email automations" subtitle="Every template. Composed and queued — never auto-sent." caseParam={caseParam}>
      <Card style={{ marginBottom: 14, background: COLORS.accentBg, border: `1px solid ${COLORS.accent}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent }}>
          Outbound send is a Creator-gated action. The console composes and queues only.
        </div>
        <QueuedTag />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(Object.keys(EMAIL_TEMPLATES) as EmailKind[]).map((k) => {
            const tpl2 = EMAIL_TEMPLATES[k];
            const active = k === sel;
            return (
              <a key={k} href={`/command-center/emails?tpl=${k}`} style={{ textDecoration: "none" }}>
                <Card style={{ padding: 14, border: `1px solid ${active ? COLORS.accent : COLORS.cardBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 100, background: tpl2.color }} />
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.ink }}>{tpl2.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: COLORS.ink3, margin: "6px 0" }}>Trigger · {tpl2.trigger}</div>
                  <Badge kind="ok">Active</Badge>
                </Card>
              </a>
            );
          })}
        </div>

        <Card>
          <div style={{ fontSize: 12, color: COLORS.ink3 }}>
            <div style={{ padding: "3px 0" }}><strong>From</strong> · {FROM_ADDRESS}</div>
            <div style={{ padding: "3px 0" }}><strong>To</strong> · {highlight(preview.to)}</div>
            <div style={{ padding: "3px 0" }}><strong>Subject</strong> · {t.subject}</div>
          </div>
          <div style={{ marginTop: 12, padding: 14, background: COLORS.inset, borderRadius: 12, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: COLORS.ink }}>
            {highlight(preview.body)}
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <CardTitle>Queued emails</CardTitle>
          <QueuedTag />
        </div>
        <div style={{ marginTop: 12 }}>
          {log.length === 0 ? (
            <EmptyState title="No emails queued yet" hint="Approve / reject / deliver / request-disclosure actions queue emails here." />
          ) : (
            log.map((e) => (
              <div key={e.id} style={{ borderTop: `1px solid ${COLORS.hairline}`, padding: "8px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{e.subject}</span>
                  <Badge kind="subtle">{e.kind}</Badge>
                </div>
                <div style={{ fontSize: 12, color: COLORS.ink3, marginTop: 2 }}>
                  → {e.to_email || "—"} · <Mono>{new Date(e.created_at).toISOString().slice(0, 16).replace("T", " ")}</Mono>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </Shell>
  );
}
