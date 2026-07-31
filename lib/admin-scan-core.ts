/**
 * admin-scan-core — the scan body shared by BOTH admin entry points.
 *
 * WHY THIS IS NOT INSIDE app/actions/admin-scan.ts:
 * that module is "use server". EVERY function exported from a "use server"
 * module becomes a server-action endpoint reachable from the public internet.
 * An ungated runScanVariant exported from there would therefore be a session-free
 * way for anyone to make this server scan any target it can reach. Keeping the
 * ungated core in a plain server module means it has exactly two callers, both
 * in this repo, and both authorize BEFORE calling:
 *
 *   1. app/actions/admin-scan.ts        -> gated by isAdminSession()
 *   2. app/api/dev/scan-matrix/route.ts -> gated by the CRON_SECRET bearer token
 *
 * runScanVariant itself performs NO authorization. Everything else — the SSRF
 * guard, mode resolution, endpoint discovery, the engine run, the scans /
 * scan_results persistence and the cc_audit_log write — is identical for both
 * callers, so a matrix run exercises the SAME path the console does rather than
 * a look-alike copy of it.
 *
 * Admin self-scan semantics (unchanged, moved verbatim from admin-scan.ts):
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
 * ponytail: persistence is inlined here (mirrors lib/scan-persistence
 * runEngineAndPersist) rather than reusing it, because that shared helper is on
 * the customer path too and dropping options through it would mean editing a
 * function builder-2's executeScan also calls. Small duplication, zero shared-file
 * churn. Upgrade path: give runEngineAndPersist an options param and reuse it.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensureSessionId } from "@/lib/session";
import {
  assertPublicTarget,
  runScanEngine,
  CORE_INTERACTIVE_KEYS,
} from "@/lib/scan-engine";
import type { ScanTier } from "@/lib/payment-links";
import type { ChatbotEndpointConfig } from "@/lib/real-scan-engine";
import { realScanEnabled } from "@/lib/real-scan-engine";
import {
  discoverChatbotEndpoint,
  describeDiscoveryFailure,
} from "@/lib/chatbot-discovery";

export type AdminScanMode = "passive" | "endpoint" | "website";

export interface ScanVariantInput {
  target: string;
  label?: string | null;
  mode?: AdminScanMode;
  /** Optional JSON body template with a {{prompt}} placeholder. Default: {"message":"{{prompt}}"} */
  bodyTemplate?: string | null;
  /** Optional bearer token for the endpoint. Secret — never persisted or logged. */
  authToken?: string | null;
  /** Test set to run: "basic" = core 5; advanced/enterprise = full OWASP-10 (15). Default "enterprise". */
  tier?: ScanTier;
}

/**
 * Everything a caller needs to judge the run WITHOUT re-reading the DB. The
 * console only wants scanId; the matrix runner asserts on the rest.
 */
export interface ScanVariantResult {
  scanId: string;
  mode: AdminScanMode;
  tier: ScanTier;
  target: string;
  /** The chatbot message endpoint actually probed. null in passive mode. */
  discoveredEndpoint: string | null;
  verdict: "pass" | "warn" | "fail";
  score: number;
  /** Checks that produced a real pass/fail. Not-run checks are excluded (they are not scored). */
  testsRan: number;
  testsPassed: number;
  testsFailed: number;
  notRun: number;
  /** How many of the 5 core interactive OWASP categories stayed not-run. */
  coreNotRun: number;
  /**
   * TRUE only when the LIVE probe suite actually executed against a chatbot
   * endpoint. Deliberately NOT the same as engine.interactive_suite_ran: that
   * flag also goes true when a core check was decided from static front-end
   * evidence (a secret or system prompt visible in the page HTML), which is a
   * real finding but not a probe. A passive scan must have interactiveRan false
   * under every circumstance, so the matrix can assert on it.
   */
  interactiveRan: boolean;
  /** The engine's own flag: a core OWASP category was scored, by probe OR static evidence. */
  coreSuiteScored: boolean;
  /** Whether this deployment had real interactive scanning armed at run time. */
  realScanArmed: boolean;
}

// Admin scans are exempt from the country/jurisdiction gate; SSRF stays on.
export const ADMIN_TARGET_OPTS = { allowRestrictedJurisdiction: true } as const;

