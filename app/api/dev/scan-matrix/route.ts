import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  runScanVariant,
  ADMIN_TARGET_OPTS,
  type AdminScanMode,
  type ScanVariantResult,
} from "@/lib/admin-scan-core";
import { assertPublicTarget } from "@/lib/scan-engine";
import type { ScanTier } from "@/lib/payment-links";

/**
 * POST /api/dev/scan-matrix — run the 3 modes x 3 tiers scan matrix server-side.
 *
 * WHY IT EXISTS: runAdminSelfScan is a server action behind an admin SESSION, so
 * no headless script can drive it and "every scan variant works" was untestable
 * except by nine manual clicks. This route drives the SAME core (runScanVariant)
 * the console drives, so a green matrix is evidence about the product, not about
 * a test-only reimplementation of it.
 *
 * AUTHORIZATION FOR THIS ROUTE IS THE BEARER SECRET, NOT AN ADMIN SESSION.
 * `Authorization: Bearer <CRON_SECRET>`, constant-time compared. The admin
 * session check is NOT removed — it still guards app/actions/admin-scan.ts,
 * which is the only path a browser can reach. This route is a second, separately
 * gated door to the same room. A query-string secret is never accepted: it would
 * land in access logs, proxy logs and browser history.
 *
 * If CRON_SECRET is unset the route runs NOTHING and returns 503. Failing open on
 * a missing secret would make this an unauthenticated scan-anything endpoint.
 *
 * COST + TIME SAFETY. Each non-passive cell fires ~30 live probes and up to ~30
 * LLM judge calls. Therefore:
 *   - cells run STRICTLY SEQUENTIALLY (never in parallel),
 *   - the plan is hard-capped at 9 cells,
 *   - `dryRun: true` resolves auth, targets and modes and returns the plan
 *     WITHOUT sending a single probe or judge call,
 *   - an overall time budget is enforced BETWEEN cells; once it is spent the
 *     remaining cells are returned as SKIPPED-BUDGET rather than silently
 *     dropped, and the response is still a complete, honest partial result.
 *
 * Runs are NOT special-cased in persistence: every cell writes the normal scans,
 * scan_results and cc_audit_log rows a console scan writes. They are identifiable
 * only by their label, `matrix:<mode>/<tier>`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Cells run inside this request. Vercel caps this per plan; the time budget below
// is what actually stops the run, and it defaults BELOW this so we return JSON
// rather than getting killed mid-cell.
export const maxDuration = 300;

const ALL_MODES: readonly AdminScanMode[] = ["passive", "endpoint", "website"];
const ALL_TIERS: readonly ScanTier[] = ["basic", "advanced", "enterprise"];
const MAX_CELLS = 9;
const DEFAULT_BUDGET_MS = 240_000;
const MAX_BUDGET_MS = 280_000;

type CellStatus = "OK" | "ERROR" | "PLANNED" | "SKIPPED-BUDGET";

interface Cell {
  mode: AdminScanMode;
  tier: ScanTier;
  label: string;
  target: string;
  status: CellStatus;
  ok: boolean;
  scanId: string | null;
  verdict: string | null;
  score: number | null;
  testsRan: number | null;
  testsPassed: number | null;
  testsFailed: number | null;
  notRun: number | null;
  coreNotRun: number | null;
  interactiveRan: boolean | null;
  coreSuiteScored: boolean | null;
  realScanArmed: boolean | null;
  discoveredEndpoint: string | null;
  elapsedMs: number | null;
  error: string | null;
}

/**
 * Constant-time bearer comparison. The repo's own timing-safe compare
 * (lib/hmac verify) is bound to HMAC hex digests of the approval secret and
 * cannot be reused for an arbitrary bearer string, so this uses the same
 * primitive directly. Length is checked first because timingSafeEqual THROWS on
 * a length mismatch — that throw is caught, so a wrong-length secret is a plain
 * false, not a 500 that tells the caller their guess was the wrong length.
 */
