/**
 * retired-tier.test.ts - pins ruling R-15 (2026-08-02): AI Sec Tester sells TWO
 * tiers, Normal $47 and Advanced $197. The Enterprise $497 tier is RETIRED.
 *
 * Why this file exists: the defect class that cost this project four rounds is
 * fixing the copies you happen to know about and calling it done. A tier lives on
 * many surfaces - a pricing card, a plan <select>, a JSON-LD Offer, an llms.txt
 * line, an upsell CTA. These tests sweep the surfaces as a SET rather than
 * asserting one file at a time, so reintroducing the tier anywhere fails here.
 *
 * Run: bun test __tests__/retired-tier.test.ts
 */
import { test, expect } from "bun:test";
import { PAYMENT_LINKS, SELLABLE_TIERS, isSellable, resolvePaymentLink } from "../lib/payment-links";

const read = (rel: string) => Bun.file(`${import.meta.dir}/../${rel}`).text();

test("exactly two tiers are sellable, and enterprise is not one of them", () => {
  expect([...SELLABLE_TIERS].sort()).toEqual(["advanced", "basic"]);
  expect(isSellable("enterprise")).toBe(false);
  expect(PAYMENT_LINKS.enterprise.retired).toBe(true);
  expect(PAYMENT_LINKS.basic.retired).toBeUndefined();
  expect(PAYMENT_LINKS.advanced.retired).toBeUndefined();
});

test("the enterprise entry SURVIVES in the tier map", () => {
  // Deleting it is the tempting cleanup and it is unsafe twice over:
  //  1. markRequestPaid computes expectedCents from resolvePaymentLink and only
  //     enforces the underpayment guard `if (expectedCents > 0)`. A null resolve
  //     turns the guard OFF for legacy Enterprise rows - fail-open.
  //  2. Defence in depth against a stale Enterprise plan string. The three rows
  //     that carried one were purged 2026-08-02 as test traffic (no payment ever
  //     settled on any of them); zero remain. The key stays because it costs
  //     nothing and it is what keeps reason 1 from going live again.
  expect(PAYMENT_LINKS.enterprise.priceUsd).toBe(497);
});

test("the underpayment guard still resolves a legacy Enterprise plan string", () => {
  for (const legacy of ["Enterprise - $497", "enterprise", "ENTERPRISE"]) {
    const link = resolvePaymentLink(legacy);
    expect(link).not.toBeNull();
    // expectedCents must be non-zero or markRequestPaid skips the check entirely.
    expect((link?.priceUsd ?? 0) * 100).toBeGreaterThan(0);
  }
});

test("no public buying surface names the retired tier", async () => {
  const SURFACES = [
    "app/_components/landing.tsx",
    "app/_components/landing-client.tsx",
    "app/_components/faq.tsx",
    "app/_components/deep-scan-cta.tsx",
    "public/llms.txt",
    // The landing chat bubble's system prompt. It hardcoded "Enterprise $497" and
    // survived the first pass of this retirement: it is a PRICE QUOTE surface that
    // does not look like one, and the prompt forbids the bot inventing a price, so
    // whatever is in that string is what a visitor gets told. Found only by an
    // adversarial sweep after the file-by-file pass called itself done.
    "lib/chat-assistant.ts",
  ];
  for (const rel of SURFACES) {
    const src = await read(rel);
    const code = src
      // Strip comments: an explanatory note saying WHY the tier is gone is fine;
      // rendered copy and live price references are not.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      // Strip the /enterprise ROUTE PATH. The route is deliberately retained - it
      // is the ownership-verification funnel (writing enterprise_requests), which
      // R-15 did not retire, and it is linked externally. What must not survive is
      // the tier: its NAME as customer-visible copy, and its PRICE.
      .replace(/\/enterprise\b/g, "/__route__");
    expect(code).not.toMatch(/enterprise/i);
    expect(code).not.toContain("497");
  }
});

test("the plan selector offers only sellable tiers", async () => {
  const src = await read("app/_components/landing-client.tsx");
  // Must be derived from SELLABLE_TIERS, never a hand-written literal list -
  // a hand-written list is what silently kept the retired tier orderable.
  expect(src).toContain("SELLABLE_TIERS");
  expect(src).not.toMatch(/\[\s*"basic"\s*,\s*"advanced"\s*,\s*"enterprise"\s*\]/);
});

test("the JSON-LD offer list quotes only sellable tiers", async () => {
  const src = await read("app/_components/faq.tsx");
  const offers = src.match(/"@type": "Offer"/g) ?? [];
  expect(offers.length).toBe(SELLABLE_TIERS.length);
});

test("the deep-scan upsell sells Advanced, not the retired tier", async () => {
  const cta = await read("app/_components/deep-scan-cta.tsx");
  expect(cta).toContain("PAYMENT_LINKS.advanced.priceUsd");
  expect(cta).not.toContain("PAYMENT_LINKS.enterprise");

  const route = await read("app/api/deep-scan/route.ts");
  expect(route).toContain('resolvePaymentLink("advanced")');
  expect(route).not.toContain('resolvePaymentLink("enterprise")');
});

test("the landing pricing grid matches the number of sellable tiers", async () => {
  // A 3-column grid with 2 cards leaves a dead column. The layout is part of the
  // retirement, not a cosmetic afterthought.
  const css = await read("app/landing.css");
  const grid = css.match(/\.aist-landing \.price \{[^}]*\}/)?.[0] ?? "";
  expect(grid).toContain(`repeat(${SELLABLE_TIERS.length}, 1fr)`);
});
