/**
 * advisory-review.test.ts - pins the CREDIBILITY RULE of lib/advisory-review.ts.
 *
 * The three advisory OWASP categories (LLM03/04/08) are assessed from the customer own
 * control disclosure because no external scan can reach the evidence. That is only
 * defensible while a REVIEWED verdict stays clearly separate from a PROBED one. These
 * tests exist so that separation cannot erode into self-certification.
 *
 * Run: bun test __tests__/advisory-review.test.ts
 */
import { test, expect } from "bun:test";
import {
  ADVISORY_CONTROLS,
  reviewCategory,
  reviewAllAdvisory,
  reviewSummaryLine,
  type AdvisoryKey,
  type DisclosureAnswers,
} from "../lib/advisory-review";

const KEYS: AdvisoryKey[] = ["supply_chain", "data_poisoning", "vector_weakness"];

const allYes = (key: AdvisoryKey): DisclosureAnswers =>
  Object.fromEntries(ADVISORY_CONTROLS[key].map((c) => [c.id, "yes"]));

test("covers exactly the three unprobeable OWASP categories", () => {
  expect(Object.keys(ADVISORY_CONTROLS).sort()).toEqual(
    ["data_poisoning", "supply_chain", "vector_weakness"],
  );
  for (const k of KEYS) expect(ADVISORY_CONTROLS[k].length).toBeGreaterThan(0);
});

test("no disclosure means NOT ASSESSED - never a pass", () => {
  for (const k of KEYS) {
    const r = reviewCategory(k, null);
    expect(r.verdict).toBe("not_disclosed");
    expect(r.confirmed).toBe(0);
    expect(r.evidence).toContain("Not assessed");
    expect(r.evidence).not.toMatch(/pass(ed)?/i);
  }
});

test("SILENCE IS NOT A CONTROL - an omitted answer is unknown, never confirmed", () => {
  for (const k of KEYS) {
    const controls = ADVISORY_CONTROLS[k];
    // Answer only the first control; leave the rest absent entirely.
    const partial: DisclosureAnswers = { [controls[0].id]: "yes" };
    const r = reviewCategory(k, partial);
    expect(r.verdict).toBe("reviewed_incomplete");
    expect(r.confirmed).toBe(1);
    expect(r.unknowns.length).toBe(controls.length - 1);
    expect(r.evidence).toContain("UNKNOWN, not as passing");
  }
});

test("an explicit NO is a severity-weighted GAP, not an unknown", () => {
  for (const k of KEYS) {
    const controls = ADVISORY_CONTROLS[k];
    const answers = { ...allYes(k), [controls[0].id]: "no" } as DisclosureAnswers;
    const r = reviewCategory(k, answers);
    expect(r.verdict).toBe("reviewed_gaps");
    expect(r.gaps.length).toBe(1);
    expect(r.gaps[0].controlId).toBe(controls[0].id);
    expect(r.gaps[0].remediation.length).toBeGreaterThan(20);
    expect(r.unknowns.length).toBe(0);
  }
});

test("a NO never hides behind an UNKNOWN - gaps win the verdict", () => {
  const controls = ADVISORY_CONTROLS.vector_weakness;
  const answers: DisclosureAnswers = {
    [controls[0].id]: "no",
    [controls[1].id]: "unknown",
  };
  const r = reviewCategory("vector_weakness", answers);
  expect(r.verdict).toBe("reviewed_gaps");
  expect(r.gaps.length).toBe(1);
});

test("the worst gap by severity is the one surfaced in evidence", () => {
  const controls = ADVISORY_CONTROLS.data_poisoning;
  const critical = controls.find((c) => c.severity === "critical");
  const medium = controls.find((c) => c.severity === "medium");
  expect(critical).toBeDefined();
  expect(medium).toBeDefined();
  const answers = {
    ...allYes("data_poisoning"),
    [critical!.id]: "no",
    [medium!.id]: "no",
  } as DisclosureAnswers;
  const r = reviewCategory("data_poisoning", answers);
  expect(r.evidence).toContain("CRITICAL");
});

test("EVERY reviewed verdict states it was not probed and not independently verified", () => {
  for (const k of KEYS) {
    const r = reviewCategory(k, allYes(k));
    expect(r.verdict).toBe("reviewed_pass");
    // The load-bearing disclaimer. If this ever disappears, the product is claiming
    // it tested something it only asked about.
    expect(r.evidence).toContain("REVIEWED, NOT PROBED");
    expect(r.evidence).toContain("not independently verified");
  }
});

test("a full house of yes answers is a documented baseline, never a clean bill of health", () => {
  const r = reviewCategory("supply_chain", allYes("supply_chain"));
  expect(r.evidence).toContain("reflects your");
  expect(r.evidence).toContain("not an independent test");
});

test("the summary line marks the whole section self-reported", () => {
  const reviews = reviewAllAdvisory({
    ...allYes("supply_chain"),
    ...allYes("data_poisoning"),
    ...allYes("vector_weakness"),
  });
  const line = reviewSummaryLine(reviews);
  expect(line).toContain("Self-reported; not independently verified.");
  expect(line).toContain("12/12 confirmed");
});

test("summary reports not-disclosed distinctly from zero-confirmed", () => {
  const line = reviewSummaryLine(reviewAllAdvisory(null));
  expect(line).toContain("not disclosed");
  expect(line).not.toContain("0/12 confirmed");
});

test("every control carries a plain-language question and real remediation", () => {
  for (const k of KEYS) {
    for (const c of ADVISORY_CONTROLS[k]) {
      expect(c.question.endsWith("?")).toBe(true);
      expect(c.remediation.length).toBeGreaterThan(40);
      expect(["critical", "high", "medium", "low"]).toContain(c.severity);
    }
  }
});
