/**
 * Regression test for the ownership + audit gate (docs/reviews/2026-07-01
 * -ownership-audit-gate-review.md). Proves the two CRITICALs are closed:
 *
 *   1. Ownership verification writes verified_at/proof_hash only through the
 *      service-role client — the anon/authenticated-bound client (the one
 *      RLS actually restricts) is never asked to perform that mutation.
 *   2. Deep-scan rejects a request where the verified proof's domain does
 *      not match the scan's actual target (proof-not-bound-to-target).
 *
 * Run: bun test __tests__/ownership-gate.test.ts
 */
import { test, expect, mock } from "bun:test";

// ── Test 1 — CRITICAL #1: anon client never performs the verified_at/proof_hash update ──
test("ownership verify stamps verified_at/proof_hash via service-role only, never via the anon/authenticated client", async () => {
  const anonUpdateCalls: unknown[] = [];
  const serviceUpdateCalls: unknown[] = [];

  mock.module("@/lib/supabase/server", () => ({
    createClient: async () => ({
      from: () => ({
        // If the fix regresses and the anon-bound client is used for the
        // write again, this records it so the assertion below catches it.
        update: (payload: unknown) => {
          anonUpdateCalls.push(payload);
          return { eq: async () => ({ data: null, error: null }) };
        },
      }),
    }),
  }));

  mock.module("@/lib/supabase/service", () => ({
    createServiceClient: () => ({
      from: () => ({
        // ownership_tokens reads are service-role-only (0003) — the route
        // now reads the challenge row via this client too.
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "proof-1",
                target_domain: "owned.example.com",
                token: "aist-verify=abc",
                verified_at: null,
              },
              error: null,
            }),
          }),
        }),
        update: (payload: unknown) => {
          serviceUpdateCalls.push(payload);
          return { eq: async () => ({ data: null, error: null }) };
        },
      }),
    }),
  }));

  mock.module("@/lib/ownership-verification", () => ({
    verifyChallengeSync: async () => ({ verified: true, proof_hash: "sha256:abc" }),
    // bun's module mock registry is process-global (persists across tests in
    // this file), and deep-scan/route.ts also imports extractDomain from
    // this module — so the mock must keep exporting a real implementation
    // rather than dropping it.
    extractDomain: (input: string): string | null => {
      const raw = String(input ?? "").trim();
      if (!raw) return null;
      try {
        return new URL(raw.includes("://") ? raw : "https://" + raw).hostname.toLowerCase();
      } catch {
        return null;
      }
    },
  }));

  const { POST } = await import("../app/api/ownership/verify/route");

  const res = await POST(
    new Request("http://localhost/api/ownership/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proof_id: "proof-1" }),
    }),
  );
  const body = await res.json();

  expect(body.verified).toBe(true);
  expect(serviceUpdateCalls.length).toBe(1); // stamped via service-role
  expect(anonUpdateCalls.length).toBe(0); // never attempted via the RLS-bound client
});

// ── Test 2 — CRITICAL #2: deep-scan rejects a proof/target mismatch ──
test("deep-scan rejects when the verified proof's domain does not match the scan's target", async () => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";

  const stripeCreateCalls: unknown[] = [];
  const auditCalls: unknown[] = [];

  mock.module("@/lib/stripe", () => ({
    stripe: {
      checkout: {
        sessions: {
          create: async (input: unknown) => {
            stripeCreateCalls.push(input);
            return { url: "https://checkout.stripe.com/fake" };
          },
        },
      },
    },
    stripeAccountOptions: () => ({}),
  }));

  mock.module("@/lib/audit-log", () => ({
    recordScanAudit: async (input: unknown) => {
      auditCalls.push(input);
    },
  }));

  mock.module("@/lib/queries", () => ({
    getRequestIdentity: async () => ({ userId: "user-1", sessionId: null }),
    // Attacker legitimately owns and verified this domain...
    getVerifiedOwnership: async () => ({
      id: "proof-1",
      target_domain: "owned-by-attacker.example.com",
      email: null,
      proof_hash: null,
    }),
    // ...but scanId points at a completely different ("victim") target.
    getScan: async () => ({
      id: "victim-scan",
      target_url: "https://victim.example.com",
      created_at: "",
      completed_at: null,
      target_label: null,
      email: null,
      session_id: null,
      authorized: true,
      status: "complete",
      score: null,
      tests_total: 5,
      tests_passed: 0,
      verdict: null,
      summary: null,
    }),
  }));

  const { POST } = await import("../app/api/deep-scan/route");

  const res = await POST(
    new Request("http://localhost/api/deep-scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scanId: "victim-scan",
        ownership_proof_id: "proof-1",
      }),
    }),
  );
  const body = await res.json();

  expect(res.status).toBe(403);
  expect(String(body.error)).toContain("does not match");
  expect(stripeCreateCalls.length).toBe(0); // no checkout session on a mismatched target
  expect(auditCalls.length).toBe(0); // rejected before the audit/payment step
});
