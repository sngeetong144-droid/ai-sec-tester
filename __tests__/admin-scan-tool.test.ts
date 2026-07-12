/**
 * admin-scan-tool.test.ts — Build 3 admin scan tool.
 *
 * Offline (global fetch stubbed, no keys, no DB). Proves:
 *   - chatbot-endpoint DISCOVERY on fixture HTML (found + not-found),
 *   - reply-field AUTO-DETECTION across common chatbot response shapes,
 *   - SSRF still refuses a 302 -> 169.254.169.254 on the discovery fetch,
 *   - the admin path is NOT jurisdiction-blocked (allowRestrictedJurisdiction),
 *     while the customer default IS.
 *
 * Run: bun test __tests__/admin-scan-tool.test.ts
 */
import { test, expect, afterEach } from "bun:test";
import {
  extractChatEndpoints,
  discoverChatbotEndpoint,
} from "../lib/chatbot-discovery";
import { extractReply } from "../lib/real-scan-engine";
import { assertPublicTarget as assertProbe } from "../lib/probe";
import { assertPublicTarget as assertEngine } from "../lib/scan-engine";

// Keep the jurisdiction geo-lookup offline for any hostname path.
process.env.DISABLE_TARGET_GEOLOOKUP = "true";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// ── endpoint discovery ───────────────────────────────────────────────────────────
test("extractChatEndpoints finds n8n webhook + /api/chat, ranks webhook first", () => {
  const html = `
    <html><head><script src="https://js.intercom.io/loader.js"></script></head>
    <body>
      <script>
        const CHAT = "https://automation.example.com/webhook/sec-bot-secured";
        async function send(m){
          await fetch("/api/chat", { method:"POST", body: JSON.stringify({ message: m }) });
        }
      </script>
    </body></html>`;
  const found = extractChatEndpoints(html, "https://site.example.com");
  expect(found.length).toBeGreaterThanOrEqual(2);
  expect(found[0]).toBe("https://automation.example.com/webhook/sec-bot-secured");
  expect(found).toContain("https://site.example.com/api/chat");
  // The Intercom loader script is NOT a message endpoint and must not be captured.
  expect(found.some((u) => u.includes("intercom"))).toBe(false);
});

test("extractChatEndpoints returns [] when the page has no chatbot endpoint", () => {
  const html = `<html><body><h1>Hello</h1><script src="/app.js"></script><a href="/about">About</a></body></html>`;
  expect(extractChatEndpoints(html, "https://plain.example.com")).toEqual([]);
});

// ── reply-field auto-detection ────────────────────────────────────────────────────
test("extractReply unwraps common chatbot response shapes", () => {
  expect(extractReply("just plain text")).toBe("just plain text"); // n8n plain text
  expect(extractReply('{"reply":"hello"}')).toBe("hello");
  expect(extractReply('{"output":"hi there"}')).toBe("hi there");
  expect(extractReply('{"data":{"message":"deep value"}}')).toBe("deep value");
  expect(extractReply('[{"output":"array form"}]')).toBe("array form");
  expect(
    extractReply('{"choices":[{"message":{"content":"openai style"}}]}'),
  ).toBe("openai style"); // OpenAI chat/completions
  // reply wins over message when both present
  expect(extractReply('{"message":"second","reply":"first"}')).toBe("first");
  // no recognizable field → fall back to the raw body (never silent empty)
  expect(extractReply('{"nope":1}')).toBe('{"nope":1}');
  expect(extractReply("")).toBe("");
});

// ── SSRF: discovery fetch must refuse a redirect to cloud metadata ────────────────
function res(status: number, headers: Record<string, string>, body = ""): Response {
  return new Response(body, { status, headers });
}

test("discoverChatbotEndpoint refuses a 302 to the cloud-metadata IP", async () => {
  const calls: string[] = [];
  // @ts-expect-error minimal fetch stub
  globalThis.fetch = async (url: string) => {
    calls.push(String(url));
    if (String(url).includes("169.254.169.254")) return res(200, {}, "SECRET_METADATA");
    return res(302, { location: "http://169.254.169.254/latest/meta-data/" });
  };

  const result = await discoverChatbotEndpoint("https://evil.example.com", {
    allowRestrictedJurisdiction: true,
  });

  expect(result.reachable).toBe(false); // SSRF guard threw before reading a body
  expect(result.endpoint).toBe(null);
  expect(calls.some((u) => u.includes("169.254.169.254"))).toBe(false); // never fetched
});

// ── admin path is not jurisdiction-blocked (SSRF still on) ─────────────────────────
test("customer default blocks an SG target; admin flag exempts it", async () => {
  // Without the flag: the .sg TLD is refused synchronously (no DNS needed).
  await expect(assertEngine("https://example.sg/chat")).rejects.toThrow(/jurisdiction/i);
  await expect(assertProbe("https://example.sg/chat")).rejects.toThrow(/jurisdiction/i);

  // With allowRestrictedJurisdiction: the jurisdiction check is skipped. DNS for
  // a non-resolving host is swallowed as a non-security error, so no throw.
  await expect(
    assertEngine("https://example.sg/chat", { allowRestrictedJurisdiction: true }),
  ).resolves.toBeUndefined();
  await expect(
    assertProbe("https://example.sg/chat", { allowRestrictedJurisdiction: true }),
  ).resolves.toBeUndefined();
});

test("allowRestrictedJurisdiction does NOT weaken the SSRF/private-IP guard", async () => {
  // A private IP literal is still refused even with the jurisdiction flag set.
  await expect(
    assertEngine("http://169.254.169.254/latest", { allowRestrictedJurisdiction: true }),
  ).rejects.toThrow(/private or internal/i);
  await expect(
    assertProbe("http://127.0.0.1:9/chat", { allowRestrictedJurisdiction: true }),
  ).rejects.toThrow(/private or internal/i);
});
