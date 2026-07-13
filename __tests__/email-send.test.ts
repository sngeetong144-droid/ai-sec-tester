/**
 * email-send.test.ts — real-send + operator-notify logic (BUILD 1).
 *
 * Covers lib/email.ts (sendEmail gate, operator resolver, new-request alert) and
 * app/command-center/_email.ts queueEmail — now LOG-ONLY (audit row, never
 * sends; delivery is owned solely by deliverComposedEmail behind its launch gate).
 * The Resend HTTP boundary is stubbed via a captured global fetch; Supabase is
 * mocked. No network, no DB.
 *
 * Run: bun test __tests__/email-send.test.ts
 */
import { test, expect, beforeEach, afterEach } from "bun:test";
import { mock } from "bun:test";

mock.module("server-only", () => ({}));

// ── capture Resend calls via global fetch ────────────────────────────────────
interface FetchCall {
  url: string;
  body: Record<string, unknown>;
  auth: string | null;
}
let fetchCalls: FetchCall[] = [];
let fetchStatus = 200;
const realFetch = globalThis.fetch;

function installFetch() {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    fetchCalls.push({
      url: String(url),
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
      auth: new Headers(init?.headers).get("Authorization"),
    });
    return new Response(fetchStatus === 200 ? JSON.stringify({ id: "re_1" }) : "bad", {
      status: fetchStatus,
    });
  }) as typeof fetch;
}

// ── capture cc_email_log inserts ─────────────────────────────────────────────
let logInserts: Array<Record<string, unknown>> = [];
mock.module("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        logInserts.push(row);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

const { sendEmail, resolveOperatorEmail, sendNewRequestAlert, sendRequesterAck } =
  await import("../lib/email");
const { queueEmail } = await import("../app/command-center/_email");

beforeEach(() => {
  fetchCalls = [];
  logInserts = [];
  fetchStatus = 200;
  delete process.env.RESEND_API_KEY;
  delete process.env.ADMIN_EMAILS;
  installFetch();
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

// ── sendEmail gate ───────────────────────────────────────────────────────────
test("sendEmail skips (no send) when RESEND_API_KEY is unset", async () => {
  const r = await sendEmail({ from: "a@x.com", to: "b@y.com", subject: "s", text: "t" });
  expect(r.skipped).toBe(true);
  expect(r.ok).toBe(false);
  expect(fetchCalls.length).toBe(0);
});

test("sendEmail POSTs to Resend with bearer auth when key is set", async () => {
  process.env.RESEND_API_KEY = "re_test";
  const r = await sendEmail({ from: "a@x.com", to: "b@y.com", subject: "s", text: "t" });
  expect(r.ok).toBe(true);
  expect(fetchCalls.length).toBe(1);
  expect(fetchCalls[0].url).toContain("api.resend.com");
  expect(fetchCalls[0].auth).toBe("Bearer re_test");
});

test("sendEmail returns error (not throw) on non-2xx Resend response", async () => {
  process.env.RESEND_API_KEY = "re_test";
  fetchStatus = 422;
  const r = await sendEmail({ from: "a@x.com", to: "b@y.com", subject: "s", text: "t" });
  expect(r.ok).toBe(false);
  expect(r.error).toContain("422");
});

// ── operator resolver ────────────────────────────────────────────────────────
test("resolveOperatorEmail uses first ADMIN_EMAILS entry", () => {
  process.env.ADMIN_EMAILS = "ops@corp.com, second@corp.com";
  expect(resolveOperatorEmail()).toBe("ops@corp.com");
});

test("resolveOperatorEmail falls back to thesoulsofai@gmail.com when unset", () => {
  expect(resolveOperatorEmail()).toBe("thesoulsofai@gmail.com");
});

// ── new-request alert ────────────────────────────────────────────────────────
test("sendNewRequestAlert sends from verified domain to resolved operator w/ intake link", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.ADMIN_EMAILS = "ops@corp.com";
  const r = await sendNewRequestAlert({
    requestId: "req-123",
    requesterName: "Ada",
    requesterEmail: "ada@corp.example",
    company: "Acme",
    targetUrl: "https://example.com",
    status: "pending_review",
    triageVerdict: "low",
    triageScore: 0,
  });
  expect(r.ok).toBe(true);
  const body = fetchCalls[0].body;
  expect(String(body.from)).toContain("@thesoulsofai.com");
  expect(String(body.from)).not.toContain("gmail");
  expect(body.to).toBe("ops@corp.com");
  expect(String(body.html)).toContain("/command-center/intake");
  expect(String(body.html)).toContain("req-123");
});

test("sendNewRequestAlert is a no-op skip in dev (no key) — never a loop of sends", async () => {
  const r = await sendNewRequestAlert({
    requestId: "req-1",
    requesterName: "Ada",
    requesterEmail: "ada@corp.example",
    company: null,
    targetUrl: "https://example.com",
    status: "rejected",
    triageVerdict: null,
    triageScore: null,
  });
  expect(r.skipped).toBe(true);
  expect(fetchCalls.length).toBe(0);
});

// ── requester ack ────────────────────────────────────────────────────────────
test("sendRequesterAck emails the requester from the verified domain with the request id", async () => {
  process.env.RESEND_API_KEY = "re_test";
  const r = await sendRequesterAck({
    requesterName: "Ada",
    requesterEmail: "ada@corp.example",
    targetUrl: "https://example.com",
    requestId: "req-123",
  });
  expect(r.ok).toBe(true);
  const body = fetchCalls[0].body;
  expect(body.to).toBe("ada@corp.example");
  expect(String(body.from)).toContain("@thesoulsofai.com");
  expect(String(body.html)).toContain("req-123");
  // No fabricated turnaround promise.
  expect(String(body.html)).not.toContain("seconds");
});

// ── queueEmail: LOG-ONLY (audit row always, never sends) ─────────────────────
const COMPOSED = {
  kind: "approval" as const,
  toEmail: "customer@corp.example",
  subject: "Approved",
  body: "Hi Ada,\n\nPay to activate.\n\n— AI Sec Tester",
};

test("queueEmail writes the cc_email_log audit row and NEVER sends (even with key set)", async () => {
  // Log-only by design: delivery is owned solely by deliverComposedEmail behind
  // the CC_EMAIL_SEND_ENABLED gate. queueEmail sending here caused double-sends
  // and bypassed that launch gate.
  process.env.RESEND_API_KEY = "re_test";
  await queueEmail("case-1", COMPOSED);
  expect(logInserts.length).toBe(1);
  expect(logInserts[0].kind).toBe("approval");
  expect(logInserts[0].to_email).toBe("customer@corp.example");
  expect(fetchCalls.length).toBe(0);
});

test("queueEmail logs (audit) and does not send when no recipient", async () => {
  process.env.RESEND_API_KEY = "re_test";
  await queueEmail("case-2", { ...COMPOSED, toEmail: "" });
  expect(logInserts.length).toBe(1);
  expect(fetchCalls.length).toBe(0);
});

test("queueEmail logs and does not send in dev (no key)", async () => {
  await queueEmail("case-3", COMPOSED);
  expect(logInserts.length).toBe(1);
  expect(fetchCalls.length).toBe(0);
});
