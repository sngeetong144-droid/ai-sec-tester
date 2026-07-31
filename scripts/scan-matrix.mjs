#!/usr/bin/env node
/**
 * scan-matrix.mjs - run EVERY scan variant (3 modes x 3 tiers = 9 cells) against a
 * live deployment and assert what each one is supposed to produce.
 *
 *   node scripts/scan-matrix.mjs --dry
 *   node scripts/scan-matrix.mjs --modes passive --tiers basic
 *   node scripts/scan-matrix.mjs --base https://scan.thesoulsofai.com
 *
 * Flags:
 *   --base <url>            deployment to drive (default https://scan.thesoulsofai.com)
 *   --dry                   resolve the plan only: no probes, no judge calls, no cost
 *   --modes a,b             subset of passive,endpoint,website
 *   --tiers x,y             subset of basic,advanced,enterprise
 *   --endpoint-target <url> override the endpoint-mode target
 *   --website-target <url>  override the website-mode target
 *   --passive-target <url>  override the passive-mode target
 *   --budget <ms>           server-side time budget; unrun cells come back SKIPPED-BUDGET
 *
 * It exists because runAdminSelfScan is a server action behind an admin session:
 * nine variants could only ever be checked by nine manual clicks, and "I clicked
 * them once" is not a repeatable test. The server route it calls drives the same
 * core the console drives, so a green matrix is evidence about the product.
 *
 * THIS IS A TEST, NOT A PRINTOUT. Every cell carries expectations and the exit
 * code is 0 only when all of them hold. In particular a passive scan that somehow
 * ran interactive probes FAILS, and endpoint/basic against the deliberately-weak
 * demo target FAILS if the bot did NOT leak - a clean result there means the
 * probes are not landing, which is a broken product, not a good score.
 *
 * Zero dependencies. Never prints the secret.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_BASE = "https://scan.thesoulsofai.com";
const ALL_MODES = ["passive", "endpoint", "website"];
const ALL_TIERS = ["basic", "advanced", "enterprise"];

// Cost model, read off lib/real-scan-engine: 30 curated probes, sent one at a
// time, each successful send graded by ONE judge call. Body-shape autodetection
// adds up to 7 benign handshakes that are NOT judged.
const PROBES_PER_CELL = 30;
const HANDSHAKES_PER_CELL = 7;

// ── args ────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function flag(name) {
  return argv.includes(name);
}
function opt(name, fallback = null) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}
function list(name, allowed) {
  const raw = opt(name);
  if (!raw) return null;
  const values = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const bad = values.filter((v) => !allowed.includes(v));
  if (bad.length) {
    console.error(`Unknown value(s) for ${name}: ${bad.join(", ")}. Allowed: ${allowed.join(", ")}.`);
    process.exit(2);
  }
  return values;
}

const BASE = (opt("--base", DEFAULT_BASE) || DEFAULT_BASE).replace(/\/+$/, "");
const DRY = flag("--dry");
const MODES = list("--modes", ALL_MODES) ?? ALL_MODES;
const TIERS = list("--tiers", ALL_TIERS) ?? ALL_TIERS;

// ── secret ──────────────────────────────────────────────────────────────────────
/**
 * CRON_SECRET from the environment, else from .env.local beside the repo root.
 * scripts/verify-live.mjs has no env helper to reuse (it reads none), so this is
 * the minimum parser that handles the file this repo actually writes: KEY=value,
 * optional `export ` prefix, optional surrounding quotes, # comments, blank lines.
 * The value is NEVER printed - only whether it was found and where.
 */
function loadSecret() {
  const fromEnv = process.env.CRON_SECRET?.trim();
  if (fromEnv) return { secret: fromEnv, source: "environment" };

  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = join(here, "..", ".env.local");
  let text;
  try {
    text = readFileSync(envPath, "utf8");
  } catch {
    return { secret: null, source: null, envPath };
  }
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const m = t.replace(/^export\s+/, "").match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || m[1] !== "CRON_SECRET") continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (v) return { secret: v, source: ".env.local" };
  }
  return { secret: null, source: null, envPath };
}

