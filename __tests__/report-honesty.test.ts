import { describe, expect, it, mock } from "bun:test";

// `server-only` is a Next build-time marker with no npm package; stub it (repo pattern).
mock.module("server-only", () => ({}));

import { rowLabelFor, scoreHeadlineFor } from "../lib/report-labels";

/**
 * Regression cover for two defects found in a REAL delivered $497 report
 * (scan_requests c25b2cfc, 2026-08-01): it headlined "Security score: 100/100"
 * while 11 of 15 checks never ran, and printed FAIL [CRITICAL] against five core
 * OWASP categories that were rate-limited out before any probe was sent.
 */
describe("rowLabelFor — a check that never ran is not a failure", () => {
  it("labels a rate-limited / pending check NOT RUN, never FAIL", () => {
    expect(rowLabelFor("prompt_injection", "pending")).toBe("NOT RUN");
    expect(rowLabelFor("prompt_injection", null)).toBe("NOT RUN");
    expect(rowLabelFor("prompt_injection", undefined)).toBe("NOT RUN");
    expect(rowLabelFor("prompt_injection", "skipped")).toBe("NOT RUN");
  });

  it("still labels a genuine failure FAIL", () => {
    expect(rowLabelFor("prompt_injection", "fail")).toBe("FAIL");
  });

  it("still labels a genuine pass PASS", () => {
    expect(rowLabelFor("https", "pass")).toBe("PASS");
  });

  it("labels the three advisory OWASP categories ADVISORY in every state", () => {
    for (const key of ["supply_chain", "data_poisoning", "vector_weakness"]) {
      expect(rowLabelFor(key, "pending")).toBe("ADVISORY");
      expect(rowLabelFor(key, "fail")).toBe("ADVISORY");
      expect(rowLabelFor(key, "pass")).toBe("ADVISORY");
    }
  });

  it("never returns FAIL for anything that did not actually run", () => {
    const nonRunStates = ["pending", "skipped", "", null, undefined];
    for (const s of nonRunStates) {
      expect(rowLabelFor("jailbreak", s as string | null | undefined)).not.toBe("FAIL");
    }
  });
});

describe("scoreHeadlineFor — coverage travels with the number", () => {
  it("qualifies the score when checks did not run (the real 4-of-15 case)", () => {
    expect(scoreHeadlineFor(100, 4, 15)).toBe(
      "Security score: 100/100 over 4 of 15 checks",
    );
  });

  it("leaves a fully covered scan unqualified", () => {
    expect(scoreHeadlineFor(100, 15, 15)).toBe("Security score: 100/100");
  });

  it("a bare 100/100 is impossible whenever coverage is partial", () => {
    for (const ran of [0, 1, 4, 14]) {
      expect(scoreHeadlineFor(100, ran, 15)).not.toBe("Security score: 100/100");
      expect(scoreHeadlineFor(100, ran, 15)).toContain(`over ${ran} of 15 checks`);
    }
  });

  it("treats a null score as 0 rather than throwing", () => {
    expect(scoreHeadlineFor(null, 0, 15)).toBe("Security score: 0/100 over 0 of 15 checks");
  });
});