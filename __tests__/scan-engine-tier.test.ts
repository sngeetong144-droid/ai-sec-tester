/**
 * scan-engine-tier.test.ts — tier-gated check selection.
 *
 * Pure + offline: exercises the testsForTier selector and the definition sets
 * only. No network, no DB. Proves basic runs the core 5, advanced/enterprise
 * run 15 (core + extended), and that the extended set carries the advisory +
 * interactive keys the paid tiers advertise.
 *
 * Run: bun test __tests__/scan-engine-tier.test.ts
 */
import { test, expect } from "bun:test";
import {
  TEST_DEFINITIONS,
  EXTENDED_TEST_DEFINITIONS,
  testsForTier,
} from "../lib/scan-engine";

const keys = (tier: "basic" | "advanced" | "enterprise" | undefined) =>
  testsForTier(tier).map((d) => d.key);

test("basic (and unset) runs exactly the core 5", () => {
  expect(testsForTier("basic").length).toBe(5);
  expect(testsForTier("basic")).toEqual(TEST_DEFINITIONS);
  expect(testsForTier(undefined).length).toBe(5);
});

test("advanced runs the core 5 + 10 extended = 15", () => {
  expect(testsForTier("advanced").length).toBe(15);
  expect(keys("advanced")).toContain("transport_https");
  expect(keys("advanced")).toContain("supply_chain");
});

test("enterprise runs the same 15 as advanced", () => {
  expect(testsForTier("enterprise").length).toBe(15);
  expect(keys("enterprise")).toEqual(keys("advanced"));
});

test("extended set carries the 3 advisory + 3 interactive OWASP-LLM keys", () => {
  const extended = EXTENDED_TEST_DEFINITIONS.map((d) => d.key);
  for (const k of ["supply_chain", "data_poisoning", "vector_weakness"]) {
    expect(extended).toContain(k);
  }
  for (const k of ["excessive_agency", "misinformation", "unbounded_consumption"]) {
    expect(extended).toContain(k);
  }
});

test("adding a tier never mutates the shared TEST_DEFINITIONS export", () => {
  testsForTier("enterprise");
  expect(TEST_DEFINITIONS.length).toBe(5);
});