// ── expectations ────────────────────────────────────────────────────────────────
const OK = "ok";
const BAD = "bad";
const WARN = "warn";

function check(state, text) {
  return { state, text };
}

/**
 * What each cell MUST produce. A cell passes only when it has zero `bad` checks.
 * `warn` prints loudly but does not fail: it marks a real observation that is not
 * by itself proof of a defect.
 */
function expectationsFor(cell) {
  const out = [];
  const { mode, tier } = cell;

  if (cell.status !== "OK") {
    out.push(check(BAD, `scan did not complete (${cell.status}): ${cell.error ?? "no reason returned"}`));
    return out;
  }
  out.push(check(OK, `scan completed -> ${BASE}/scans/${cell.scanId}`));

  if (mode === "passive") {
    if (cell.interactiveRan === false) {
      out.push(check(OK, "no interactive probes were sent (passive means passive)"));
    } else {
      out.push(check(BAD, "PASSIVE SCAN RAN INTERACTIVE PROBES - the mode that promises never to message the bot messaged it"));
    }
    if (cell.coreNotRun === 5) {
      out.push(check(OK, "all 5 core OWASP interactive checks reported not-run"));
    } else {
      out.push(
        check(
          WARN,
          `only ${cell.coreNotRun}/5 core interactive checks are not-run - the other ${5 - cell.coreNotRun} were decided from STATIC front-end evidence (a secret or system prompt visible in the page source). That is a real finding, not a probe, so it is not a harness failure - but read the report before trusting it`,
        ),
      );
    }
  }

  if (mode === "endpoint" && tier === "basic") {
    out.push(
      cell.testsRan === 5
        ? check(OK, "5 core checks ran")
        : check(BAD, `expected 5 core checks to run, got ${cell.testsRan} (${cell.notRun} not run) - the basic tier is not running its own test set`),
    );
    if (cell.testsFailed > 0) {
      out.push(check(OK, `weak target failed ${cell.testsFailed}/${cell.testsRan} checks, as designed`));
    } else {
      out.push(
        check(
          BAD,
          "THE DELIBERATELY-WEAK TARGET PASSED EVERY CHECK. This is NOT a good score - the weak demo bot leaks by design, so a clean sheet means the probes are not landing or the judge is not grading. Any customer scan run through this same path would report a false all-clear",
        ),
      );
    }
  }

  if (mode === "endpoint" && (tier === "advanced" || tier === "enterprise")) {
    out.push(
      cell.testsRan === 12
        ? check(OK, "12 testable checks ran (8 interactive + 4 header)")
        : check(BAD, `expected 12 testable checks, got ${cell.testsRan} - ${tier} is not running its full set`),
    );
    out.push(
      cell.notRun === 3
        ? check(OK, "3 advisory checks correctly reported not-run")
        : check(BAD, `expected exactly 3 advisory not-run checks, got ${cell.notRun}`),
    );
  }

  if (mode === "website") {
    out.push(
      cell.discoveredEndpoint
        ? check(OK, `discovery resolved ${cell.discoveredEndpoint}`)
        : check(BAD, "discovery did NOT resolve a chatbot endpoint, so nothing was probed"),
    );
    out.push(
      cell.interactiveRan === true
        ? check(OK, "interactive probes ran against the discovered endpoint")
        : check(BAD, `interactive probes did NOT run${cell.realScanArmed === false ? " - real scanning is not armed on this deployment (REAL_SCAN_ENABLED / judge key)" : ""}`),
    );
  }

  return out;
}

// ── output ──────────────────────────────────────────────────────────────────────
function pad(s, w) {
  return String(s).padEnd(w);
}

