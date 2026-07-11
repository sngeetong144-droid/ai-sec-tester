/**
 * probe-ssrf-redirect.test.ts — the redirect-chain SSRF guard in lib/probe.ts.
 * A public target must not be able to 302 the probe to a private/metadata
 * address. probeTarget follows redirects manually and re-validates every hop;
 * a hop to a private IP throws, is caught, and leaves the target unreachable
 * with no body captured (nothing exfiltrated).
 *
 * Run: bun test __tests__/probe-ssrf-redirect.test.ts
 */
import { test, expect, afterEach } from "bun:test";
import { probeTarget } from "../lib/probe";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function res(status: number, headers: Record<string, string>, body = ""): Response {
  return new Response(body, { status, headers });
}

test("a 302 to the cloud-metadata IP is refused, not followed", async () => {
  const calls: string[] = [];
  // @ts-expect-error minimal fetch stub
  globalThis.fetch = async (url: string) => {
    calls.push(String(url));
    if (String(url).includes("169.254.169.254")) {
      return res(200, {}, "SECRET_METADATA");
    }
    return res(302, { location: "http://169.254.169.254/latest/meta-data/" });
  };

  const signals = await probeTarget("https://evil.example.com");

  expect(signals.reachable).toBe(false); // guard threw before reading the body
  expect(signals.rawBody).toBe("");
  expect(calls.some((u) => u.includes("169.254.169.254"))).toBe(false); // never fetched
});

test("a normal 200 is probed as reachable", async () => {
  // @ts-expect-error minimal fetch stub
  globalThis.fetch = async () => res(200, { "content-type": "text/html" }, "<html>ok</html>");

  const signals = await probeTarget("https://example.com");

  expect(signals.reachable).toBe(true);
  expect(signals.httpStatus).toBe(200);
});
