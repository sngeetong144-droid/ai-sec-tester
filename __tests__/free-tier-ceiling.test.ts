import { describe, expect, it, mock, beforeEach, afterEach } from "bun:test";

mock.module("server-only", () => ({}));

/**
 * A 100%-off code is how Creator tests the money path without spending, and how a
 * free-lead offer would work. The gross check treats a merchant coupon as payment
 * — correct — but that also means a 100%-off code on the ENTERPRISE link unlocks a
 * free $497 scan. A lead-magnet code is public by design, so one leaked code buys
 * anyone unlimited enterprise scans and every scan spends real LLM tokens.
 * FREE_SCAN_MAX_TIER caps what a ZERO-CHARGE checkout may unlock.
 */
let row: { id: string; plan: string } | null = { id: "req-1", plan: "Enterprise — $497" };
let updated: string | null = null;

mock.module("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      }),
      update: (v: Record<string, string>) => ({
        eq: () => ({
          eq: () => ({
            select: async () => {
              updated = v.status ?? null;
              return { data: [{ id: "req" }], error: null };
            },
          }),
        }),
      }),
    }),
  }),
}));

const { markRequestPaid } = await import("../app/actions/scan-request-lifecycle");

const ORIGINAL = process.env.FREE_SCAN_MAX_TIER;
beforeEach(() => { updated = null; });
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.FREE_SCAN_MAX_TIER;
  else process.env.FREE_SCAN_MAX_TIER = ORIGINAL;
});

describe("free-tier ceiling on zero-charge checkouts", () => {
  it("REFUSES a 100%-off enterprise scan under the default ceiling", async () => {
    delete process.env.FREE_SCAN_MAX_TIER;
    row = { id: "req-1", plan: "Enterprise — $497" };
    expect(await markRequestPaid("ref-1", 0, 49700)).toBe(false);
    expect(updated).toBeNull();
  });

  it("ALLOWS a 100%-off basic scan — the lead-magnet case", async () => {
    delete process.env.FREE_SCAN_MAX_TIER;
    row = { id: "req-2", plan: "Normal — $47" };
    expect(await markRequestPaid("ref-2", 0, 4700)).toBe(true);
  });

  it("REFUSES a 100%-off advanced scan by default", async () => {
    delete process.env.FREE_SCAN_MAX_TIER;
    row = { id: "req-3", plan: "Advanced — $197" };
    expect(await markRequestPaid("ref-3", 0, 19700)).toBe(false);
  });

  it("lets Creator raise the ceiling to test enterprise for free", async () => {
    process.env.FREE_SCAN_MAX_TIER = "enterprise";
    row = { id: "req-4", plan: "Enterprise — $497" };
    expect(await markRequestPaid("ref-4", 0, 49700)).toBe(true);
  });

  it("does NOT touch a genuinely PAID enterprise checkout", async () => {
    delete process.env.FREE_SCAN_MAX_TIER;
    row = { id: "req-5", plan: "Enterprise — $497" };
    expect(await markRequestPaid("ref-5", 49700, 0)).toBe(true);
  });

  it("still allows a partly-discounted enterprise checkout that was charged", async () => {
    delete process.env.FREE_SCAN_MAX_TIER;
    row = { id: "req-6", plan: "Enterprise — $497" };
    expect(await markRequestPaid("ref-6", 100, 49600)).toBe(true);
  });
});