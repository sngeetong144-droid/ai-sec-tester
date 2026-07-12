"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureSessionId } from "@/lib/session";
import { assertPublicTarget, runScanEngine } from "@/lib/scan-engine";
import type { ChatbotEndpointConfig } from "@/lib/real-scan-engine";
import { realScanEnabled } from "@/lib/real-scan-engine";
import { discoverChatbotEndpoint } from "@/lib/chatbot-discovery";
import {
  isAdminSession,
  decideAdminSelfScan,
  ScanAuthorizationError,
} from "@/lib/command-center/admin";

/**
 * Admin self-scan: an operator scans a public target THEY chose, independent of
 * the customer approve -> pay -> scan flow. It creates an admin-owned scans row
 * and runs the SAME engine (runScanEngine) so results land in /scans/[id].
 *
 * Two things make it distinct from the customer path:
 *   1. UNGATED BY COUNTRY. The operator is the Creator; the SG/MY licence +
 *      sanctions jurisdiction gate is skipped (allowRestrictedJurisdiction). The
 *      SSRF guard is NOT skipped — private/localhost/link-local + per-redirect-hop
 *      re-validation still reject (assertPublicTarget with no allowPrivateTarget).
 *   2. Two input MODES for the chatbot:
 *        - "endpoint": target IS the chatbot message endpoint (probe it directly).
 *        - "website" : target is a page hosting a chatbot; we DISCOVER its message
 *          endpoint and probe that. If nothing is found we FAIL LOUDLY — never a
 *          fake 0/0 clean report.
 *        - "passive" : no chatbot; transport/secret checks only.
 *
 * Deny by default: requires an admin session. Does NOT go through
 * decideScanAuthorization, so the customer paid-case gate is untouched.
 *
 * ponytail: persistence is inlined here (mirrors lib/scan-persistence
 * runEngineAndPersist) rather than reusing it, because that shared helper is on
 * the customer path too and dropping options through it would mean editing a
 * function builder-2's executeScan also calls. Small duplication, zero shared-file
 * churn. Upgrade path: give runEngineAndPersist an options param and reuse it.
 */

export type AdminScanMode = "passive" | "endpoint" | "website";

export interface AdminSelfScanInput {
  target: string;
  label?: string;
  /**
   * "endpoint" = target is a chatbot API; "website" = discover the chatbot
   * endpoint on the page; "passive" = transport/secret checks only. Legacy
   * `chatbot: true` maps to "endpoint".
   */
  mode?: AdminScanMode;
  /** @deprecated use mode:"endpoint". */
  chatbot?: boolean;
  /** Optional JSON body template with a {{prompt}} placeholder. Default: {"message":"{{prompt}}"} */
  bodyTemplate?: string;
  /** Optional bearer token for the endpoint. Secret — never persisted or logged. */
  authToken?: string;
}

// Admin scans are exempt from the country/jurisdiction gate; SSRF stays on.
const ADMIN_TARGET_OPTS = { allowRestrictedJurisdiction: true } as const;

export async function runAdminSelfScan(input: AdminSelfScanInput): Promise<string> {
  const target = String(input?.target ?? "").trim();
  const label = input?.label ? String(input.label).trim().slice(0, 200) : null;
  const bodyTemplate = input?.bodyTemplate?.trim() || null;
  const authToken = input?.authToken?.trim() || null;
  const mode: AdminScanMode = input?.mode ?? (input?.chatbot ? "endpoint" : "passive");

  const decision = decideAdminSelfScan({ isAdmin: await isAdminSession() });
  if (!decision.authorized) {
    throw new ScanAuthorizationError(decision.reason);
  }

  // SSRF guard BEFORE any DB/engine work — a rejection produces no row. Country
  // gate skipped; private/localhost/link-local still rejected.
  await assertPublicTarget(target, ADMIN_TARGET_OPTS);

  // Resolve the chatbot endpoint per mode. Website mode discovers it or fails loud.
  let chatbot: ChatbotEndpointConfig | null = null;
  let probedEndpoint: string | null = null;

  if (mode === "endpoint") {
    chatbot = { url: target, bodyTemplate, authToken };
    probedEndpoint = target;
  } else if (mode === "website") {
    const disc = await discoverChatbotEndpoint(target, ADMIN_TARGET_OPTS);
    if (!disc.endpoint) {
      const why = !disc.reachable
        ? "the page could not be fetched"
        : disc.vendor
          ? `a ${disc.vendor} chat widget was detected but its message endpoint could not be extracted from the page source`
          : "no chatbot endpoint or known widget was found on the page";
      throw new Error(
        `No chatbot endpoint discovered on this page — ${why}. Re-run in chatbot-endpoint mode with the widget's message URL.`,
      );
    }
    chatbot = { url: disc.endpoint, bodyTemplate, authToken };
    probedEndpoint = disc.endpoint;
  }

  const modeNote =
    mode === "website"
      ? `Website scan — discovered and probed chatbot endpoint ${probedEndpoint}.`
      : mode === "endpoint"
        ? `Chatbot-endpoint scan — probed ${probedEndpoint}.`
        : "Passive scan (no chatbot endpoint) — transport and secret checks only.";
  const gatedNote =
    chatbot && !realScanEnabled()
      ? " Interactive OWASP-LLM probes are gated OFF (REAL_SCAN_ENABLED / judge API key unset in this environment); interactive tests report Not run rather than a false pass."
      : "";

  const db = createServiceClient();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error: insErr } = await db
    .from("scans")
    .insert({
      target_url: target,
      target_label: label,
      email: null,
      session_id: await ensureSessionId(),
      user_id: user?.id ?? null,
      authorized: true,
      status: "running" as const,
    })
    .select("id")
    .single();
  if (insErr || !created) {
    throw new Error(insErr?.message ?? "Could not create scan.");
  }
  const scanId = created.id as string;

  // Run + persist inline (see ponytail note above). allowRestrictedJurisdiction
  // propagates through probeTarget and every probe re-check inside the engine.
  try {
    const engine = await runScanEngine(target, { chatbot, ...ADMIN_TARGET_OPTS });

    const rows = engine.results.map((r) => ({
      scan_id: scanId,
      test_key: r.key,
      test_name: r.name,
      category: r.category,
      severity: r.severity,
      // DB CHECK allows pending|running|pass|fail only; persist honest "not_run"
      // as "pending" (evidence carries the explanation), matching scan-persistence.
      status: r.status === "not_run" ? "pending" : r.status,
      detail: r.detail,
      evidence: r.evidence,
      remediation: r.status === "fail" ? r.remediation : null,
      sort_order: r.sort_order,
    }));
    const { error: resErr } = await db.from("scan_results").insert(rows);
    if (resErr) throw new Error(resErr.message);

    const { error: updErr } = await db
      .from("scans")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        score: engine.score,
        tests_total: engine.tests_total,
        tests_passed: engine.tests_passed,
        verdict: engine.verdict,
        summary: `${modeNote}${gatedNote} ${engine.summary}`.trim(),
      })
      .eq("id", scanId);
    if (updErr) throw new Error(updErr.message);
  } catch (err) {
    await db
      .from("scans")
      .update({ status: "failed", summary: `${modeNote} ${String(err)}`.trim() })
      .eq("id", scanId);
    throw err;
  }

  return scanId;
}