function bearerMatches(presented: string | null, expected: string): boolean {
  if (!presented) return false;
  const a = Buffer.from(presented, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/+$/, "");
}

function pick<T extends string>(
  requested: unknown,
  allowed: readonly T[],
  fallback: readonly T[],
): { values: T[]; rejected: string[] } {
  if (!Array.isArray(requested) || requested.length === 0) {
    return { values: [...fallback], rejected: [] };
  }
  const values: T[] = [];
  const rejected: string[] = [];
  for (const raw of requested) {
    const v = String(raw).trim().toLowerCase();
    if ((allowed as readonly string[]).includes(v)) {
      if (!values.includes(v as T)) values.push(v as T);
    } else {
      rejected.push(String(raw));
    }
  }
  return { values, rejected };
}

function blankCell(
  mode: AdminScanMode,
  tier: ScanTier,
  target: string,
  status: CellStatus,
): Cell {
  return {
    mode,
    tier,
    label: `matrix:${mode}/${tier}`,
    target,
    status,
    ok: false,
    scanId: null,
    verdict: null,
    score: null,
    testsRan: null,
    testsPassed: null,
    testsFailed: null,
    notRun: null,
    coreNotRun: null,
    interactiveRan: null,
    coreSuiteScored: null,
    realScanArmed: null,
    discoveredEndpoint: null,
    elapsedMs: null,
    error: null,
  };
}

