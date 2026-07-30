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
  runRealProbeSuite,
  detectBodyTemplate,
  looksLikeHtmlResponse,
  truncateForJudge,
  BODY_TEMPLATE_CANDIDATES,
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
  // Provider order is env-driven, so a key left in the ambient shell would
  // silently change which provider a test exercises.
  delete process.env.NVIDIA_API_KEY;
  delete process.env.NVIDIA_MODEL;
  delete process.env.NVIDIA_JUDGE_MODEL;
  delete process.env.JUDGE_PROVIDER;
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

// ── provider order + failover (NVIDIA NIM first, paid providers after) ─────────
const JUDGE_OK = JSON.stringify({
  choices: [
    { message: { content: '{"outcome":"refused","severity":"low","rationale":"declined"}' } },
  ],
});

test("judgeReply prefers NVIDIA NIM over OpenAI when both keys exist", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(() => new Response(JUDGE_OK, { status: 200 }));

  const r = await judgeReply(PROBES[0], "I cannot help with that.");
  expect(r.outcome).toBe("refused");
  expect(calls.length).toBe(1);
  expect(calls[0].url).toContain("integrate.api.nvidia.com");
});

test("judgeReply fails over to OpenAI when NIM is exhausted (429)", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch((url) =>
    url.includes("nvidia.com")
      ? new Response("rate limited", { status: 429 })
      : new Response(JUDGE_OK, { status: 200 }),
  );

  const r = await judgeReply(PROBES[0], "I cannot help with that.");
  expect(r.outcome).toBe("refused"); // the verdict still lands
  expect(calls.length).toBe(2);
  expect(calls[0].url).toContain("integrate.api.nvidia.com");
  expect(calls[1].url).toContain("api.openai.com");
});

test("a legitimate 'error' verdict does NOT burn a paid provider", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(
    () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '{"outcome":"error","severity":"low","rationale":"empty reply"}',
              },
            },
          ],
        }),
        { status: 200 },
      ),
  );

  const r = await judgeReply(PROBES[0], "");
  expect(r.outcome).toBe("error");
  expect(calls.length).toBe(1); // NIM answered; OpenAI must NOT be called
});

test("judgeReply reports unavailable only after every provider fails", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(() => new Response("down", { status: 500 }));

  const r = await judgeReply(PROBES[0], "anything");
  expect(r.outcome).toBe("error");
  expect(r.rationale).toContain("unavailable");
  expect(calls.length).toBe(2);
});

test("JUDGE_PROVIDER pins the first attempt", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.JUDGE_PROVIDER = "openai";
  installFetch(() => new Response(JUDGE_OK, { status: 200 }));

  await judgeReply(PROBES[0], "I cannot help with that.");
  expect(calls[0].url).toContain("api.openai.com");
});

test("realScanEnabled accepts an NVIDIA key alone, and tolerates flag whitespace", () => {
  process.env.REAL_SCAN_ENABLED = " TRUE ";
  process.env.NVIDIA_API_KEY = "nvapi-test";
  expect(realScanEnabled()).toBe(true);

  process.env.REAL_SCAN_ENABLED = "1"; // must NOT arm active probing
  expect(realScanEnabled()).toBe(false);
});

// ── DEFECT A: reply truncation before judging ───────────────────────────────────
test("truncateForJudge caps an over-long reply and marks it", () => {
  const short = "I cannot help with that.";
  expect(truncateForJudge(short)).toBe(short); // untouched below the cap

  const long = "x".repeat(6_000); // MAX_REPLY_CHARS-sized blob (a whole web page)
  const cut = truncateForJudge(long);
  expect(cut.length).toBeLessThan(1_400);
  expect(cut).toContain("truncated");
});

test("judgeReply truncates the reply BEFORE it reaches the judge", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(() => new Response(JUDGE_OK, { status: 200 }));

  // A page-sized reply: storage keeps MAX_REPLY_CHARS, the judge must not get it all.
  const huge = "A".repeat(5_000) + "TAIL_MARKER" + "B".repeat(900);
  await judgeReply(PROBES[0], huge);

  const sentBody = String(calls[0].init?.body);
  expect(sentBody).not.toContain("TAIL_MARKER"); // the tail never made it
  expect(sentBody).toContain("truncated at 1200 chars");
  expect(sentBody.length).toBeLessThan(3_000);
});

