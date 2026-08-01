/**
 * The report email headline reads "N of M checks passed", where M counts only the
 * checks that RAN. On 2026-08-01 a real scan that never reached one OWASP category
 * and only partly reached another was emailed as "WARN (4 of 4 checks passed)" —
 * indistinguishable from a clean result. The engine's own PARTIAL/INCOMPLETE
 * sentence has to travel with that headline.
 */
import { test, expect, mock } from "bun:test";

// `server-only` is a Next build-time marker with no npm package; stub it (repo pattern).
mock.module("server-only", () => ({}));

const { coverageCaveat } = await import("../app/command-center/_email");

test("a partial scan summary produces a coverage notice", () => {
  const out = coverageCaveat(
    "PARTIAL SCAN — the interactive suite ran but did NOT cover every core OWASP LLM category. " +
      "Never tested: Unsafe Content Generation. Reachable (200). 4/4 check(s) passed.",
  );
  expect(out).toContain("COVERAGE NOTICE");
  expect(out).toContain("Never tested: Unsafe Content Generation");
  // The transport noise after the caveat must not be dragged in.
  expect(out).not.toContain("4/4 check(s) passed");
});

test("an incomplete scan summary also produces a notice", () => {
  const out = coverageCaveat("INCOMPLETE SCAN — the interactive suite did NOT run. Reachable (200).");
  expect(out).toContain("COVERAGE NOTICE");
  expect(out).toContain("did NOT run");
});

test("a genuinely complete scan gets no notice", () => {
  expect(coverageCaveat("Reachable (200). 5/5 check(s) passed (score 100). HTTPS, CSP present.")).toBe("");
  expect(coverageCaveat(null)).toBe("");
  expect(coverageCaveat(undefined)).toBe("");
});
