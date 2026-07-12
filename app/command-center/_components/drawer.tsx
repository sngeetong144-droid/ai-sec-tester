import { createServiceClient } from "@/lib/supabase/service";
import {
  type CaseView,
  STATUS_META,
  tierKind,
  deriveJur,
  gateRowsFor,
  gateVerdict,
} from "@/app/command-center/_data";
import { Badge, COLORS, Label, Mono } from "@/app/command-center/_ui";
import { DrawerCloseLink } from "@/app/command-center/_components/drawer-close";
import {
  ApproveForm,
  AdvanceForm,
  RunScanForm,
  DeliverForm,
  DisclosureForm,
} from "@/app/command-center/_components/action-forms";
import { RejectButton } from "@/app/command-center/_components/reject-button";
import { ManualActivateButton } from "@/app/command-center/_components/manual-activate-button";
import type { ReactNode } from "react";

/**
 * Detail drawer (PRD DETAIL DRAWER) — 462px right panel over a scrim, rendered by
 * the Shell when ?case=<id> is present. All sections read real joined data; where
 * the data model has no value yet (ownership proof link) it says so honestly
 * rather than faking a "verified" badge.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: "16px 20px", borderTop: `1px solid ${COLORS.hairline}` }}>
      <Label>{title}</Label>
      <div style={{ marginTop: 10 }}>{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "3px 0", fontSize: 13 }}>
      <span style={{ color: COLORS.ink3 }}>{k}</span>
      <span style={{ color: COLORS.ink, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
}

async function loadCaseAudit(caseId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("cc_audit_log")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true });
  return (data as { id: string; created_at: string; event_type: string; detail: string | null }[]) ?? [];
}

export async function Drawer({ view }: { view: CaseView }) {
  const { case: c, req } = view;
  const meta = STATUS_META[c.status];
  const j = deriveJur(req);
  const gate = gateRowsFor(view);
  const verdict = gateVerdict(gate);
  const timeline = await loadCaseAudit(c.id);
  const company = req?.company ?? req?.full_name ?? "Unknown requestor";
  const sevKind = (s: string | undefined) =>
    s === "critical" ? "bad" : s === "warn" ? "warn" : "subtle";

  return (
    <>
      <DrawerCloseLink
        style={{ position: "fixed", inset: 0, background: "rgba(21,19,33,0.32)", zIndex: 40 }}
      >
        <span />
      </DrawerCloseLink>
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 462,
          maxWidth: "100%",
          background: COLORS.surface,
          borderLeft: `1px solid ${COLORS.cardBorder}`,
          zIndex: 41,
          overflowY: "auto",
          boxShadow: "-16px 0 40px rgba(21,19,33,.10)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS.ink }}>{company}</div>
            <div style={{ marginTop: 2 }}>
              <Mono>CASE-{c.id.slice(0, 8)}</Mono>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Badge kind={tierKind(c.tier)}>{c.tier ?? "Normal"}</Badge>
              <Badge kind={meta.kind}>{meta.label}</Badge>
            </div>
          </div>
          <DrawerCloseLink
            style={{
              color: COLORS.ink3,
              fontSize: 20,
              fontWeight: 700,
              textDecoration: "none",
              lineHeight: 1,
            }}
          >
            ✕
          </DrawerCloseLink>
        </div>

        <Section title="Requestor">
          {req ? (
            <>
              <Row k="Name" v={req.full_name} />
              <Row k="Email" v={req.email} />
              {req.company && <Row k="Company" v={req.company} />}
              <Row k="Target" v={<Mono>{req.target_url}</Mono>} />
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: COLORS.ink3 }}>
              No intake record linked to this case.
            </div>
          )}
        </Section>

        <Section title="Jurisdiction engine">
          <div style={{ background: COLORS.inset, borderRadius: 10, padding: 12 }}>
            <Badge kind={j.kind}>{j.label}</Badge>
            <div style={{ marginTop: 8 }}>
              <Mono>{j.geoLine}</Mono>
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: COLORS.ink2 }}>{j.detail}</div>
          </div>
        </Section>

        {(c.subscribed || req?.subscribed_platform) && (
          <Section title="Third-party disclosure">
            <Row k="Platform" v={c.platform ?? req?.provider_name ?? "—"} />
            {req?.provider_notify_ref && <Row k="Notice ref" v={<Mono>{req.provider_notify_ref}</Mono>} />}
            <Row
              k="Requestor attested"
              v={
                <Badge kind={req?.provider_notified ? "ok" : "warn"}>
                  {req?.provider_notified ? "Notified" : "Not attested"}
                </Badge>
              }
            />
            <Row
              k="Status"
              v={
                <Badge
                  kind={
                    c.disclosure_state === "informed"
                      ? "ok"
                      : c.disclosure_state === "requested"
                        ? "info"
                        : "warn"
                  }
                >
                  {c.disclosure_state === "informed"
                    ? "On file"
                    : c.disclosure_state === "requested"
                      ? "Requested"
                      : "Awaiting proof"}
                </Badge>
              }
            />
          </Section>
        )}

        <Section title="Triage">
          {req && req.triage_score !== null ? (
            <>
              <Row
                k="Verdict"
                v={
                  <Badge
                    kind={
                      req.triage_verdict === "low"
                        ? "ok"
                        : req.triage_verdict === "medium"
                          ? "warn"
                          : "bad"
                    }
                  >
                    {(req.triage_verdict ?? "—").toString()} risk · {req.triage_score}/100
                  </Badge>
                }
              />
              {(req.triage_flags ?? []).map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <Badge kind={sevKind(f.sev ?? f.severity)}>
                    {(f.sev ?? f.severity ?? "info").toString().toUpperCase()}
                  </Badge>
                  <span style={{ fontSize: 12.5, color: COLORS.ink2 }}>
                    {f.code ? `${f.code} — ` : ""}
                    {f.msg ?? f.message ?? ""}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: COLORS.ink3 }}>No triage snapshot on record.</div>
          )}
        </Section>

        <Section title="Activation gate">
          {gate.map((g) => (
            <div
              key={g.label}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}
            >
              <span style={{ fontSize: 12.5, color: COLORS.ink2 }}>{g.label}</span>
              <Badge kind={g.kind}>{g.value}</Badge>
            </div>
          ))}
          <div
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              background: COLORS.inset,
              fontSize: 12.5,
              fontWeight: 700,
              color: verdict.kind === "bad" ? "#e2453d" : verdict.kind === "ok" ? "#0f9d6b" : "#a87d1e",
            }}
          >
            {verdict.text}
          </div>
        </Section>

        <Section title="Ownership verification">
          {/* ponytail: ownership_tokens aren't linked to a case yet — honest "not linked". */}
          <div style={{ fontSize: 12.5, color: COLORS.ink3 }}>
            No verified ownership proof is linked to this case. Ownership must be proven via DNS TXT,
            a /.well-known file, or an HTML meta tag before activation.
          </div>
        </Section>

        <Section title="Consent & agreement">
          {req ? (
            <>
              <Badge kind={req.due_diligence_consent ? "ok" : "bad"}>
                {req.due_diligence_consent ? "Signed" : "Missing"}
              </Badge>
              <div style={{ marginTop: 8, fontSize: 12, color: COLORS.ink3 }}>
                {req.user_agent && <div>UA: {req.user_agent}</div>}
                {req.ip_country && <div>IP country: {req.ip_country}</div>}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: COLORS.ink3 }}>No consent record.</div>
          )}
        </Section>

        <Section title="Timeline">
          {timeline.length === 0 ? (
            <div style={{ fontSize: 12.5, color: COLORS.ink3 }}>No events yet.</div>
          ) : (
            timeline.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: 10, padding: "3px 0", fontSize: 12.5 }}>
                <Mono>{new Date(t.created_at).toISOString().slice(0, 16).replace("T", " ")}</Mono>
                <span style={{ color: COLORS.ink2 }}>
                  {t.event_type}
                  {t.detail ? ` · ${t.detail}` : ""}
                </span>
              </div>
            ))
          )}
        </Section>

        {/* Contextual footer actions */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: `1px solid ${COLORS.cardBorder}`,
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {c.status === "approval" && (
            <>
              <ApproveForm caseId={c.id} />
              <RejectButton caseId={c.id} />
            </>
          )}
          {c.status === "intake" && (
            <>
              <AdvanceForm caseId={c.id} />
              <RejectButton caseId={c.id} />
              {(c.subscribed || req?.subscribed_platform) && c.disclosure_state !== "informed" && <DisclosureForm caseId={c.id} />}
            </>
          )}
          {c.status === "approved" && (
            <>
              {/* Marks the case paid AND runs the scan end-to-end. This is the
                  reliable path when the payment webhook never fired (external
                  FastPayDirect links) — admin confirms out-of-band payment. */}
              <ManualActivateButton caseId={c.id} />
            </>
          )}
          {c.status === "scanning" && (
            <>
              {view.scan?.status !== "complete" && <RunScanForm caseId={c.id} />}
              <DeliverForm caseId={c.id} />
            </>
          )}
          {c.status === "complete" && (
            <span style={{ fontSize: 12.5, color: "#0f9d6b", fontWeight: 700 }}>Report delivered</span>
          )}
          {c.status === "rejected" && (
            <span style={{ fontSize: 12.5, color: COLORS.ink3, fontWeight: 700 }}>Request closed</span>
          )}
        </div>
      </aside>
    </>
  );
}
