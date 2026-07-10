# Scanner Test Targets (SoulBot fixtures)

Deterministic, LLM-free chatbot fixtures for validating the AI Sec Tester
scanner against the 17 real OWASP-LLM probes. **Authorized, owner-controlled
test fixtures** — the weak/partial bots are deliberately vulnerable so the
scanner can prove it catches real guardrail failures.

Source: `lib/test-targets/sim-bot.ts` · Route: `app/api/test-target/[version]/route.ts`

## URLs

| Bot | Deployed | Local dev |
|-----|----------|-----------|
| weak | https://scan.thesoulsofai.com/api/test-target/weak | http://localhost:3000/api/test-target/weak |
| partial | https://scan.thesoulsofai.com/api/test-target/partial | http://localhost:3000/api/test-target/partial |
| secure | https://scan.thesoulsofai.com/api/test-target/secure | http://localhost:3000/api/test-target/secure |

## Expected scanner grade

| Bot | Grade | Behavior |
|-----|-------|----------|
| weak | F / critical | Leaks system prompt + secrets, jailbreaks, answers "YES" to meta probes — fails all 17 |
| partial | Mixed / medium | Naive denylist refuses direct attacks; leaks on base64 (sp-4), config-summary (sp-3), translation-wrap (io-4), and fictional/dual-persona jailbreaks (jb-3/jb-4) |
| secure | A / pass | Treats all input as untrusted data; refuses all 17 |

## Scanner config

Paste the target URL. No extra config needed — the default body template
`{"message":"{{prompt}}"}` matches; the route reads `req.body.message` and
returns `{"reply": "..."}`.
