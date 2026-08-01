import { describe, expect, it, mock } from "bun:test";

// `server-only` is a Next build-time marker with no npm package; stub it (repo pattern).
mock.module("server-only", () => ({}));

import { coverageLineFor, methodologyNoteFor, rowLabelFor, scoreHeadlineFor } from "../lib/report-labels";

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
/**
 * Report 7fdd21ea (2026-08-01) graded Misinformation & Overreliance PASS while its
 * own evidence read "PARTIAL COVERAGE - only 3 of 4 probe(s) in this category were
 * delivered... this category is NOT fully verified." A customer reads the green
 * word, not the grey paragraph.
 */
const PARTIAL_EVIDENCE =
  "PARTIAL COVERAGE — only 3 of 4 probe(s) in this category were delivered; those 3 " +
  "were refused, but the remaining 1 never reached the chatbot, so this category is " +
  "NOT fully verified.";

describe("rowLabelFor — partial coverage is not a pass", () => {
  it("labels a pass whose evidence declares partial coverage as PARTIAL", () => {
    expect(rowLabelFor("misinformation", "pass", PARTIAL_EVIDENCE)).toBe("PARTIAL");
  });

  it("still labels a fully-covered pass as PASS", () => {
    expect(rowLabelFor("misinformation", "pass", "All 4 live probe(s) were refused.")).toBe("PASS");
  });

  it("treats missing evidence as a normal pass", () => {
    expect(rowLabelFor("misinformation", "pass", null)).toBe("PASS");
    expect(rowLabelFor("misinformation", "pass")).toBe("PASS");
  });

  it("a FAIL stays FAIL even with partial evidence", () => {
    expect(rowLabelFor("misinformation", "fail", PARTIAL_EVIDENCE)).toBe("FAIL");
  });

  it("advisory still wins over partial evidence", () => {
    expect(rowLabelFor("supply_chain", "pass", PARTIAL_EVIDENCE)).toBe("ADVISORY");
  });
});

describe("coverageLineFor — partials are pulled out of the passed count", () => {
  it("renders the real 7fdd21ea case honestly", () => {
    expect(coverageLineFor(12, 1, 3, 15)).toBe("11/15 checks passed, 1 PARTIAL, 3 NOT RUN.");
  });

  it("omits the partial clause when there are none", () => {
    expect(coverageLineFor(12, 0, 3, 15)).toBe("12/15 checks passed, 3 NOT RUN.");
  });

  it("omits both clauses on a clean full run", () => {
    expect(coverageLineFor(15, 0, 0, 15)).toBe("15/15 checks passed.");
  });

  it("never reports more passed than were fully verified", () => {
    expect(coverageLineFor(12, 12, 3, 15)).toBe("0/15 checks passed, 12 PARTIAL, 3 NOT RUN.");
  });
});
/**
 * Report 7fdd21ea told the customer "Interactive jailbreak probes are simulated"
 * while every interactive category had been probed LIVE and judged. The footnote
 * must be derived from what the scan did, not hardcoded.
 */
describe("methodologyNoteFor — the footnote must match what actually happened", () => {
  const live = [{ evidence: "All 4 live probe(s) were refused by the chatbot. Guardrails held." }];
  const notLive = [{ evidence: "Advisory only — cannot be verified by an external black-box scan." }];

  it("says probes were sent LIVE when the engine recorded live probes", () => {
    const note = methodologyNoteFor(live);
    expect(note).toContain("sent live to the target");
    expect(note).not.toContain("simulated");
  });

  it("never claims live probing when none was recorded", () => {
    const note = methodologyNoteFor(notLive);
    expect(note).toContain("could not be delivered");
    expect(note).not.toContain("sent live to the target");
  });

  it("one live category is enough to stop calling the scan simulated", () => {
    expect(methodologyNoteFor([...notLive, ...live])).toContain("sent live to the target");
  });

  it("always keeps the authorization warning", () => {
    for (const r of [live, notLive, []]) {
      expect(methodologyNoteFor(r)).toContain("Only scan chatbots you own or are authorized to test.");
    }
  });

  it("tolerates missing evidence without claiming live probing", () => {
    expect(methodologyNoteFor([{ evidence: null }, {}])).toContain("could not be delivered");
  });
});