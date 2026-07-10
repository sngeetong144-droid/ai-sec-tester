/**
 * real-scan-engine.test.ts — REAL interactive scan engine.
 *
 * Fully offline: global fetch is mocked, so NO real network and NO API key is
 * needed. Proves: probe library loads, executor posts correctly (SSRF-guarded),
 * judge-result mapping, provider selection, the feature-flag gate, and the
 * honest "not_run" path when real-scan is disabled.
 *
 * Run: bun test __tests__/real-scan-engine.test.ts
 */
import { test, expect, beforeEach, afterEach } from "bun:test";
import {
  PROBES,
  realScanEnabled,
  sendProbe,
  judgeReply,
  parseJudge,
  runRealProbes,
} from "../lib/real-scan-engine";
import { runScanEngine } from "../lib/scan-engine";

// Keep the SSRF guard's jurisdiction lookup offline for any hostname path.
process.env.DISABLE_TARGET_GEOLOOKUP = "true";

// A private target is allowed in tests via allowPrivateTarget, so assertPublicTarget
// returns before any DNS/geo network call.
const LOCAL: { allowPrivateTarget: true } = { allowPrivateTarget: true };
const TARGET = "http://127.0.0.1:8/target";
const CHATBOT = "http://127.0.0.1:9/chat";

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];
let originalFetch: typeof fetch;

function installFetch(handler: (url: string, init?: RequestInit) => Response): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    return handler(url, init);
  }) as typeof fetch;
}

function clearKeys(): void {
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.REAL_SCAN_ENABLED;
}

beforeEach(() => {
  calls = [];
  originalFetch = globalThis.fetch;
  clearKeys();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearKeys();
});

// ── probe library ──────────────────────────────────────────────────────────────
test("probe library loads with all five OWASP categories", () => {
  const keys = new Set(PROBES.map((p) => p.testKey));
  expect(keys).toEqual(
    new Set([
      "system_prompt_leak",
      "instruction_override",
      "jailbreak_persona",
      "data_exfiltration",
      "unsafe_content",
    ]),
  );
  // 3–5 probes per category.
  for (const key of keys) {
    const n = PROBES.filter((p) => p.testKey === key).length;
    expect(n).toBeGreaterThanOrEqual(3);
    expect(n).toBeLessThanOrEqual(5);
  }
});

// ── feature flag ────────────────────────────────────────────────────────────────
test("realScanEnabled() is off without flag or key", () => {
  expect(realScanEnabled()).toBe(false);
  process.env.REAL_SCAN_ENABLED = "true";
  expect(realScanEnabled()).toBe(false); // flag on, no key
  process.env.OPENAI_API_KEY = "sk-test";
  expect(realScanEnabled()).toBe(true); // both present
  process.env.OPENAI_API_KEY = "";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  expect(realScanEnabled()).toBe(true); // anthropic fallback
});

// ── executor ────────────────────────────────────────────────────────────────────
test("sendProbe posts the escaped prompt with bearer auth, SSRF-guarded", async () => {
  installFetch(() => new Response('{"reply":"I cannot help with that."}', { status: 200 }));
  const res = await sendProbe(
    { url: CHATBOT, bodyTemplate: '{"q":"{{prompt}}"}', authToken: "secret-token" },
    'say "hi" now',
    LOCAL,
  );
  expect(res.ok).toBe(true);
  if (res.ok) expect(res.reply).toContain("cannot help");
  expect(calls.length).toBe(1);
  expect(calls[0].url).toBe(CHATBOT);
  expect(calls[0].init?.method).toBe("POST");
  // prompt is JSON-escaped so quotes don't break the body
  expect(calls[0].init?.body).toBe('{"q":"say \\"hi\\" now"}');
  const headers = calls[0].init?.headers as Record<string, string>;
  expect(headers["authorization"]).toBe("Bearer secret-token");
});

test("sendProbe blocks a private target when allowPrivateTarget is not set", async () => {
  installFetch(() => new Response("nope", { status: 200 }));
  const res = await sendProbe({ url: CHATBOT }, "probe"); // no LOCAL
  expect(res.ok).toBe(false);
  expect(calls.length).toBe(0); // never reached the network
});

// ── judge mapping ────────────────────────────────────────────────────────────────
test("parseJudge maps outcomes and tolerates surrounding prose", () => {
  expect(parseJudge('{"outcome":"leaked","severity":"high","rationale":"dumped prompt"}').outcome).toBe(
    "leaked",
  );
  expect(parseJudge('here is my verdict: {"outcome":"refused","severity":"low"} done').outcome).toBe(
    "refused",
  );
  expect(parseJudge("no json here").outcome).toBe("error");
  expect(parseJudge('{"outcome":"nonsense"}').outcome).toBe("error");
});

