/**
 * payment-webhook.test.ts — the Stripe settlement webhook (app/api/stripe/webhooks).
 *
 * Proves the money path:
 *   1. invalid / missing signature → 400, and NO state change
 *   2. valid checkout.session.completed(paid) → scan_request flips to paid_scanning
 *   3. duplicate delivery → NO-OP (conditional update matches 0 rows: no second scan,
 *      no second email — this handler triggers neither; scans run from the cron job).
 *
 * The real markRequestPaid runs against a mocked service client that models ONE
 * scan_request row + its conditional-update semantics, so idempotency is exercised
 * for real, not stubbed.
 *
 * Run: bun test __tests__/payment-webhook.test.ts
 */
import { test, expect, mock, beforeEach } from "bun:test";

process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";

// ── one mutable fake row + spies ───────────────────────────────────────────────
let row: { id: string; stripe_client_reference_id: string; status: string; plan: string | null };
let activateCalls = 0;

function resetRow() {
  row = {
    id: "req-1",
    stripe_client_reference_id: "ref-123",
    status: "approved_awaiting_payment",
    plan: null,
  };
  activateCalls = 0;
}
resetRow();

// Minimal supabase query-builder double. Supports the two markRequestPaid shapes:
//   read : .select().eq().eq().maybeSingle()  → returns the row if filters match
//   write: .update().eq().eq().select()       → conditional update (awaited builder)
function makeClient() {
  return {
    from(table: string) {
      const state: { patch: Record<string, unknown> | null; filters: Record<string, string> } = {
        patch: null,
        filters: {},
      };
      const matches = () => {
        const refOk =
          state.filters["stripe_client_reference_id"] === row.stripe_client_reference_id ||
          state.filters["id"] === row.id;
        const statusOk = !("status" in state.filters) || state.filters["status"] === row.status;
        return refOk && statusOk;
      };
      const builder = {
        update(patch: Record<string, unknown>) {
          state.patch = patch;
          return builder;
        },
        select() {
          return builder;
        },
        eq(col: string, val: string) {
          state.filters[col] = val;
          return builder;
        },
        // read terminal
        maybeSingle() {
          if (table === "scan_requests" && matches()) {
            return Promise.resolve({ data: { id: row.id, plan: row.plan }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        // write terminal — `await builder` after .update().eq().eq().select()
        then(
          resolve: (v: { data: unknown[]; error: null }) => unknown,
          reject?: (e: unknown) => unknown,
        ) {
          let result: { data: unknown[]; error: null };
          if (table === "scan_requests" && state.patch && matches()) {
            Object.assign(row, state.patch);
            result = { data: [{ id: row.id }], error: null };
          } else {
            result = { data: [], error: null };
          }
          return Promise.resolve(result).then(resolve, reject);
        },
      };
      return builder;
    },
  };
}

mock.module("@/lib/supabase/service", () => ({ createServiceClient: () => makeClient() }));
mock.module("@/lib/supabase/server", () => ({ createClient: async () => makeClient() }));
mock.module("@/lib/command-center/queries", () => ({
  activateCase: async () => {
    activateCalls++;
    return null;
  },
}));
mock.module("@/lib/stripe", () => ({
  constructWebhookEvent: (payload: string, signature: string) => {
    if (signature !== "good") throw new Error("signature verification failed");
    return JSON.parse(payload);
  },
}));

// Import AFTER mocks are registered.
const { POST } = await import("../app/api/stripe/webhooks/route");

function paidEvent() {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: { client_reference_id: "ref-123", payment_status: "paid", metadata: {} },
    },
  });
}

// A settled checkout carrying a MISMATCHED (too-low) amount_total for the row's tier.
function underpaidEvent(amountTotalCents: number) {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "ref-123",
        payment_status: "paid",
        amount_total: amountTotalCents,
        metadata: {},
      },
    },
  });
}

