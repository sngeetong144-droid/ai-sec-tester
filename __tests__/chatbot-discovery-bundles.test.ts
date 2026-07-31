/**
 * chatbot-discovery-bundles.test.ts — PHASE 2 (bundle mining).
 *
 * Offline (global fetch stubbed). Proves:
 *   - an endpoint that exists ONLY inside a compiled JS chunk is found,
 *   - off-origin <script src> bundles are NOT fetched,
 *   - the MAX_BUNDLES budget caps how many bundles are fetched,
 *   - a page with no scripts behaves exactly as before (html phase / null),
 *   - `phase` reports "html" vs "bundle" vs null correctly,
 *   - the failure text is plain-language and says bundles were searched too.
 *
 * Run: bun test __tests__/chatbot-discovery-bundles.test.ts
 */
import { test, expect, afterEach } from "bun:test";
import {
  discoverChatbotEndpoint,
  extractScriptUrls,
  isFollowableScriptUrl,
  describeDiscoveryFailure,
  MAX_BUNDLES,
} from "../lib/chatbot-discovery";

process.env.DISABLE_TARGET_GEOLOOKUP = "true";

const ADMIN = { allowRestrictedJurisdiction: true } as const;
const PAGE = "https://site.example.com/";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Stub fetch from a url -> body map; records every URL actually requested. */
function stubFetch(routes: Record<string, string>): string[] {
  const calls: string[] = [];
  // @ts-expect-error minimal fetch stub
  globalThis.fetch = async (url: string) => {
    const u = String(url);
    calls.push(u);
    const body = routes[u];
    if (body === undefined) return new Response("not found", { status: 404 });
    return new Response(body, { status: 200, headers: { "content-type": "text/plain" } });
  };
  return calls;
}

// A React/Next-style page: the widget markup is present, the endpoint is NOT.
const WIDGET_HTML = `<!DOCTYPE html><html><body>
  <div id="chatw" class="chatlog"><button>Chat with us</button></div>
  <script src="/_next/static/chunks/framework-abc.js"></script>
  <script src="/_next/static/chunks/main-def.js"></script>
</body></html>`;

// ── phase 2 finds what phase 1 cannot ────────────────────────────────────────
test("bundle mining finds an endpoint that exists only in a JS chunk", async () => {
  const calls = stubFetch({
    [PAGE]: WIDGET_HTML,
    "https://site.example.com/_next/static/chunks/framework-abc.js": "export const x=1;",
    "https://site.example.com/_next/static/chunks/main-def.js":
      'async function send(m){await fetch("/api/chat",{method:"POST",body:JSON.stringify({message:m})})}',
  });

  const result = await discoverChatbotEndpoint(PAGE, ADMIN);

  expect(result.reachable).toBe(true);
  expect(result.endpoint).toBe("https://site.example.com/api/chat");
  expect(result.phase).toBe("bundle");
  expect(result.bundlesFetched).toBe(2);
  expect(result.candidates).toContain("https://site.example.com/api/chat");
  expect(calls).toContain("https://site.example.com/_next/static/chunks/main-def.js");
});

// ── off-origin scripts are never fetched ─────────────────────────────────────
test("off-origin <script src> bundles are NOT fetched", async () => {
  const html = `<!DOCTYPE html><html><body>
    <div id="chatw">Chat with us</div>
    <script src="https://cdn.evil.example.net/widget.js"></script>
    <script src="https://js.intercom.io/loader.js"></script>
  </body></html>`;

  const calls = stubFetch({
    [PAGE]: html,
    "https://cdn.evil.example.net/widget.js": 'fetch("/api/chat")',
    "https://js.intercom.io/loader.js": 'fetch("https://api.intercom.io/messages")',
  });

  const result = await discoverChatbotEndpoint(PAGE, ADMIN);

  expect(result.endpoint).toBe(null);
  expect(result.phase).toBe(null);
  expect(result.bundlesFetched).toBe(0);
  expect(calls.some((u) => u.includes("evil.example.net"))).toBe(false);
  expect(calls.some((u) => u.includes("intercom.io"))).toBe(false);
});