// ── DEFECT A: HTML reply = endpoint is not a chat API (distinct, loud reason) ────
test("looksLikeHtmlResponse detects doctype, <html>, and a text/html content-type", () => {
  expect(looksLikeHtmlResponse("<!doctype html><html><body>hi</body></html>")).toBe(true);
  expect(looksLikeHtmlResponse("\n  <HTML><body>hi</body></HTML>")).toBe(true);
  expect(looksLikeHtmlResponse('{"reply":"hi"}', "text/html; charset=utf-8")).toBe(true);
  expect(looksLikeHtmlResponse('{"reply":"hi"}', "application/json")).toBe(false);
  expect(looksLikeHtmlResponse("plain text answer")).toBe(false);
});

test("sendProbe reports an HTML page as notChatApi, never as a reply to judge", async () => {
  installFetch(
    () => new Response("<!doctype html><html><body>landing page</body></html>", { status: 200 }),
  );
  const res = await sendProbe(
    { url: CHATBOT, bodyTemplate: '{"message":"{{prompt}}"}' },
    "probe",
    LOCAL,
  );
  expect(res.ok).toBe(false);
  if (!res.ok) {
    expect(res.notChatApi).toBe(true);
    expect(res.error).toContain("NOT a chat API");
  }
});

test("runRealProbeSuite surfaces 'not a chat API' instead of a judge failure", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.REAL_SCAN_ENABLED = "true";
  installFetch((url) =>
    url.includes("openai.com")
      ? new Response(JUDGE_OK, { status: 200 })
      : new Response("<!doctype html><html><body>web page</body></html>", { status: 200 }),
  );

  const run = await runRealProbeSuite({ url: CHATBOT }, LOCAL);
  expect(run.notChatApi).toBe(true);
  for (const v of run.verdicts.values()) {
    expect(v.status).toBe("not_run");
    expect(v.evidence).toContain("NOT a chat API");
    expect(v.evidence).not.toContain("judge error");
  }
  // The judge was never consulted about a web page.
  expect(calls.some((c) => c.url.includes("openai.com"))).toBe(false);
});

// ── DEFECT A: unparseable judge output is a PROVIDER failure → failover ──────────
test("unparseable judge output fails over to the second provider", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch((url) =>
    url.includes("nvidia.com")
      ? // prose, no JSON — exactly what produced "Judge returned no JSON."
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "The chatbot appears to have refused politely." } }],
          }),
          { status: 200 },
        )
      : new Response(JUDGE_OK, { status: 200 }),
  );

  const r = await judgeReply(PROBES[0], "I cannot help with that.");
  expect(r.outcome).toBe("refused"); // the verdict lands on provider #2
  expect(r.unavailable).toBeUndefined();
  expect(calls.length).toBe(2);
  expect(calls[0].url).toContain("integrate.api.nvidia.com");
  expect(calls[1].url).toContain("api.openai.com");
});

test("'unavailable' is reported only after EVERY provider returns garbage", async () => {
  process.env.NVIDIA_API_KEY = "nvapi-test";
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch(
    () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "no json at all, just prose" } }] }),
        { status: 200 },
      ),
  );

  const r = await judgeReply(PROBES[0], "anything");
  expect(r.outcome).toBe("error");
  expect(r.unavailable).toBe(true);
  expect(r.rationale).toContain("unavailable");
  expect(calls.length).toBe(2); // both providers were tried
});

// ── DEFECT B: request body shape autodetection ───────────────────────────────────
test("detectBodyTemplate finds the messages[] shape when {message} is rejected", async () => {
  installFetch((url, init) => {
    const body = String(init?.body ?? "");
    if (url !== CHATBOT) return new Response("nope", { status: 404 });
    // Only the OpenAI-style messages[] envelope is accepted by this bot.
    if (body.includes('"messages"')) return new Response('{"reply":"Hello there."}', { status: 200 });
    return new Response("Bad Request", { status: 400 });
  });

  const d = await detectBodyTemplate({ url: CHATBOT }, LOCAL);
  expect(d.source).toBe("detected");
  expect(d.template).toBe('{"messages":[{"role":"user","content":"{{prompt}}"}]}');
  expect(d.notChatApi).toBe(false);
  expect(calls.length).toBe(2); // {message} tried first, then messages[]
});

test("detectBodyTemplate finds the n8n chatInput shape", async () => {
  installFetch((_url, init) => {
    const body = String(init?.body ?? "");
    if (body.includes('"chatInput"'))
      return new Response('{"output":"n8n says hi"}', { status: 200 });
    return new Response("{}", { status: 200 }); // JSON with no reply field → not usable
  });

  const d = await detectBodyTemplate({ url: CHATBOT }, LOCAL);
  expect(d.template).toBe('{"chatInput":"{{prompt}}"}');
  expect(d.source).toBe("detected");
  expect(BODY_TEMPLATE_CANDIDATES).toContain('{"chatInput":"{{prompt}}"}');
});

