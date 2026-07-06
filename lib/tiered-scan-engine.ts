/**
 * tiered-scan-engine.ts — unified entry point for all scan tiers.
 *
 * Tiers:
 *   basic      — 5 checks  (OWASP LLM01/05/06/07 + jailbreak)
 *   pro        — 10 checks (Basic + LLM02/04/08/09 + CORS)
 *   enterprise — 15 checks (Pro + clickjacking/cookie/CSP depth/supply chain/auth context)
 *
 * Each engine independently probes the target; results are merged into one flat list.
 * For basic this is 1 probe, pro is 2, enterprise is 3 — each under 8s timeout.
 */

import { assertPublicTarget, type ProbeOptions } from "@/lib/probe";
import { runScanEngine, type EngineResult, type TestResult } from "@/lib/scan-engine";
import { runProScanEngine } from "@/lib/pro-scan-engine";
import { runEnterpriseScanEngine } from "@/lib/enterprise-scan-engine";

export type ScanTier = "basic" | "pro" | "enterprise";

export interface TieredEngineResult extends EngineResult {
  tier: ScanTier;
  checks_by_tier: { basic: number; pro: number; enterprise: number };
}

function mergeResults(
  tiers: Array<{ results: TestResult[]; key: "basic" | "pro" | "enterprise" }>,
): { results: TestResult[]; checks_by_tier: TieredEngineResult["checks_by_tier"] } {
  const allResults: TestResult[] = [];
  const checks_by_tier = { basic: 0, pro: 0, enterprise: 0 };

  for (const { results, key } of tiers) {
    for (const r of results) {
      allResults.push({ ...r, sort_order: allResults.length });
    }
    checks_by_tier[key] = results.length;
  }

  return { results: allResults, checks_by_tier };
}

function scoreResults(results: TestResult[]): Pick<EngineResult, "score" | "tests_total" | "tests_passed" | "verdict"> {
  const tests_passed = results.filter((r) => r.status === "pass").length;
  const tests_total = results.length;
  const fails = tests_total - tests_passed;
  const hasCriticalFail = results.some((r) => r.status === "fail" && r.severity === "critical");
  const score = Math.round((tests_passed / tests_total) * 100);

  let verdict: EngineResult["verdict"];
  if (fails === 0) verdict = "pass";
  else if (fails >= 3 || hasCriticalFail) verdict = "fail";
  else verdict = "warn";

  return { score, tests_total, tests_passed, verdict };
}

export async function runTieredScanEngine(
  targetUrl: string,
  tier: ScanTier,
  options: ProbeOptions = {},
): Promise<TieredEngineResult> {
  // SSRF guard runs first regardless of tier
  await assertPublicTarget(targetUrl, options);

  const tierLabel =
    tier === "basic" ? "Basic (5 checks)" : tier === "pro" ? "Pro (10 checks)" : "Enterprise (15 checks)";

  if (tier === "basic") {
    const engine = await runScanEngine(targetUrl, options);
    return {
      ...engine,
      tier,
      checks_by_tier: { basic: engine.tests_total, pro: 0, enterprise: 0 },
    };
  }

  if (tier === "pro") {
    const [basic, pro] = await Promise.all([
      runScanEngine(targetUrl, options),
      runProScanEngine(targetUrl, options),
    ]);
    const { results, checks_by_tier } = mergeResults([
      { results: basic.results, key: "basic" },
      { results: pro.results, key: "pro" },
    ]);
    const scores = scoreResults(results);
    return {
      ...scores,
      results,
      summary: `${tierLabel}: ${scores.tests_passed}/${scores.tests_total} passed (score ${scores.score}). ${basic.summary.split(". ").slice(-1)[0]}`,
      tier,
      checks_by_tier,
    };
  }

  // enterprise
  const [basic, pro, enterprise] = await Promise.all([
    runScanEngine(targetUrl, options),
    runProScanEngine(targetUrl, options),
    runEnterpriseScanEngine(targetUrl, options),
  ]);
  const { results, checks_by_tier } = mergeResults([
    { results: basic.results, key: "basic" },
    { results: pro.results, key: "pro" },
    { results: enterprise.results, key: "enterprise" },
  ]);
  const scores = scoreResults(results);
  return {
    ...scores,
    results,
    summary: `${tierLabel}: ${scores.tests_passed}/${scores.tests_total} passed (score ${scores.score}). ${basic.summary.split(". ").slice(-1)[0]}`,
    tier,
    checks_by_tier,
  };
}