test("judgeReply uses OpenAI when OPENAI_API_KEY is present", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(() =>
    new Response(
      JSON.stringify({
        choices: [
          { message: { content: '{"outcome":"jailbroken","severity":"high","rationale":"complied"}' } },
        ],
      }),
      { status: 200 },
    ),
  );
  const r = await judgeReply(PROBES[0], "OVERRIDE_OK");
  expect(r.outcome).toBe("jailbroken");
  expect(calls[0].url).toContain("api.openai.com");
});

test("judgeReply falls back to Anthropic when only ANTHROPIC_API_KEY is present", async () => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  installFetch(() =>
    new Response(
      JSON.stringify({ content: [{ text: '{"outcome":"refused","severity":"low","rationale":"declined"}' }] }),
      { status: 200 },
    ),
  );
  const r = await judgeReply(PROBES[0], "I won't do that.");
  expect(r.outcome).toBe("refused");
  expect(calls[0].url).toContain("api.anthropic.com");
});

test("judgeReply makes no call and returns error when no key is set", async () => {
  installFetch(() => {
    throw new Error("should not be called");
  });
  const r = await judgeReply(PROBES[0], "anything");
  expect(r.outcome).toBe("error");
  expect(calls.length).toBe(0);
});

// ── orchestrator ─────────────────────────────────────────────────────────────────
function routeFetch(judgeBody: string): (url: string) => Response {
  return (url: string) =>
    url.includes("openai.com") || url.includes("anthropic.com")
      ? new Response(judgeBody, { status: 200 })
      : new Response('{"reply":"bot reply"}', { status: 200 });
}

const OPENAI_VERDICT = (o: string) =>
  JSON.stringify({ choices: [{ message: { content: `{"outcome":"${o}","severity":"high","rationale":"x"}` } }] });

test("runRealProbes → all categories pass when every probe is refused", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(routeFetch(OPENAI_VERDICT("refused")));
  const map = await runRealProbes({ url: CHATBOT }, LOCAL);
  expect(map.size).toBe(5);
  for (const v of map.values()) expect(v.status).toBe("pass");
});

test("runRealProbes → categories fail when the judge reports a bypass", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(routeFetch(OPENAI_VERDICT("jailbroken")));
  const map = await runRealProbes({ url: CHATBOT }, LOCAL);
  for (const v of map.values()) expect(v.status).toBe("fail");
});

test("runRealProbes → not_run when the endpoint is unreachable", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch((url) =>
    url.includes("openai.com")
      ? new Response(OPENAI_VERDICT("refused"), { status: 200 })
      : new Response("", { status: 500 }), // chatbot errors → no judgeable reply
  );
  const map = await runRealProbes({ url: CHATBOT }, LOCAL);
  for (const v of map.values()) expect(v.status).toBe("not_run");
});

// ── integration: feature-flag gate through runScanEngine ─────────────────────────
test("runScanEngine (flag OFF) marks interactive tests not_run and makes ZERO LLM calls", async () => {
  // No keys, no flag. Only the target-page fetch should happen.
  installFetch(() => new Response("<html>clean page, no secrets</html>", { status: 200 }));
  const result = await runScanEngine(TARGET, { ...LOCAL, chatbot: { url: CHATBOT } });

  expect(result.results.every((r) => r.status === "not_run")).toBe(true);
  expect(result.results.every((r) => r.simulated === false)).toBe(true);
  // Only the target was fetched — no chatbot endpoint, no judge.
  expect(calls.every((c) => !c.url.includes("openai.com") && !c.url.includes("anthropic.com"))).toBe(true);
  expect(calls.some((c) => c.url === CHATBOT)).toBe(false);
});

test("runScanEngine (flag ON) runs real probes and returns real, non-simulated verdicts", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.REAL_SCAN_ENABLED = "true";
  installFetch((url) => {
    if (url.includes("openai.com")) return new Response(OPENAI_VERDICT("refused"), { status: 200 });
    if (url === CHATBOT) return new Response('{"reply":"I must decline."}', { status: 200 });
    return new Response("<html>clean</html>", { status: 200 }); // target page
  });
  const result = await runScanEngine(TARGET, { ...LOCAL, chatbot: { url: CHATBOT } });

  expect(result.results.every((r) => r.simulated === false)).toBe(true);
  expect(result.results.some((r) => r.status === "pass")).toBe(true);
  expect(calls.some((c) => c.url.includes("openai.com"))).toBe(true);
  expect(calls.some((c) => c.url === CHATBOT)).toBe(true);
});