function fillFromResult(cell: Cell, r: ScanVariantResult, elapsedMs: number): Cell {
  return {
    ...cell,
    status: "OK",
    ok: true,
    scanId: r.scanId,
    verdict: r.verdict,
    score: r.score,
    testsRan: r.testsRan,
    testsPassed: r.testsPassed,
    testsFailed: r.testsFailed,
    notRun: r.notRun,
    coreNotRun: r.coreNotRun,
    interactiveRan: r.interactiveRan,
    coreSuiteScored: r.coreSuiteScored,
    realScanArmed: r.realScanArmed,
    discoveredEndpoint: r.discoveredEndpoint,
    elapsedMs,
    error: null,
  };
}

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Run NOTHING. An unset secret must never mean "no check required".
    return NextResponse.json(
      {
        ok: false,
        error:
          "CRON_SECRET is not configured on this deployment, so this route cannot authenticate anyone. No cells were run.",
      },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  const presented = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!bearerMatches(presented, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await request.text();
    if (raw.trim()) body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  const base = appBase();
  if (!base) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "NEXT_PUBLIC_APP_URL is not set, so the default scan targets cannot be resolved. Set it, or pass explicit targets in the body.",
      },
      { status: 503 },
    );
  }

  const dryRun = body.dryRun === true;
  const endpointTarget =
    String(body.endpointTarget ?? "").trim() || `${base}/api/test-target/weak`;
  const websiteTarget = String(body.websiteTarget ?? "").trim() || base;
  const passiveTarget = String(body.passiveTarget ?? "").trim() || base;

  const modes = pick<AdminScanMode>(body.modes, ALL_MODES, ALL_MODES);
  const tiers = pick<ScanTier>(body.tiers, ALL_TIERS, ALL_TIERS);
  if (modes.values.length === 0 || tiers.values.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: `no valid modes/tiers requested. modes must be from [${ALL_MODES.join(", ")}], tiers from [${ALL_TIERS.join(", ")}].`,
        rejected: { modes: modes.rejected, tiers: tiers.rejected },
      },
      { status: 400 },
    );
  }

  const rawBudget = Number(body.budgetMs);
  const budgetMs =
    Number.isFinite(rawBudget) && rawBudget > 0
      ? Math.min(rawBudget, MAX_BUDGET_MS)
      : DEFAULT_BUDGET_MS;

  const targetFor = (mode: AdminScanMode): string =>
    mode === "endpoint" ? endpointTarget : mode === "website" ? websiteTarget : passiveTarget;

  // Build the plan. Hard cap at 9 — the matrix is 3x3 by definition and a body
  // that somehow asked for more must not turn into unbounded paid work.
  const plan: Cell[] = [];
  for (const mode of modes.values) {
    for (const tier of tiers.values) {
      if (plan.length >= MAX_CELLS) break;
      plan.push(blankCell(mode, tier, targetFor(mode), dryRun ? "PLANNED" : "SKIPPED-BUDGET"));
    }
  }

  const startedAt = Date.now();

  // Target validation runs for BOTH modes of operation. In a dry run it is the
  // whole point (prove the targets are scannable before paying for probes); in a
  // real run it is a cheap pre-flight that fails the cell before any LLM spend.
  const validated = new Map<string, string | null>();
  for (const cell of plan) {
    if (!validated.has(cell.target)) {
      try {
        await assertPublicTarget(cell.target, ADMIN_TARGET_OPTS);
        validated.set(cell.target, null);
      } catch (err) {
        validated.set(cell.target, err instanceof Error ? err.message : String(err));
      }
    }
    const problem = validated.get(cell.target) ?? null;
    if (problem) {
      cell.status = "ERROR";
      cell.error = problem;
    }
  }

  if (dryRun) {
    // NOTE: website-mode endpoint DISCOVERY is deliberately NOT exercised here.
    // It fetches the target page and its script bundles; that is target-side
    // traffic, and a dry run promises none. discoveredEndpoint stays null and a
    // dry run therefore proves nothing about discovery — only the real run does.
    return NextResponse.json({
      ok: plan.every((c) => c.status === "PLANNED"),
      dryRun: true,
      base,
      budgetMs,
      startedAt: new Date(startedAt).toISOString(),
      elapsedMs: Date.now() - startedAt,
      note:
        "DRY RUN — targets validated, modes/tiers resolved, nothing probed. No LLM calls, no scans rows, no cost. Website-mode discovery is NOT exercised by a dry run.",
      rejected: { modes: modes.rejected, tiers: tiers.rejected },
      cells: plan,
      summary: {
        planned: plan.length,
        ok: 0,
        failed: plan.filter((c) => c.status === "ERROR").length,
        skipped: 0,
      },
    });
  }

  // ── real run: strictly sequential, budget checked between cells ─────────────
  for (const cell of plan) {
    if (cell.status === "ERROR") continue; // target already rejected pre-flight
    const spent = Date.now() - startedAt;
    if (spent >= budgetMs) {
      cell.status = "SKIPPED-BUDGET";
      cell.error = `time budget of ${budgetMs}ms was already spent (${spent}ms) before this cell started`;
      continue;
    }
    const cellStart = Date.now();
    try {
      const result = await runScanVariant({
        target: cell.target,
        label: cell.label,
        mode: cell.mode,
        tier: cell.tier,
      });
      Object.assign(cell, fillFromResult(cell, result, Date.now() - cellStart));
    } catch (err) {
      cell.status = "ERROR";
      cell.ok = false;
      cell.elapsedMs = Date.now() - cellStart;
      cell.error = (err instanceof Error ? err.message : String(err)).slice(0, 600);
    }
  }

  const okCount = plan.filter((c) => c.status === "OK").length;
  const failed = plan.filter((c) => c.status === "ERROR").length;
  const skipped = plan.filter((c) => c.status === "SKIPPED-BUDGET").length;

  return NextResponse.json({
    ok: failed === 0 && skipped === 0,
    dryRun: false,
    base,
    budgetMs,
    startedAt: new Date(startedAt).toISOString(),
    elapsedMs: Date.now() - startedAt,
    rejected: { modes: modes.rejected, tiers: tiers.rejected },
    cells: plan,
    summary: { planned: plan.length, ok: okCount, failed, skipped },
  });
}

/** Method discipline: this route only accepts POST. */
export async function GET(): Promise<Response> {
  return NextResponse.json(
    { ok: false, error: "POST only. Send Authorization: Bearer <CRON_SECRET>." },
    { status: 405, headers: { allow: "POST" } },
  );
}