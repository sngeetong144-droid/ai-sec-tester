# Secured Chatbot — Build Decision (Build 4, MTCOOM path)

## What was built

A fourth scanner test target: a **real-LLM hardened SoulBot** at
`POST /api/test-target/secure-live`, extending the existing
`app/api/test-target/[version]` family (no parallel stack).

- `lib/test-targets/secure-live-bot.ts` — calls `gpt-4o-mini` (OpenAI preferred)
  or `claude-haiku` (Anthropic fallback) via raw fetch, mirroring
  `lib/real-scan-engine.ts`. No SDK, no new dependency.
- Route wires `secure-live` alongside the deterministic `weak | partial | secure`
  sim bots, which are left **intact** as contrast targets.

## Why this path (vs. n8n + NVIDIA)

MTCOOM. Recon Track D showed the production chatbot's blocker was an empty n8n
credential feeding NVIDIA NIM — three fragile, separately-maintained parts (GCP
n8n workflow + free NVIDIA key + a credential value that has silently emptied
twice). An in-app Next.js route collapses that to one file that already
auto-deploys via git and reuses the `OPENAI_API_KEY` already in Vercel prod. One
failure surface, no free-tier limits, no credential to keep alive, pennies/scan.

## Why it grades A

The defence is structural, not just prompt text: the system prompt contains **no
secret** — no API keys, override codes, connection strings, or customer data — so
there is nothing to exfiltrate even under a perfect extraction. The prompt also
instructs the model to treat all user input as untrusted data, refuse persona
swaps / instruction-overrides, and decline encode/translate/summarize tricks.

## Fail-safe

If no LLM key is configured, or the provider errors / times out, `secureLiveBot`
degrades to the deterministic secure sim (`simulateBot("secure", …)`): it never
throws, never returns 500, and never leaks. Verified by `bun test`
(`secure-live-bot.test.ts`): injection, jailbreak, and secret-extraction probes
are all refused, and the missing-key path degrades cleanly.

## What the Creator must do (optional — it already works)

- **Nothing is required for it to be safe.** With no key it still refuses safely.
- **To activate the real LLM** in the deployed target: confirm `OPENAI_API_KEY`
  (or `ANTHROPIC_API_KEY`) is set in Vercel prod. Per Build 4 context it is
  assumed present but is not verifiable from local.
- **To scan it:** paste `https://scan.thesoulsofai.com/api/test-target/secure-live`
  into the scanner. Default body template `{"message":"{{prompt}}"}` matches.

## Out of scope here

Repointing the production `soul-site.js` chat bubble to a secured route, and any
`firebase deploy`, are separate gated deploy steps in the `thesoulsofai-site`
repo — not part of this exclusive `lib/test-targets/*` + `app/api/test-target/*`
build. The `secure-live` route can serve that role later (add CORS for
`https://thesoulsofai.com` + an OPTIONS handler if used cross-origin from the
Firebase site).