test("an explicit operator bodyTemplate ALWAYS wins and skips detection", async () => {
  installFetch(() => new Response('{"reply":"hi"}', { status: 200 }));
  const d = await detectBodyTemplate({ url: CHATBOT, bodyTemplate: '{"q":"{{prompt}}"}' }, LOCAL);
  expect(d.source).toBe("operator");
  expect(d.template).toBe('{"q":"{{prompt}}"}');
  expect(calls.length).toBe(0); // ZERO detection requests
});

test("detectBodyTemplate flags an HTML endpoint instead of picking a shape", async () => {
  installFetch(() => new Response("<!doctype html><html>page</html>", { status: 200 }));
  const d = await detectBodyTemplate({ url: CHATBOT }, LOCAL);
  expect(d.source).toBe("fallback");
  expect(d.notChatApi).toBe(true);
  expect(d.note).toContain("NOT a chat API");
});

test("runRealProbeSuite probes with the AUTODETECTED shape and records it", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  installFetch((url, init) => {
    if (url.includes("openai.com")) return new Response(OPENAI_VERDICT("refused"), { status: 200 });
    const body = String(init?.body ?? "");
    if (body.includes('"chatInput"'))
      return new Response('{"output":"I must decline."}', { status: 200 });
    return new Response("Bad Request", { status: 400 });
  });

  const run = await runRealProbeSuite({ url: CHATBOT }, LOCAL);
  expect(run.templateSource).toBe("detected");
  expect(run.bodyTemplate).toBe('{"chatInput":"{{prompt}}"}');
  for (const v of run.verdicts.values()) {
    expect(v.status).toBe("pass"); // every probe reached the bot with the right shape
    expect(v.evidence).toContain('{"chatInput":"{{prompt}}"}');
  }
});

// ── DEFECT C: no "pass" verdict when the core categories did not run ─────────────
test("runScanEngine never verdicts 'pass' when no core category ran", async () => {
  // Transport checks pass (HTTPS target, headers present) but the interactive suite
  // cannot run — this is the shape that reported score 100 / verdict pass.
  installFetch(
    () =>
      new Response("<html>clean</html>", {
        status: 200,
        headers: {
          "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
          "strict-transport-security": "max-age=31536000",
        },
      }),
  );
  const result = await runScanEngine("https://127.0.0.1/", {
    ...LOCAL,
    tier: "enterprise",
  });

  expect(result.interactive_suite_ran).toBe(false);
  expect(result.verdict).not.toBe("pass");
  expect(result.verdict).toBe("warn");
  expect(result.summary).toContain("INCOMPLETE SCAN");
  expect(result.summary).toContain("UNVERIFIED");
  expect(result.summary).toContain("no chatbot message endpoint was supplied");
  expect(result.summary).toContain("NOT a pass for this chatbot");
});

test("runScanEngine says WHY: endpoint is a web page, not a chat API", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.REAL_SCAN_ENABLED = "true";
  installFetch((url) => {
    if (url.includes("openai.com")) return new Response(JUDGE_OK, { status: 200 });
    return new Response("<!doctype html><html>page</html>", { status: 200 });
  });

  const result = await runScanEngine(TARGET, {
    ...LOCAL,
    tier: "enterprise",
    chatbot: { url: CHATBOT },
  });

  expect(result.verdict).not.toBe("pass");
  expect(result.interactive_suite_ran).toBe(false);
  expect(result.summary).toContain("NOT a chat API");
  expect(result.summary).toContain("INCOMPLETE SCAN");
});

test("runScanEngine still verdicts 'pass' when the core suite DID run clean", async () => {
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.REAL_SCAN_ENABLED = "true";
  installFetch((url) => {
    if (url.includes("openai.com")) return new Response(OPENAI_VERDICT("refused"), { status: 200 });
    if (url === CHATBOT) return new Response('{"reply":"I must decline."}', { status: 200 });
    return new Response("<html>clean</html>", { status: 200 });
  });

  const result = await runScanEngine(TARGET, { ...LOCAL, chatbot: { url: CHATBOT } });
  expect(result.interactive_suite_ran).toBe(true);
  expect(result.verdict).toBe("pass");
  expect(result.summary).not.toContain("INCOMPLETE SCAN");
  expect(result.summary).toContain("Chat request body shape");
});

test("the 'N not run' arithmetic is preserved", async () => {
  installFetch(() => new Response("<html>clean</html>", { status: 200 }));
  const result = await runScanEngine(TARGET, { ...LOCAL, tier: "enterprise" });
  const notRun = result.results.filter((r) => r.status === "not_run").length;
  expect(notRun).toBeGreaterThan(0);
  expect(result.summary).toContain(`${notRun} not run`);
});
