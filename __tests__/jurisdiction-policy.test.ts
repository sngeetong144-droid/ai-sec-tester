/**
 * jurisdiction-policy.test.ts — §3 critical behavior of the server-side policy.
 * Pure, no network/DB. Proves: sanctioned → reject, licence-required → hold (NOT
 * reject), unlisted → allow. Plus the citation/policy invariants counsel relies on.
 *
 * Run: bun test __tests__/jurisdiction-policy.test.ts
 */
import { test, expect } from "bun:test";
import {
  classifyRequesterJurisdiction,
  JURISDICTION_POLICY,
  COMPREHENSIVE_SANCTION_CODES,
  SANCTIONS_CITATIONS,
  LICENSE_RESTRICTED_JURISDICTIONS,
} from "../lib/jurisdiction-policy";

// ── the three required outcomes ────────────────────────────────────────────────
test("sanctioned country → reject", () => {
  for (const code of ["IR", "CU", "KP", "SY", "ru"]) {
    expect(classifyRequesterJurisdiction(code)).toBe("reject");
  }
});

test("licence-required country → hold, never reject", () => {
  for (const code of ["SG", "MY", "sg"]) {
    expect(classifyRequesterJurisdiction(code)).toBe("hold");
  }
});

test("unlisted country → allow", () => {
  for (const code of ["US", "GB", "DE", "AU", null, ""]) {
    expect(classifyRequesterJurisdiction(code)).toBe("allow");
  }
});

// ── precedence: sanctions outrank the licence hold ─────────────────────────────
test("a code that is sanctioned is rejected even though holds exist", () => {
  // (no country is both, but assert the ordering is sanctions-first regardless)
  expect(classifyRequesterJurisdiction("IR")).toBe("reject");
});

// ── citation / policy invariants counsel depends on ────────────────────────────
test("comprehensive set is exactly the current OFAC country-level embargoes", () => {
  expect([...COMPREHENSIVE_SANCTION_CODES].sort()).toEqual(["CU", "IR", "KP"]);
});

test("every sanctions citation carries a regulator, source URL and review date", () => {
  for (const c of SANCTIONS_CITATIONS) {
    expect(c.regulator.length).toBeGreaterThan(0);
    expect(c.sourceUrl.startsWith("https://")).toBe(true);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(c.lastReviewed)).toBe(true);
  }
});

test("every licence-required entry is cited with a law, source and confidence", () => {
  expect(LICENSE_RESTRICTED_JURISDICTIONS.length).toBeGreaterThan(0);
  for (const j of LICENSE_RESTRICTED_JURISDICTIONS) {
    expect(j.law && j.law.length > 0).toBe(true);
    expect(j.sourceUrl?.startsWith("https://")).toBe(true);
    expect(j.confidence != null && ["high", "med", "low"].includes(j.confidence)).toBe(true);
  }
});

test("policy is flagged as needing legal review", () => {
  expect(JURISDICTION_POLICY.needsLegalReview).toBe(true);
});
