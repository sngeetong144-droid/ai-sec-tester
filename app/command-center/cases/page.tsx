import { Shell } from "@/app/command-center/_components/shell";
import { loadCases, CHECKS, STATUS_META } from "@/app/command-center/_data";
import { Card, COLORS, Badge, EmptyState, Mono } from "@/app/command-center/_ui";
import { DeliverForm } from "@/app/command-center/_components/action-forms";

export const dynamic = "force-dynamic";

export default async function ScanCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const { case: caseParam } = await searchParams;
  const cases = await loadCases();
  const active = cases.filter((c) => c.case.status === "scanning" || (c.scan && c.case.status === "complete"));

  return (
    <Shell eyebrow="Pipeline" title="Scan cases" subtitle="Activated cases running the OWASP-LLM checks." caseParam={caseParam}>
      <Card style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 100, background: "#0f9d6b" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.ink }}>Scan engine connected</span>
        <span style={{ fontSize: 12, color: COLORS.ink3 }}>invoked only by an activated, paid case</span>
      </Card>

      {active.length === 0 ? (
        <EmptyState
          title="No active scan cases."
          hint="Approve a request and confirm payment to activate one."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {active.map((c) => {
            const passed = c.scan?.tests_passed ?? 0;
            const total = c.scan?.tests_total ?? 5;
            const done = c.checks.filter((r) => r.status === "pass" || r.status === "fail").length;
            const barColor = c.case.status === "scanning" ? COLORS.accent : c.scan?.verdict === "pass" ? "#0f9d6b" : "#a87d1e";
            return (
              <Card key={c.case.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: COLORS.ink }}>
                      {c.req?.company ?? c.req?.full_name ?? "Unknown"}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <Mono>{c.scan ? `SCN-${c.scan.id.slice(0, 8)}` : "—"} · {c.req?.target_url ?? c.scan?.target_url ?? "—"}</Mono>
                    </div>
                  </div>
                  <Badge kind={STATUS_META[c.case.status].kind}>{STATUS_META[c.case.status].label}</Badge>
                </div>

                <div style={{ margin: "12px 0 8px", fontSize: 12.5, color: COLORS.ink2 }}>
                  {passed}/{total} checks passed
                </div>
                <div style={{ height: 6, borderRadius: 100, background: COLORS.inset2, overflow: "hidden" }}>
                  <div style={{ width: `${(done / 5) * 100}%`, height: "100%", background: barColor }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 12 }}>
                  {CHECKS.map((check, i) => {
                    const row = c.checks[i];
                    const state = row?.status ?? "pending";
                    const kind = state === "pass" ? "ok" : state === "fail" ? "bad" : state === "running" ? "info" : "subtle";
                    const label = state === "pass" ? "Pass" : state === "fail" ? "Fail" : state === "running" ? "Running…" : "Queued";
                    return (
                      <div key={i} style={{ background: COLORS.inset, borderRadius: 10, padding: 10 }}>
                        <Mono>{check.key}</Mono>
                        <div style={{ fontSize: 11.5, color: COLORS.ink2, margin: "4px 0 6px", minHeight: 28 }}>{check.name}</div>
                        <Badge kind={kind}>{label}</Badge>
                      </div>
                    );
                  })}
                </div>

                {c.case.status === "scanning" && (
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                    <DeliverForm
                      caseId={c.case.id}
                      ready={c.scan?.status === "complete" && (c.checks?.length ?? 0) > 0}
                    />
                    {c.scan?.status === "complete" && (c.checks?.length ?? 0) > 0 && (
                      <span style={{ fontSize: 11.5, color: COLORS.ink3 }}>
                        Finalizes the case and queues the report email.
                      </span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
