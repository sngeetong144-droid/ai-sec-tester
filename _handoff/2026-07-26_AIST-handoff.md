# AI Sec Tester - Handoff 2026-07-26

Status: WAITING_USER (outbound still gated) | Engine: [Claude][main] | Supersedes 2026-07-17

## Change log
Every material change goes here, INCLUDING changes made outside Nova (Vercel, Stripe, DNS,
OpenAI). Record WHAT, WHERE, WHEN, WHO and WHY. Never record a secret VALUE - record only
that it was set. A dated row with no value is still auditable; a missing row is not.

| Date | Who | What | Where | Why / note |
|---|---|---|---|---|
| 2026-06-14 | Creator | Vercel project `ai-sec-tester` created | Vercel | id `prj_2oYrP5alf0d2Nl54UMzloMuhbufN` |
| 2026-06-18 | Creator | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` set | Vercel, Production | Supabase wiring |
| 2026-07-10 | Creator | `ADMIN_EMAILS` set | Vercel, Production | admin gating |
| 2026-07-11 | Creator | `RESEND_API_KEY`, `CRON_SECRET`, `REAL_SCAN_ENABLED`, `OPENAI_API_KEY` set | Vercel, Production and Preview | enables the LLM judge for interactive scanning |
| 2026-07-11 | Creator | `NEXT_PUBLIC_APP_URL` updated | Vercel, Production | |
| 2026-07-12 | Creator | `SCAN_REPORT_BUCKET`, `OWNER_EMAIL`, `CC_EMAIL_SEND_ENABLED` set | Vercel, Production and Preview | |
| 2026-07-12 | Creator | OpenAI key last used, total spend 0.01 USD | OpenAI | Creator confirms this was a TEST, not customer traffic |
| 2026-07-13 | Creator | Production deployment READY | Vercel | `dpl_BtxSmUjcRjoaBaqTk2kK9GMd7hHU` |
| 2026-07-26 | Nova | Verified live and wired | - | scan.thesoulsofai.com HTTP 200 via cname.vercel-dns.com; both judge vars present since Jul 11 |
| 2026-07-26 | Nova | Exposure check: NONE found | git | `.env` never committed; `.env.local` ignored and untracked; only `sk-` literal in history is the decoy `sk-soul-live-7f...` in `lib/test-targets/sim-bot.ts` |

## Why this section exists
The Jul 11 change is the cautionary case. `OPENAI_API_KEY` and `REAL_SCAN_ENABLED` were set
and NOTHING recorded what value went in or why. Two weeks later neither Creator nor Nova
could answer it, and Vercel cannot help: both are flagged Sensitive, so the value is
write-only and never displayed back. The cost was a live investigation to recover facts that
one line at the time would have preserved.

## Open items
1. `REAL_SCAN_ENABLED` value is UNKNOWN and unreadable. `real-scan-engine.ts:264` requires the
   exact string `true` - not `1`, not `True`. Cheapest resolution: re-save it as `true` and
   redeploy. Until then, whether interactive scanning actually runs is [UNVERIFIED].
2. Key rotation is OPTIONAL - hygiene, not incident response, since no exposure was found.
   If rotating: create the new key FIRST, update Vercel, redeploy, verify a scan, and only
   THEN revoke the old one. Wrong order fails CLOSED - probes silently gate off and scans
   degrade with no error.
3. RETRACTED - there is NO sellable-claim mismatch. Nova reported one, from claude-mem
   observation 5612 (2026-07-13), claiming `run-scan.ts` hardcodes `tests_total: 5` regardless
   of tier and so undercuts the Advanced tier's "Full OWASP LLM Top-10" claim. Creator
   challenged it. Re-derived from current code and the claim is WRONG: `run-scan.ts:164` does
   insert a literal 5, but on a row with `status: "pending"`, and `scan-persistence.ts:51-55`
   OVERWRITES it with `engine.tests_total` once the engine finishes. Tier gating genuinely
   exists - `scan-engine.ts:36`, basic runs the core 5 while advanced and enterprise add
   `EXTENDED_TEST_DEFINITIONS`. The 5 is a placeholder, not a delivered figure. ROOT CAUSE of
   the false report: the observation recorded the INSERT and never looked for a later UPDATE,
   and Nova repeated it without re-deriving. [VERIFIED: read both files 2026-07-26]
4. `OPENAI_API_KEY` is absent from local `.env.local`, so local dev cannot run real scans.
5. Several Vercel vars are flagged Sensitive that are not secrets - `REAL_SCAN_ENABLED`,
   `CC_EMAIL_SEND_ENABLED`, `OWNER_EMAIL`, `ADMIN_EMAILS`, and every `NEXT_PUBLIC_` var.
   Next.js inlines `NEXT_PUBLIC_` values into the browser bundle by design, so flagging them
   Sensitive protects nothing and only removes your ability to read the config back.

## Gates
Outbound send/post remains STOP_REQUIRED pending exact recipients and approved final text.
Money, pricing and Stripe actions remain Creator-gated.
