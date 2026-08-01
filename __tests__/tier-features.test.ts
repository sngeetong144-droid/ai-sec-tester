/**
 * tier-features.test.ts — the shared tier bullet list (lib/tier-features.ts).
 *
 * Why this exists: the bullets were byte-identical in three files. A fix was once
 * applied to the copy that was imported NOWHERE, shipped green, and left both live
 * surfaces unchanged — a wrong-artifact edit that only a browser check caught.
 * These tests pin the single-definition invariant so the split cannot come back
 * silently.
 *
 * Run: bun test __tests__/tier-features.test.ts
 */
import { test, expect } from "bun:test";
import { TIER_FEATURES } from "../lib/tier-features";
import { PAYMENT_LINKS } from "../lib/payment-links";

test("every priced tier has feature bullets", () => {
  for (const tier of Object.keys(PAYMENT_LINKS)) {
    expect(TIER_FEATURES[tier as keyof typeof TIER_FEATURES]?.length ?? 0).toBeGreaterThan(0);
  }
});

test("no tier bullets beyond the priced tiers", () => {
  // A bullet set with no price behind it is copy for a product nobody can buy.
  expect(Object.keys(TIER_FEATURES).sort()).toEqual(Object.keys(PAYMENT_LINKS).sort());
});

test("the dead duplicate component is gone", async () => {
  // app/_components/pricing-tiers.tsx was exported and imported zero times.
  const dead = Bun.file(`${import.meta.dir}/../app/_components/pricing-tiers.tsx`);
  expect(await dead.exists()).toBe(false);
});

test("neither live surface redeclares its own bullet array", async () => {
  // The whole point of the shared module: catch a re-duplication at test time
  // rather than after a wrong-artifact edit ships.
  for (const rel of ["../app/_components/landing.tsx", "../app/command-center/products/page.tsx"]) {
    const src = await Bun.file(`${import.meta.dir}/${rel}`).text();
    expect(src).toContain("TIER_FEATURES");
    expect(src).not.toContain("features: [");
  }
});

test("bullets claiming automatic dispatch are not reintroduced as priority claims", () => {
  // "Priority scan processing" was false — the dispatcher had no ORDER BY at all.
  const all = Object.values(TIER_FEATURES).flat().join(" ").toLowerCase();
  expect(all).not.toContain("priority");
});