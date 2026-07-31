/**
 * site-leads-routes.test.ts — POST /api/starter-map and POST /api/contact.
 *
 * Both routes existed only as lies before this: the marketing starter-map form
 * promised an email nobody sent, and the ChatBubble discarded the message. The
 * load-bearing guarantee under test is PERSIST-FIRST: the lead lands in
 * site_leads even when email delivery is gated off or fails.
 *
 * Every I/O boundary is mocked (next/headers, supabase service client, sendEmail)
 * so the run is deterministic and offline.
 *
 * Run: bun test __tests__/site-leads-routes.test.ts
 */
import { test, expect, mock, beforeEach } from "bun:test";

let inserts: Array<{ table: string; row: Record<string, unknown> }> = [];
let insertError: { message: string } | null = null;
let sends: Array<Record<string, unknown>> = [];
let sendThrows = false;

mock.module("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
}));

mock.module("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        inserts.push({ table, row });
        return { error: insertError };
      },
    }),
  }),
}));

mock.module("@/lib/email", () => ({
  esc: (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
  sendEmail: async (payload: Record<string, unknown>) => {
    if (sendThrows) throw new Error("resend down");
    sends.push(payload);
    return { ok: true };
  },
  // Stubbed for the same reason as scan-request-route.test.ts: this factory
  // replaces @/lib/email for the entire run, so any export it omits vanishes
  // from every other route graph loaded afterwards.
  resolveOperatorEmail: () => "operator@example.com",
  sendRequesterAck: async () => ({ ok: true }),
  sendNewRequestAlert: async () => ({ ok: true }),
}));

const { POST: starterMap, OPTIONS: starterMapOptions } = await import("../app/api/starter-map/route");
const { POST: contact } = await import("../app/api/contact/route");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = (body: unknown) =>
  new Request("https://scan.thesoulsofai.com/api/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const enableEmail = () => {
  process.env.CC_EMAIL_SEND_ENABLED = "true";
  process.env.RESEND_API_KEY = "re_test";
  process.env.OWNER_EMAIL = "ops@example.com";
};

beforeEach(() => {
  inserts = [];
  sends = [];
  insertError = null;
  sendThrows = false;
  delete process.env.CC_EMAIL_SEND_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.OWNER_EMAIL;
});

// ── starter-map ─────────────────────────────────────────────────────────────
test("starter-map: honeypot filled → 200 ok, nothing persisted, nothing sent", async () => {
  const res = await starterMap(post({ name: "Bot", email: "b@x.com", website: "spam" }));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(inserts.length).toBe(0);
  expect(sends.length).toBe(0);
});

test("starter-map: invalid email → 400, no insert", async () => {
  const res = await starterMap(post({ name: "Ada", email: "not-an-email" }));
  expect(res.status).toBe(400);
  expect((await res.json()).ok).toBe(false);
  expect(inserts.length).toBe(0);
});

test("starter-map: over-long name → 400", async () => {
  const res = await starterMap(post({ name: "a".repeat(81), email: "a@b.com" }));
  expect(res.status).toBe(400);
});

test("starter-map: email gate OFF → lead is STILL persisted, 200 ok", async () => {
  const res = await starterMap(post({ name: "Ada", email: "ada@example.com", country: "SG" }));
  expect(res.status).toBe(200);
  expect(sends.length).toBe(0);
  expect(inserts.length).toBe(1);
  expect(inserts[0].table).toBe("site_leads");
  expect(inserts[0].row).toMatchObject({
    name: "Ada",
    email: "ada@example.com",
    country: "SG",
    lead: "starter-map",
    ip: "203.0.113.9",
  });
});

test("starter-map: gate ON → lead persisted AND PDF link emailed to requester", async () => {
  enableEmail();
  const res = await starterMap(post({ name: "Ada", email: "ada@example.com" }));
  expect(res.status).toBe(200);
  expect(inserts.length).toBe(1);
  expect(sends.length).toBe(1);
  expect(sends[0].to).toBe("ada@example.com");
  expect(String(sends[0].html)).toContain(
    "https://thesoulsofai.com/downloads/solo-empire-starter-map.pdf",
  );
});

test("starter-map: email throws → lead is NOT lost, still 200", async () => {
  enableEmail();
  sendThrows = true;
  const res = await starterMap(post({ name: "Ada", email: "ada@example.com" }));
  expect(res.status).toBe(200);
  expect(inserts.length).toBe(1);
});

test("starter-map: CORS is exact-origin, never a wildcard", async () => {
  const opts = await starterMapOptions();
  expect(opts.status).toBe(204);
  expect(opts.headers.get("Access-Control-Allow-Origin")).toBe("https://thesoulsofai.com");
  const res = await starterMap(post({ name: "Ada", email: "ada@example.com" }));
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://thesoulsofai.com");
});

// ── contact (ChatBubble) ────────────────────────────────────────────────────
test("contact: empty message → 400, no insert", async () => {
  const res = await contact(post({ name: "Ada", email: "ada@example.com", message: "  " }));
  expect(res.status).toBe(400);
  expect(inserts.length).toBe(0);
});

test("contact: message over 2000 chars → 400", async () => {
  const res = await contact(
    post({ name: "Ada", email: "ada@example.com", message: "x".repeat(2001) }),
  );
  expect(res.status).toBe(400);
});

test("contact: gate OFF → message STILL persisted (never discarded), 200 ok", async () => {
  const res = await contact(post({ name: "Ada", email: "ada@example.com", message: "hello" }));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(sends.length).toBe(0);
  expect(inserts[0].row).toMatchObject({
    name: "Ada",
    email: "ada@example.com",
    message: "hello",
    lead: "aist-chat",
  });
});

test("contact: operator alert escapes the user-supplied message (no HTML injection)", async () => {
  enableEmail();
  await contact(
    post({
      name: "Ada",
      email: "ada@example.com",
      message: "<img src=x onerror=alert(1)>",
    }),
  );
  expect(sends.length).toBe(1);
  expect(sends[0].to).toBe("ops@example.com");
  const html = String(sends[0].html);
  expect(html).not.toContain("<img src=x");
  expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
});

test("contact: DB insert error → 500, no success claimed", async () => {
  insertError = { message: "boom" };
  const res = await contact(post({ name: "Ada", email: "ada@example.com", message: "hi" }));
  expect(res.status).toBe(500);
  expect((await res.json()).ok).toBe(false);
});