function matrixTable(rows) {
  const modeW = Math.max(6, ...MODES.map((m) => m.length));
  const tierW = Math.max(10, ...TIERS.map((t) => t.length));
  const head = `${pad("MODE", modeW)} | ${TIERS.map((t) => pad(t, tierW)).join(" | ")}`;
  const rule = `${"-".repeat(modeW)}-+-${TIERS.map(() => "-".repeat(tierW)).join("-+-")}`;
  const lines = [head, rule];
  for (const mode of MODES) {
    const cells = TIERS.map((tier) => {
      const r = rows.find((x) => x.mode === mode && x.tier === tier);
      return pad(r ? r.mark : "-", tierW);
    });
    lines.push(`${pad(mode, modeW)} | ${cells.join(" | ")}`);
  }
  return lines.join("\n");
}

async function main() {
  const { secret, source, envPath } = loadSecret();
  if (!secret) {
    console.error("CRON_SECRET is not set, so this run cannot authenticate to the matrix route.");
    console.error("");
    console.error("Set it one of two ways, then re-run:");
    console.error("  1. environment:  CRON_SECRET=<the value from Vercel> node scripts/scan-matrix.mjs --dry");
    console.error(`  2. env file:     add a CRON_SECRET=<value> line to ${envPath ?? ".env.local"}`);
    console.error("");
    console.error("The value is the same CRON_SECRET the deployment uses (Vercel project env).");
    console.error("Pull it with: vercel env pull .env.local");
    process.exit(2);
  }

  const payload = { modes: MODES, tiers: TIERS, dryRun: DRY };
  const endpointTarget = opt("--endpoint-target");
  const websiteTarget = opt("--website-target");
  const passiveTarget = opt("--passive-target");
  const budget = opt("--budget");
  if (endpointTarget) payload.endpointTarget = endpointTarget;
  if (websiteTarget) payload.websiteTarget = websiteTarget;
  if (passiveTarget) payload.passiveTarget = passiveTarget;
  if (budget) payload.budgetMs = Number(budget);

  const planned = MODES.length * TIERS.length;
  console.log(`AI Sec Tester - scan matrix${DRY ? " (DRY RUN)" : ""}`);
  console.log(`Target : ${BASE}`);
  console.log(`Secret : found in ${source} (never printed)`);
  console.log(`Cells  : ${planned} (${MODES.join(",")} x ${TIERS.join(",")})`);
  if (!DRY) {
    const paid = MODES.filter((m) => m !== "passive").length * TIERS.length;
    console.log(`COST   : ${paid} non-passive cell(s) x up to ${PROBES_PER_CELL} judged probes. This spends real LLM budget.`);
  }
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("");
  console.log(DRY ? "Resolving plan..." : "Running cells sequentially - this can take several minutes.");

  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/api/dev/scan-matrix`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(300_000),
    });
  } catch (err) {
    console.error(`\nRequest failed before the server answered: ${err?.message || err}`);
    console.error("Nothing can be concluded about any cell.");
    process.exit(1);
  }

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`\nHTTP ${res.status} - response was not JSON:\n${text.slice(0, 500)}`);
    process.exit(1);
  }

  if (res.status === 401) {
    console.error("\nHTTP 401 unauthorized - the CRON_SECRET this script found does not match the deployment's.");
    process.exit(1);
  }
  if (res.status === 503) {
    console.error(`\nHTTP 503 - ${json.error}`);
    console.error("No cells were run. This is a deployment configuration problem, not a scan result.");
    process.exit(1);
  }
  if (!Array.isArray(json.cells)) {
    console.error(`\nHTTP ${res.status} - ${json.error ?? "no cells returned"}`);
    process.exit(1);
  }

  const elapsed = Date.now() - t0;

  // ── evaluate ──────────────────────────────────────────────────────────────────
  const rows = json.cells.map((cell) => {
    if (json.dryRun) {
      const okPlan = cell.status === "PLANNED";
      return {
        ...cell,
        mark: okPlan ? "PLAN-OK" : "PLAN-FAIL",
        verdictState: okPlan ? "pass" : "fail",
        checks: okPlan
          ? [check(OK, `target validated: ${cell.target}`)]
          : [check(BAD, cell.error ?? "target could not be resolved")],
      };
    }
    if (cell.status === "SKIPPED-BUDGET") {
      return { ...cell, mark: "SKIP", verdictState: "skip", checks: [check(WARN, cell.error ?? "not run - time budget")] };
    }
    const checks = expectationsFor(cell);
    const failed = checks.some((c) => c.state === BAD);
    return { ...cell, mark: failed ? "FAIL" : "PASS", verdictState: failed ? "fail" : "pass", checks };
  });

  console.log("");
  console.log(matrixTable(rows));
  console.log("");
  console.log("DETAIL");
  console.log("=".repeat(78));
  for (const r of rows) {
    const head = `${r.mode}/${r.tier}  [${r.mark}]`;
    console.log(head);
    console.log(`  target : ${r.target}`);
    if (!json.dryRun && r.status === "OK") {
      console.log(
        `  result : verdict=${r.verdict} score=${r.score} ran=${r.testsRan} passed=${r.testsPassed} failed=${r.testsFailed} notRun=${r.notRun} interactive=${r.interactiveRan}`,
      );
      if (r.discoveredEndpoint) console.log(`  probed : ${r.discoveredEndpoint}`);
      console.log(`  scan   : ${BASE}/scans/${r.scanId}  (${r.elapsedMs}ms)`);
    }
    for (const c of r.checks) {
      const tag = c.state === OK ? "  PASS  " : c.state === WARN ? "  WARN  " : "  FAIL  ";
      console.log(`${tag}${c.text}`);
    }
    console.log("");
  }

  const passed = rows.filter((r) => r.verdictState === "pass").length;
  const failed = rows.filter((r) => r.verdictState === "fail").length;
  const skipped = rows.filter((r) => r.verdictState === "skip").length;

  console.log("=".repeat(78));
  console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${skipped} skipped, ${rows.length} cells.`);
  console.log(`ELAPSED: ${(elapsed / 1000).toFixed(1)}s wall clock (server reported ${json.elapsedMs}ms).`);

  const ranCells = rows.filter((r) => r.status === "OK" && r.mode !== "passive").length;
  console.log("");
  console.log("COST NOTE");
  if (json.dryRun) {
    console.log("  0 LLM calls. A dry run validates targets and resolves the plan only - it");
    console.log("  sends no probe, grades no reply, and writes no scans row. It also does NOT");
    console.log("  exercise website-mode discovery, so it proves nothing about discovery.");
  } else {
    console.log(`  ${ranCells} non-passive cell(s) completed.`);
    console.log(`  Per non-passive cell: up to ${PROBES_PER_CELL} probes sent, each successful one graded`);
    console.log(`  by 1 LLM judge call, plus up to ${HANDSHAKES_PER_CELL} body-shape handshakes that are NOT judged.`);
    console.log(`  Upper bound this run: ~${ranCells * PROBES_PER_CELL} judge calls.`);
    console.log("  Passive cells cost 0 LLM calls (headers only).");
    console.log("  Note: the probe suite is NOT tier-scoped - basic sends the same ~30 probes as");
    console.log("  enterprise and only reports fewer checks, so a basic cell costs the same as an");
    console.log("  enterprise one. A full 9-cell matrix is ~6 paid cells, ~180 judge calls.");
    if (rows.some((r) => r.target.includes("/api/test-target/"))) {
      console.log("  The demo weak/partial/secure targets are deterministic sim bots, so probes");
      console.log("  sent to them cost nothing beyond the judge calls above.");
    }
  }
  console.log("");

  if (skipped > 0) {
    console.log(`${skipped} cell(s) hit the server time budget and did not run. Re-run those modes/tiers`);
    console.log("separately (--modes/--tiers) rather than reading the gap as a pass.");
    console.log("");
  }

  process.exit(failed === 0 && skipped === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`\nscan-matrix crashed before finishing: ${err?.stack || err}`);
  console.error("Treat this as a FAILED run - the cells above are incomplete.");
  process.exit(2);
});