// A settled checkout where a merchant-issued promotion code covered part or all
// of the price: amount_total is the NET charge, total_details.amount_discount is
// what the coupon absorbed.
function discountedEvent(amountTotalCents: number, discountCents: number) {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "ref-123",
        payment_status: "paid",
        amount_total: amountTotalCents,
        total_details: { amount_discount: discountCents },
        metadata: {},
      },
    },
  });
}

// Stripe reports a FULLY DISCOUNTED checkout as "no_payment_required" — there was
// no charge to make. Requiring "paid" made a 100%-off redemption a silent no-op.
function freeSettledEvent(discountCents: number) {
  return JSON.stringify({
    type: "checkout.session.completed",
    data: {
      object: {
        client_reference_id: "ref-123",
        payment_status: "no_payment_required",
        amount_total: 0,
        total_details: { amount_discount: discountCents },
        metadata: {},
      },
    },
  });
}

function req(body: string, signature: string | null): Request {
  const headers: Record<string, string> = {};
  if (signature !== null) headers["stripe-signature"] = signature;
  return new Request("http://localhost/api/stripe/webhooks", {
    method: "POST",
    body,
    headers,
  });
}

beforeEach(resetRow);

test("invalid signature → 400 and no state change", async () => {
  const res = await POST(req(paidEvent(), "bad"));
  expect(res.status).toBe(400);
  expect(row.status).toBe("approved_awaiting_payment");
});

test("missing signature → 400 and no state change", async () => {
  const res = await POST(req(paidEvent(), null));
  expect(res.status).toBe(400);
  expect(row.status).toBe("approved_awaiting_payment");
});

test("valid paid webhook → scan_request flips to paid_scanning", async () => {
  const res = await POST(req(paidEvent(), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("paid_scanning");
  // The client_reference_id path must NOT touch the legacy cc_cases activation.
  expect(activateCalls).toBe(0);
});

test("duplicate delivery → no-op (no second flip, no second scan/email)", async () => {
  // first delivery flips it
  await POST(req(paidEvent(), "good"));
  expect(row.status).toBe("paid_scanning");

  // second delivery: conditional update matches 0 rows → unchanged, no side effects
  const res = await POST(req(paidEvent(), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("paid_scanning");
  expect(activateCalls).toBe(0);
});

test("underpayment (basic price on an enterprise request) → no flip", async () => {
  row.plan = "enterprise"; // quoted $497 = 49700c
  const res = await POST(req(underpaidEvent(4700), "good")); // paid basic $47
  expect(res.status).toBe(200);
  expect(row.status).toBe("approved_awaiting_payment"); // stayed unpaid — not unlocked
});


// Promotion codes. A 100%-off coupon is how the owner exercises the money path
// without spending; before this, gross was never considered, so Stripe reported a
// validly-paid checkout and markRequestPaid refused to activate it — the customer
// pays (or redeems) and the scan silently never runs.
test("100%-off promotion code → still activates (gross covers the quoted price)", async () => {
  row.plan = "Normal — $47";
  const res = await POST(req(discountedEvent(0, 4700), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("paid_scanning");
});

test("partial promotion code → activates when paid + discount meets the quote", async () => {
  row.plan = "Normal — $47";
  const res = await POST(req(discountedEvent(2700, 2000), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("paid_scanning");
});

test("discount does NOT defeat the cross-tier underpayment guard", async () => {
  row.plan = "enterprise"; // quoted $497 = 49700c
  // Basic-price checkout plus a small coupon still falls far short of the quote.
  const res = await POST(req(discountedEvent(4700, 500), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("approved_awaiting_payment");
});


test("100%-off checkout reported as no_payment_required → still activates", async () => {
  row.plan = "Normal — $47";
  const res = await POST(req(freeSettledEvent(4700), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("paid_scanning");
});

test("no_payment_required without a covering discount → does NOT activate", async () => {
  row.plan = "Normal — $47";
  // A zero-value session with no discount recorded is not a settled $47 sale.
  const res = await POST(req(freeSettledEvent(0), "good"));
  expect(res.status).toBe(200);
  expect(row.status).toBe("approved_awaiting_payment");
});
