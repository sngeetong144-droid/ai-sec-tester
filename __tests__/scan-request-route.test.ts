/**
 * scan-request-route.test.ts — POST /api/scan-request handler behavior.
 *
 * The route's own logic is under test; every I/O boundary is mocked so the run
 * is deterministic and offline:
 *   - next/headers          → fixed Headers (fixed requester IP)
 *   - @/lib/geo             → controlled server-resolved TARGET country
 *   - @/lib/triage.runTriage → benign result (no DNS/fetch); real geoFlag kept
 *   - @/lib/supabase/service → captures the inserted row, no DB
 *   - @/lib/audit-log       → no-op
 * lookupIpCountry / lookupIpNetworkType are gated off by DISABLE_TARGET_GEOLOOKUP.
 *
 * Run: bun test __tests__/scan-request-route.test.ts
 */
import { test, expect, mock, beforeEach } from "bun:test";

process.env.DISABLE_TARGET_GEOLOOKUP = "true";

// Capture the REAL triage exports before mocking so the mock can re-export the
// real geoFlag (jurisdiction-review imports it) and override only runTriage.
import * as realTriage from "../lib/triage";

let targetCountry: string | null = null;
let lastInsert: Record<string, unknown> | null = null;
let insertCalled = 0;

mock.module("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9", "user-agent": "test-agent" }),
}));

mock.module("@/lib/geo", () => ({
  resolveTargetGeo: async () => ({ host: "example.com", ip: "203.0.113.1", country: targetCountry }),
}));

mock.module("@/lib/triage", () => ({
  ...realTriage,
  runTriage: async () => ({
    score: 0,
    verdict: "low",
    recommendation: "approve",
    flags: [],
    summary: "test",
  }),
}));

mock.module("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertCalled += 1;
        lastInsert = row;
        return {
          select: () => ({
            single: async () => ({ data: { id: "test-id" }, error: null }),
          }),
        };
      },
    }),
  }),
}));

mock.module("@/lib/audit-log", () => ({ recordScanAudit: async () => {} }));

// Dynamic import AFTER mocks so the whole route graph binds to the mocked registry.
const { POST } = await import("../app/api/scan-request/route");
const { __resetRateLimit } = await import("../lib/rate-limit");

function callPost(body: Record<string, unknown>) {
  return POST({ json: async () => body } as never);
}

const VALID = {
  name: "Ada Lovelace",
  email: "ada@corp.example",
  target: "https://example.com",
  countryDeclared: "US",
  countryDeclaredName: "United States",
  authorized: true,
  dueDiligenceConsent: true,
};

beforeEach(() => {
  targetCountry = null;
  lastInsert = null;
  insertCalled = 0;
  __resetRateLimit();
});

test("missing consent → 400 and no insert", async () => {
  const res = await callPost({ ...VALID, authorized: false });
  expect(res.status).toBe(400);
  expect(insertCalled).toBe(0);
});

test("subscribed_platform=true without provider_notified → 400", async () => {
  const res = await callPost({ ...VALID, subscribedPlatform: true /* providerNotified omitted */ });
  expect(res.status).toBe(400);
  expect(insertCalled).toBe(0);
});

test("subscribed_platform=true WITH provider_notified → accepted", async () => {
  const res = await callPost({
    ...VALID,
    subscribedPlatform: true,
    providerNotified: true,
    providerName: "Acme Bot Platform",
  });
  expect(res.status).toBe(200);
  expect(insertCalled).toBe(1);
  expect(lastInsert?.subscribed_platform).toBe(true);
  expect(lastInsert?.provider_notified).toBe(true);
});

test("honeypot filled → 200 and no insert", async () => {
  const res = await callPost({ ...VALID, website: "i-am-a-bot" });
  expect(res.status).toBe(200);
  expect(insertCalled).toBe(0);
});

test("comprehensive-sanctions target → inserted as rejected", async () => {
  targetCountry = "IR"; // Iran — comprehensive embargo
  const res = await callPost({ ...VALID });
  expect(res.status).toBe(200); // uniform public response
  expect(insertCalled).toBe(1);
  expect(lastInsert?.status).toBe("rejected");
  expect(String(lastInsert?.rejection_reason)).toContain("IR");
});

test("licence-required target → pending_review, NOT rejected", async () => {
  targetCountry = "SG"; // Singapore — licence-regulated (hold, never auto-reject)
  const res = await callPost({ ...VALID });
  expect(res.status).toBe(200);
  expect(insertCalled).toBe(1);
  expect(lastInsert?.status).toBe("pending_review");
  const flags = lastInsert?.triage_flags as Array<{ code: string }>;
  expect(flags.some((f) => f.code === "LICENSE_RESTRICTED_TARGET")).toBe(true);
});

test("clean request → pending_review with server-resolved + claimed geo persisted", async () => {
  targetCountry = "US";
  const res = await callPost({ ...VALID, targetGeo: { cc: "US", name: "United States" } });
  expect(res.status).toBe(200);
  expect(lastInsert?.status).toBe("pending_review");
  const tg = lastInsert?.target_geo as { resolved: { country: string }; claimed: unknown };
  expect(tg.resolved.country).toBe("US");
  expect(tg.claimed).toEqual({ cc: "US", name: "United States" });
});
