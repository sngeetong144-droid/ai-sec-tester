/**
 * report-labels.test.ts - pins how the three advisory OWASP categories are LABELLED.
 *
 * The label is what a buyer reads and screenshots. lib/advisory-review.ts can be
 * perfectly honest in its evidence prose and still mislead if the row prints PASS,
 * so the separation between REVIEWED (customer-disclosed) and PASS (probed) is
 * enforced here rather than left to whoever renders the report next.
 *
 * Run: bun test __tests__/report-labels.test.ts
 */
import { test, expect } from "bun:test";
import { rowLabelFor, advisoryLabelFor } from "../lib/report-labels";

const ADVISORY = ["supply_chain", "data_poisoning", "vector_weakness"];

test("advisory rows stay ADVISORY when no disclosure was provided", () => {
  // Pre-existing behaviour for every scan with no control disclosure attached.
  for (const k of ADVISORY) {
    expect(rowLabelFor(k, "pending", null)).toBe("ADVISORY");
    expect(rowLabelFor(k, "pending", null, null)).toBe("ADVISORY");
    expect(rowLabelFor(k, "pending", null, { verdict: "not_disclosed" })).toBe("ADVISORY");
  }
});

test("a reviewed category is NEVER labelled PASS or FAIL", () => {
  // The single most important assertion in this file. A customer-disclosed control
  // is not a tested control, and the label is what a buyer screenshots.
  for (const verdict of ["reviewed_pass", "reviewed_gaps", "reviewed_incomplete", "not_disclosed"]) {
    for (const k of ADVISORY) {
      const l = rowLabelFor(k, "pending", null, { verdict });
      expect(l).not.toBe("PASS");
      expect(l).not.toBe("FAIL");
    }
  }
});

test("reviewed verdicts map to their own distinct labels", () => {
  expect(advisoryLabelFor({ verdict: "reviewed_pass" })).toBe("REVIEWED");
  expect(advisoryLabelFor({ verdict: "reviewed_gaps" })).toBe("REVIEWED - GAPS");
  expect(advisoryLabelFor({ verdict: "reviewed_incomplete" })).toBe("NOT ASSESSED");
  expect(advisoryLabelFor(null)).toBe("ADVISORY");
  expect(advisoryLabelFor(undefined)).toBe("ADVISORY");
});

test("an incomplete disclosure reads NOT ASSESSED, not REVIEWED", () => {
  // Half-answering the questionnaire must not buy the reassuring word.
  expect(advisoryLabelFor({ verdict: "reviewed_incomplete" })).not.toBe("REVIEWED");
});

test("a probed row is unaffected by a review being present", () => {
  // Guards against the review argument leaking into the probed categories.
  expect(rowLabelFor("instruction_override", "fail", null, { verdict: "reviewed_pass" })).toBe("FAIL");
  expect(rowLabelFor("transport_https", "pass", null, { verdict: "reviewed_gaps" })).toBe("PASS");
});