test("isFollowableScriptUrl: same origin and same site pass, foreign hosts fail", () => {
  expect(isFollowableScriptUrl("https://site.example.com/a.js", PAGE)).toBe(true);
  // Same registrable site (the page's own CDN subdomain) is allowed.
  expect(isFollowableScriptUrl("https://cdn.example.com/a.js", PAGE)).toBe(true);
  expect(isFollowableScriptUrl("https://cdn.other.net/a.js", PAGE)).toBe(false);
  expect(isFollowableScriptUrl("https://js.intercom.io/a.js", PAGE)).toBe(false);
  // Non-http schemes never followed.
  expect(isFollowableScriptUrl("data:text/javascript,1", PAGE)).toBe(false);
});

// ── budgets ──────────────────────────────────────────────────────────────────
test("the bundle budget caps the number of fetches at MAX_BUNDLES", async () => {
  const scripts = Array.from(
    { length: 20 },
    (_, i) => `<script src="/static/chunk-${i}.js"></script>`,
  ).join("");
  const routes: Record<string, string> = {
    [PAGE]: `<html><body><div id="chatw">Chat with us</div>${scripts}</body></html>`,
  };
  for (let i = 0; i < 20; i++) {
    routes[`https://site.example.com/static/chunk-${i}.js`] = "var noEndpointHere = 1;";
  }

  const calls = stubFetch(routes);
  const result = await discoverChatbotEndpoint(PAGE, ADMIN);

  expect(MAX_BUNDLES).toBe(8);
  expect(result.bundlesFetched).toBe(MAX_BUNDLES);
  // 1 page fetch + at most MAX_BUNDLES bundle fetches.
  expect(calls.filter((u) => u.includes("/static/chunk-")).length).toBe(MAX_BUNDLES);
  expect(calls.length).toBe(MAX_BUNDLES + 1);
  expect(result.endpoint).toBe(null);
  expect(result.phase).toBe(null);
});

test("extractScriptUrls dedupes, resolves relatives, and stops at MAX_BUNDLES", () => {
  const html = Array.from({ length: 12 }, (_, i) => `<script src="/a${i}.js"></script>`)
    .concat('<script src="/a0.js"></script>', "<script>inline()</script>")
    .join("");
  const urls = extractScriptUrls(html, PAGE);
  expect(urls.length).toBe(MAX_BUNDLES);
  expect(urls[0]).toBe("https://site.example.com/a0.js");
  expect(new Set(urls).size).toBe(urls.length);
});

// ── no-script pages behave exactly as before ─────────────────────────────────
test("a page with no scripts and an inline endpoint still resolves in the html phase", async () => {
  const calls = stubFetch({
    [PAGE]: `<html><body><script>const CHAT="https://automation.example.com/webhook/bot";</script></body></html>`,
  });

  const result = await discoverChatbotEndpoint(PAGE, ADMIN);

  expect(result.endpoint).toBe("https://automation.example.com/webhook/bot");
  expect(result.phase).toBe("html");
  expect(result.bundlesFetched).toBe(0);
  expect(calls.length).toBe(1); // page only — no bundle phase when html succeeds
});

test("a plain page with no scripts and no endpoint returns null, as before", async () => {
  const calls = stubFetch({ [PAGE]: `<html><body><h1>Hello</h1><a href="/about">About</a></body></html>` });

  const result = await discoverChatbotEndpoint(PAGE, ADMIN);

  expect(result.endpoint).toBe(null);
  expect(result.phase).toBe(null);
  expect(result.bundlesFetched).toBe(0);
  expect(result.candidates).toEqual([]);
  expect(calls.length).toBe(1);
});

// ── honest, plain-language failure ───────────────────────────────────────────
test("failure text is plain-language and mentions the code files that were searched", () => {
  const msg = describeDiscoveryFailure({
    endpoint: null,
    vendor: "Intercom",
    reachable: true,
    candidates: [],
    phase: null,
    bundlesFetched: 3,
  });
  expect(msg).toContain("3 of its code files");
  expect(msg).toContain("Network");
  expect(msg).toContain("Request URL");
  expect(msg).toContain("exact chat link");
  expect(msg).not.toMatch(/endpoint/i); // no jargon for a non-technical reader
});

test("unreachable page gets its own plain failure text", () => {
  const msg = describeDiscoveryFailure({
    endpoint: null,
    vendor: null,
    reachable: false,
    candidates: [],
    phase: null,
    bundlesFetched: 0,
  });
  expect(msg).toContain("could not open that web address");
});