/**
 * Append-only audit write. Deliberately swallows its own error: an audit failure
 * must never destroy a completed scan result the operator is waiting for — but it
 * IS logged server-side so a silently broken audit trail is discoverable.
 */
async function appendScanAudit(
  db: ReturnType<typeof createServiceClient>,
  row: { event_type: string; ref: string; detail: string },
): Promise<void> {
  const { error } = await db.from("cc_audit_log").insert({
    case_id: null,
    event_type: row.event_type,
    ref: row.ref,
    detail: row.detail,
  });
  if (error) console.error("[admin-scan] audit write failed:", error.message);
}

/**
 * Run ONE scan variant. NO AUTHORIZATION — the caller owns that (see file header).
 * Writes the normal scans + scan_results + cc_audit_log rows, exactly as a console
 * scan does; the only thing that distinguishes a matrix run is its label.
 */
export async function runScanVariant(input: ScanVariantInput): Promise<ScanVariantResult> {
  const target = String(input?.target ?? "").trim();
  const label = input?.label ? String(input.label).trim().slice(0, 200) : null;
  const bodyTemplate = input?.bodyTemplate?.trim() || null;
  const authToken = input?.authToken?.trim() || null;
  const mode: AdminScanMode = input?.mode ?? "passive";
  const tier: ScanTier = input?.tier ?? "enterprise";

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
      // Plain-language, actionable failure — the reader may not be an engineer.
      throw new Error(describeDiscoveryFailure(disc));
    }
    chatbot = { url: disc.endpoint, bodyTemplate, authToken };
    probedEndpoint = disc.endpoint;
  }

  const realScanArmed = realScanEnabled();

  const modeNote =
    mode === "website"
      ? `Website scan — discovered and probed chatbot endpoint ${probedEndpoint}.`
      : mode === "endpoint"
        ? `Chatbot-endpoint scan — probed ${probedEndpoint}.`
        : "Passive scan (no chatbot endpoint) — transport and secret checks only.";
  const gatedNote =
    chatbot && !realScanArmed
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
    const engine = await runScanEngine(target, { chatbot, tier, ...ADMIN_TARGET_OPTS });

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
      // Remediation is persisted for EVERY result, not just failures: a passing
      // check still carries hardening guidance, and advisory checks carry the
      // only guidance they will ever have. The report groups it (lib/report-recommendations).
      remediation: r.remediation ?? null,
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

    // A security product that scans third-party endpoints without recording WHO
    // scanned WHAT and WHEN has no defensible answer to "were you authorized?".
    // Admin self-scans previously wrote nothing here, so the audit log stopped
    // dead while scans kept running. Append-only; never blocks the scan result.
    await appendScanAudit(db, {
      event_type: "ADMIN_SCAN_COMPLETED",
      ref: scanId,
      detail:
        `mode=${mode} tier=${tier ?? "basic"} target=${target} ` +
        `verdict=${engine.verdict} score=${engine.score} ` +
        `ran=${engine.tests_passed}/${engine.tests_total}`,
    });

    const coreNotRun = engine.results.filter(
      (r) => CORE_INTERACTIVE_KEYS.has(r.key) && r.status === "not_run",
    ).length;

    return {
      scanId,
      mode,
      tier,
      target,
      discoveredEndpoint: probedEndpoint,
      verdict: engine.verdict,
      score: engine.score,
      testsRan: engine.tests_total,
      testsPassed: engine.tests_passed,
      testsFailed: engine.tests_total - engine.tests_passed,
      notRun: engine.results.length - engine.tests_total,
      coreNotRun,
      // Structurally false in passive mode (chatbot is null there), and false on
      // any deployment where real scanning is not armed — see the field doc.
      interactiveRan:
        Boolean(chatbot) && realScanArmed && engine.interactive_suite_ran === true,
      coreSuiteScored: engine.interactive_suite_ran === true,
      realScanArmed,
    };
  } catch (err) {
    await db
      .from("scans")
      .update({ status: "failed", summary: `${modeNote} ${String(err)}`.trim() })
      .eq("id", scanId);
    await appendScanAudit(db, {
      event_type: "ADMIN_SCAN_FAILED",
      ref: scanId,
      detail: `mode=${mode} target=${target} error=${String(err).slice(0, 300)}`,
    });
    throw err;
  }
}