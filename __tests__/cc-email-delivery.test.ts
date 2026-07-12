/**
 * cc-email-delivery.test.ts — the outbound gate for command-center lifecycle
 * emails (lib/email-templates.ts deliverComposedEmail).
 *
 * Proves the HARD GATE: nothing goes to Resend unless BOTH RESEND_API_KEY and
 * CC_EMAIL_SEND_ENABLED=true are set; and that a delivery attempt never throws
 * (so the calling approve/reject/report action still completes its state change).
 *
 * Run: bun test __tests__/cc-email-delivery.test.ts
 */
import { test, expect, afterEach, mock } from "bun:test";

// `server-only` is a Next build-time marker with no npm package; stub it (repo pattern).
mock.module("server-only", () => ({}));
const { deliverComposedEmail } = await import("../lib/email-templates");

const composed = {
  kind: "approval" as const,
  toEmail: "customer@example.com",
  subject: "Approved — pay to activate",
  body: "Hi there,\nPay here: https://link.example/pay\n— AI Sec Tester",
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.RESEND_API_KEY;
  delete process.env.CC_EMAIL_SEND_ENABLED;
});

function spyFetch(response: { ok: boolean; status?: number }) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: response.ok,
      status: response.status ?? (response.ok ? 200 : 500),
      text: async () => "err",
    } as Response;
  }) as typeof fetch;
  return calls;
}

test("gated off when no RESEND_API_KEY — no network call", async () => {
  process.env.CC_EMAIL_SEND_ENABLED = "true";
  const calls = spyFetch({ ok: true });
  const res = await deliverComposedEmail(composed);
  expect(res.sent).toBe(false);
  expect(calls.length).toBe(0);
});

test("gated off when CC_EMAIL_SEND_ENABLED is not 'true' — no network call", async () => {
  process.env.RESEND_API_KEY = "re_test";
  const calls = spyFetch({ ok: true });
  const res = await deliverComposedEmail(composed);
  expect(res.sent).toBe(false);
  expect(calls.length).toBe(0);
});

test("both flags set → posts to Resend with the composed payload", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.CC_EMAIL_SEND_ENABLED = "true";
  const calls = spyFetch({ ok: true });
  const res = await deliverComposedEmail(composed);
  expect(res.sent).toBe(true);
  expect(calls.length).toBe(1);
  expect(calls[0].url).toContain("resend.com");
  const payload = JSON.parse(String(calls[0].init.body));
  expect(payload.to).toBe("customer@example.com");
  expect(payload.subject).toBe(composed.subject);
  expect(payload.html).toContain("Pay here:");
});

test("report kind appends the download link when a reportUrl is given", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.CC_EMAIL_SEND_ENABLED = "true";
  const calls = spyFetch({ ok: true });
  await deliverComposedEmail({ ...composed, kind: "report" }, { reportUrl: "https://sig.example/r.txt" });
  const payload = JSON.parse(String(calls[0].init.body));
  expect(payload.html).toContain("https://sig.example/r.txt");
  expect(payload.from).toContain("reports@");
});

test("delivery is enabled but recipient is empty → no send, no throw", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.CC_EMAIL_SEND_ENABLED = "true";
  const calls = spyFetch({ ok: true });
  const res = await deliverComposedEmail({ ...composed, toEmail: "" });
  expect(res.sent).toBe(false);
  expect(calls.length).toBe(0);
});

test("Resend error response → sent:false, never throws", async () => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.CC_EMAIL_SEND_ENABLED = "true";
  spyFetch({ ok: false, status: 422 });
  const res = await deliverComposedEmail(composed);
  expect(res.sent).toBe(false);
  expect(res.reason).toContain("422");
});
