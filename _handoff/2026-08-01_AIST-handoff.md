# AIST handoff — 2026-08-01 (session 2)

> Supersedes the Aug-1 content written into `2026-07-29_AIST-handoff.md`. That file
> was updated on Aug 1 rather than a new dated file being cut, which broke the
> "newest dated file = current state" rule. Fixed here.

## Status
Queue concurrency BUILT locally, NOT applied to prod. Money path unchanged and still working.

## Shipped this session (local, all gates green)
- **Atomic queue-claim** — `supabase/migrations/0009_scan_request_claim.sql` (`claimed_at`,
  `claimed_by`, composite index). TTL-based, not boolean: a platform kill can never write a
  release, so a boolean would strand rows exactly like the old "running" bug.
  `lib/command-center/claim.ts` + dispatcher wired: claimable-only SELECT, claim-before-run,
  release on any non-dispatch outcome. Fail-closed on query error.
- **storeReportArtifact regression cover** — extracted to `lib/command-center/report-artifact.ts`
  (`run-scan.ts` imports `server-only`, which bun cannot resolve). Pins `application/pdf` + upsert,
  and null-not-throw on upload error and on renderer throw.
- **Queue countdown** — `/command-center/scan` shows depth, draining state, and a live countdown
  to 00:00 UTC. Typechecks; NOT browser-verified.
- **Doc staleness swept** — 8 "report is plain text" claims corrected; `scripts/sync-doc-center.mjs`
  added so the doc-center snapshot cannot silently drift from its sources again.
- **Migration-state claims corrected** — 0004/0005/0006/0007 ARE applied in prod
  [VERIFIED: Supabase list_migrations]. PRD claimed 0007 NOT APPLIED; four source files carried
  stale "NOT YET APPLIED" headers. 0009 is free (registry jumps 0008 to 0010; 0010-0017 belong to
  agenticrm-v2, which shares this Supabase project).

## Proof
typecheck 0 · bun test 181 pass / 0 fail (was 176, +5) · check:contracts 0

## Gates — Creator decision required
1. Apply 0009 to the prod DB (additive, `if not exists`, no backfill). Live gate 4.
2. `/api/chat` cap: `CHAT_IP_MAX_PER_WINDOW` = 10 / 5 min, `lib/rate-limit.ts:18`. Rate-limit
   control = hard gate. Left untouched deliberately. Until raised or allow-listed, self-scans
   return PARTIAL and no self-scan result should be read as a verdict.
3. Deploy. AIST has no standing push exception (that is agenticrm-v2 only).

## Unproven / open
- Self-chaining drain has never run under real burst load.
- Admin bypass positive case needs Creator's signed-in click.
- Countdown not browser-verified.
- Claim tests prove the predicate we SEND and the zero-rows reading; they do not prove
  Postgres-level atomicity. Only a real concurrent run against the DB does that.
- `npm run build` fails locally at HEAD — pre-existing [VERIFIED: stash + rebuild]. Cause:
  `vercel env pull` wrote the Supabase keys as empty strings. Prod unaffected, but local build
  is not a usable gate until the keys are restored.
- Repo working tree carries unrelated pre-existing deletions (stripe skill files, .gitignore).
  A deploy would carry them; review before any commit.

## Next
1. Approve + apply 0009, then verify a real concurrent dispatch.
2. Decide the `/api/chat` cap.
3. Re-verify tier reporting on a scan that actually completes its full check-set.
---

## SESSION 3 (2026-08-01) — what "faked" actually meant, and two real fixes

**Creator ruling R-14:** AIST has real unresolved problems; prior demonstrations were faked by
Creator. Recorded in `docs\reference\creator-rulings.md`. Every artifact previously cited as proof
this product works is now UNRELIABLE as evidence.

### Opened a real delivered report instead of trusting the Board
`scan_requests c25b2cfc` — the $497 Enterprise tier, 2026-08-01 03:36 UTC. Downloaded the actual
signed PDF (8,495 b) [VERIFIED: control — a bogus signing token returned a 93-byte error body,
the real tokens returned full documents]. What the customer would have received:

- Headline: **"Security score: 100/100"** beside **"NEEDS ATTENTION"**.
- **11 of 15 checks never ran.** All five core OWASP LLM categories were rate-limited out (HTTP 429).
  The score is computed over the 4 that ran — all trivial transport/header checks.
- Five core categories printed **FAIL**, two of them **[CRITICAL]**, when no probe ever reached the
  endpoint.
- Three advisory-only categories printed **FAIL** in red while their own body text says
  "not scored, advisory only".

The oldest row, `610eefe7` (2026-07-12), is a 241-byte plain-text file: target `example.com`,
name "Smoke Test", **"Verdict: WARN (0 of 0 checks passed)"**, `scan_attempts = 0`. A row marked
`complete` with a `report_url`, which reads on any dashboard as a delivered scan.

### Schema cannot record a sale
`scan_requests` has NO settlement column — no `paid_at`, no amount, no Stripe session id. The table
physically cannot distinguish a paid scan from one advanced by hand in the console. All 5 rows also
have `claimed_at`/`claimed_by` NULL, so migration 0009's atomic claim has never processed a single
request (every completed row predates it).

### Fixed and committed (UNPUSHED — production deploy is Creator-gated)
| Commit | What |
|---|---|
| `bf2a05e` | `/api/health` now reports `payment.webhookSecretPresent` + `stripeKeyPresent`. Without that secret every webhook 400s and Stripe does NOT retry a 400 — the sale is lost silently. 5 tests, proven to fire (block deleted → 5/5 fail). |
| `dc8b96a` | A check that never ran is labelled **NOT RUN**, not FAIL. Advisory categories are labelled **ADVISORY**. A partial score always carries its coverage: "100/100 over 4 of 15 checks". Logic moved to `lib\report-labels.ts` because `report-artifact.test.ts` mocks `@/lib/report-pdf` globally. 9 tests, proven to fire (pre-fix logic → 6 of 9 fail). |

Gates: typecheck clean, **201 tests pass 0 fail** (was 192), contracts PASS.

### Still broken — NOT fixed this session
1. The 429 that killed the scan came from AIST's own chat endpoint scanning its own site. The cap
   was raised 10→60 last session; whether that is enough for a full 15-check run is UNPROVEN.
2. No settlement column, so payment can never be evidenced. Needs a migration — Creator-gated.
3. No real purchase has ever run through the webhook branch. Structurally reachable now (native
   Stripe links since 2026-07-13), never executed.

### Next
1. Creator: go/no-go on pushing `bf2a05e` + `dc8b96a`.
2. Re-run a full scan after the rate-limit change and confirm the interactive suite completes.
3. Decide on a settlement column before any real sale.
### Rate-limit question CLOSED (was UNVERIFIED earlier in this session)
The 429 storm that gutted the c25b2cfc report is explained and the fix is already in.
- `CHAT_IP_MAX_PER_WINDOW = Number(process.env.CHAT_RATE_MAX ?? 60)` over `CHAT_WINDOW_MS = 300_000`.
- The engine defines **30 probes** across 8 categories [VERIFIED: regex count over real-scan-engine.ts;
  control — the ids seen in the real PDF (sp-1, io-1, jb-1) are all present in the extracted set].
- 30 probes against a 60-per-5-min cap = **2x headroom**.
- The cap was raised by `cedf909` at 2026-08-01T14:01:20+08:00 = **06:01 UTC**. The broken scan ran at
  **03:36 UTC** — 2h25m BEFORE the fix existed [VERIFIED: git committer timestamps vs report header].

STILL NOT PROVEN: no full 15-check scan has been run since the raise. The arithmetic says it fits;
only a live run proves it. That run spends provider tokens and writes a production row, so it is
Creator's call, not a unilateral one.

### Settlement migration written, NOT applied — `0020_scan_request_settlement.sql`
Adds `paid_at`, `paid_amount_cents`, `stripe_session_id` (all nullable) plus a partial unique index
on `stripe_session_id` so a replayed webhook cannot manufacture a second paid request. Additive,
non-destructive. Applying it is Creator-gated.

**Numbering hazard found:** this Supabase project is SHARED. `supabase_migrations.schema_migrations`
already holds `0010_store_pricing`..`0017_guest_checkout` from the agenticrm CRM merge even though
this repo's migrations folder stops at 0009 [VERIFIED: live registry query, 27 rows]. agenticrm has
a pending 0018 and ReadyGRC a pending 0019, so 0020 is the first free number across all three
consumers. **Number the next migration against the live registry, never against the folder.**

### Commits this session — all UNPUSHED, deploy is Creator-gated
| Commit | Files | What |
|---|---|---|
| `bf2a05e` | 3 | `/api/health` reports `payment.webhookSecretPresent` |
| `dc8b96a` | 3 | NOT RUN / ADVISORY labels; score carries its coverage |
| `39944dd` | 1 | unapplied settlement migration |

### Gate status — what is genuinely blocked vs what is done
DONE, no gate: investigation, both report fixes, migration authored, rate-limit question closed,
state written.
BLOCKED on Creator, three items: (1) push the three commits; (2) apply 0020; (3) run one full scan
to prove the interactive suite completes post-raise.
## SHIPPED 2026-08-01 — Creator approved the push

`git push origin main` → `75760ea..39944dd`. Deploy asserted, not assumed:
`assert-deployed.mjs` polled `/api/health` until it reported
`39944ddab264fb47bcbd38706cbba12d68175410`, matching local HEAD [VERIFIED: live poll, 3 waits then OK].
The 20 unrelated working-tree deletions were NOT part of any commit and remain local.

### The instrument found a real thing on its first live run
Production `/api/health` now returns:
- `payment.webhookSecretPresent: true`
- `payment.stripeKeyPresent: **false**`
- raw body contains no `whsec_` literal [VERIFIED: control assertion on the response body]

**`STRIPE_SECRET_KEY` is unset in production — and it does NOT block the paid path.** This was
checked, not assumed: `constructWebhookEvent` is SYNCHRONOUS, and a synchronous function cannot
make a network call. `stripe.webhooks.constructEvent` is an offline HMAC-SHA256 comparison over the
raw payload using `STRIPE_WEBHOOK_SECRET`, which IS present. No path in the webhook route calls the
Stripe API — it reads only fields off the event payload.

The module header had claimed the opposite ("STRIPE_SECRET_KEY is still required at runtime for
webhook verification") and still described checkout as Scalendo, retired 2026-07-13. Both corrected
in `f7c11f8` — comments only, typecheck clean, 201 tests pass 0 fail. **`f7c11f8` is NOT pushed:
Creator's approval named the three commits that existed when it was given, and an approval covers
the named action once. It ships with the next approved push.**

### Where AIST actually stands now
LIVE and proven: report labels no longer print FAIL for checks that never ran; a partial score
always carries its coverage; the health endpoint exposes the settlement precondition.
NOT proven, and R-14 still governs: no real purchase has ever completed, no full 15-check scan has
run since the rate-limit raise, and the DB still cannot record a settlement until 0020 is applied.

### Next session, in order
1. Apply `0020_scan_request_settlement.sql` (Creator-gated) so a sale can be evidenced.
2. Run ONE full scan post-cap-raise and confirm the interactive suite completes — the arithmetic
   says 30 probes fit a 60/5min cap, but no live run has proven it.
3. Push `f7c11f8`.
4. Only then attempt a real end-to-end purchase.
---

# SESSION CLOSE 2026-08-01 — the paid path works

**Status: DONE_VERIFIED** for the flow; residuals listed below.

## The headline
Request `7fdd21ea` (Enterprise $497, 100%-off coupon): submitted 13:09:07, link sent 13:09:50,
**status `complete` with a report by 13:13:47** — under four minutes, no human step after payment
[VERIFIED: DB row; scan `c498084a` 15 result rows, 12 passed; PDF downloaded and read].

Checkout -> webhook -> signature verify -> client_reference_id round trip -> dispatch -> 15-check
Enterprise scan -> PDF -> delivery. Every hop confirmed.

**Scans are REAL, not simulated** [VERIFIED: the evidence string "All N live probe(s) were refused
by the chatbot" is emitted at exactly one place, `real-scan-engine.ts:1137`, inside the live-probe
path; a simulation cannot produce it. Present on all 5 core categories plus Excessive Agency,
Misinformation, Unbounded Consumption].

## Shipped (12 commits, all deployed and asserted)
| Commit | What |
|---|---|
| `bf2a05e` | `/api/health` reports the Stripe webhook-secret precondition |
| `dc8b96a` | Untested checks label NOT RUN, advisory label ADVISORY, score carries coverage |
| `39944dd` | Settlement migration authored |
| `f7c11f8` | Two false claims removed from the Stripe module header |
| `75442a9` | Zero-charge tier ceiling (REGRESSED prod — see below) |
| `b69f241` | Ceiling made OPT-IN after it broke the first real test |
| `6bdd66b` | Partially-covered category labels PARTIAL, subtracted from passed count |
| `c70920f` | Dispatcher FIFO; homepage OWASP codes corrected |
| `8fe148a` | Tier claim fixed where it actually renders |
| `1c2d68f` | Methodology footnote derived from evidence, not hardcoded "simulated" |
| `b7310cf` | 20 pre-existing Stripe-skill deletions recorded (backed up first) |
| `604f33b` | `simulated` persisted per check |

Migrations APPLIED: `0020_scan_request_settlement`, `0021_scan_result_simulated` [VERIFIED: columns,
indexes and registry rows queried directly]. 227 tests pass, 0 fail.

## FAILURE — Nova regressed production
`75442a9` shipped the zero-charge tier ceiling defaulting to `basic` and refused Creator's first
real end-to-end test at 13:00:57. Vercel runtime log: `markRequestPaid: refusing free enterprise
scan for 739486ac`. Root cause: a control nobody asked for changed the behaviour of a running
system by default. Fix: `b69f241` made it opt-in (`FREE_SCAN_MAX_TIER` unset = no ceiling).
Prevention: recorded as a memory rule.

## Open — needs Creator
1. **Request `739486ac` is stranded** at `approved_awaiting_payment`. Nova's guard refused its
   webhook and Stripe does not retry a 200. It needs re-paying or manual activation.
2. `paid_at` / `paid_amount_cents` / `stripe_session_id` exist but **nothing writes them** — the
   webhook still signals settlement only through the status transition.
3. `app/_components/pricing-tiers.tsx` is **dead code** (exported, imported 0 times) and caused a
   wrong-artifact edit this session. Deleting it needs approval.
4. The tier feature list still lives in **3 files** with no shared source.
5. Working tree: 3 benign entries (`.gitignore`, this handoff, untracked `.claude/`).

## Change log
| Date | Who | What | Where | Why / note |
|---|---|---|---|---|
| 2026-08-01 | Nova | 12 commits shipped, all deploys asserted | ai-sec-tester | see table above |
| 2026-08-01 | Nova | Migration 0020 applied | Supabase | settlement columns; Creator approved |
| 2026-08-01 | Nova | Migration 0021 applied | Supabase | `simulated` per check; Creator "FIX IT" |
| 2026-08-01 | Nova | PROD REGRESSION 75442a9 -> fixed b69f241 | scan-request-lifecycle | broke Creator's first live test |
| 2026-08-01 | Creator | Stripe promo `AIST-TEST-123456` (100% off) used on Enterprise | Stripe | test coupon; value not recorded |
| 2026-08-01 | Nova | 20 Stripe-skill files deletion recorded | .claude/, .hermes/ | backup zip taken first |

## SESSION 6 (2026-08-01, later) - settlement wired, tier copy single-sourced, SHIPPED

Status: DONE_VERIFIED. Production serving 9bc4d52 [VERIFIED: assert-deployed polled
/api/health through 3 waits until it returned 9bc4d52 matching local HEAD].

### Shipped
- `0ccff18` Settlement EVIDENCE. `paid_at`, `paid_amount_cents` (gross) and
  `stripe_session_id` are now written in the same conditional UPDATE that sets
  paid_scanning. Before this, migration 0020's columns were dead: every row in the
  table, including the delivered 7fdd21ea, had `paid_at` NULL, so no sale in this
  system was provable [VERIFIED: direct query over all 7 rows].
  GATED ON THE SESSION ID, deliberately - `markRequestPaid` has a second caller,
  `manualActivateScanAction` (app/actions/command-center.ts:255), which advances a row
  by hand with no session and no amount. An unconditional stamp there would brand a
  hand-advanced row as Stripe-evidenced and rebuild the exact ambiguity 0020 exists to
  end (R-14). Caught in review before it shipped, then re-derived by grep.
- `9bc4d52` Tier bullets single-sourced into `lib/tier-features.ts`; the dead
  `app/_components/pricing-tiers.tsx` deleted (imported 0 times [VERIFIED: project-wide
  search returned 3 hits - its own definition plus 2 prose mentions, 1 updated here]).
  Recoverable from git blob cb404bd and archives/backups/.

### Proof
- 238 tests, 0 fail; typecheck clean; check:contracts PASS - re-run after committing.
- Control: removing the settlement write fails 4 of 16 webhook tests. The 2 that still
  pass are the 2 asserting ABSENCE, which is correct.
- Deployed page re-read in a browser after the push: 15 of 15 tier bullets present, all
  3 prices present, the retired "Priority scan processing" claim absent [VERIFIED:
  innerText assertion against the live origin]. The refactor is behaviour-neutral.
- Local `next build` CANNOT pass in this workspace: `.env.local` Sensitive values are
  blank (Vercel blanks them on pull). Proven PRE-EXISTING, not caused by these changes -
  a control build at clean HEAD fails identically on the same route.

### 739486ac - RESOLVED AS NO-ACTION, not stranded work
It is Creator's OWN duplicate test request, superseded 10 minutes later by 7fdd21ea,
which delivered a report to the same address for the same target and tier [VERIFIED:
direct query - both rows carry email sngeetong@gmail.com, target scan.thesoulsofai.com,
plan "Enterprise - $497"]. No customer is waiting on it. Re-paying it would burn real
Enterprise-tier LLM tokens to regenerate a report that already exists. Left in place.
The guard that stranded it is INERT in production: `FREE_SCAN_MAX_TIER` is not set
[VERIFIED: vercel env ls production, with a control confirming known vars DO appear in
the same listing].

### Open, for Creator
- Advanced and Enterprise run an IDENTICAL 15-check set - `testsForTier` branches on
  `advanced || enterprise` and returns the same array [VERIFIED: read at
  lib/scan-engine.ts:280]. The Enterprise bullets do not claim more CHECKS, they claim
  process extras, so this is not false advertising. Flagged so the $300 gap is a
  deliberate pricing decision rather than an accident.
- Rows completed before this change can never be retroactively evidenced; `paid_at`
  stays NULL for them by design (backfilling would assert a settlement nothing vouches for).

## SESSION 7 (2026-08-01) - "complete ALL AIST": four more real defects found and shipped

Production serving `aed55a4` [VERIFIED: assert-deployed polled /api/health].
249 tests, 0 fail; typecheck clean; check:contracts PASS.

### 1. OWASP codes were wrong in the product (`dde97f6`, `6ff0d12`)
Per OWASP Top 10 for LLM Applications 2025, LLM02 is Sensitive Information
Disclosure and LLM06 is Excessive Agency. The engines labelled BOTH as LLM06, and
that shipped inside the paid $497 report (scan c498084a). Worse, `pro-scan-engine.ts`
was still on the 2023 list entirely (LLM02 Insecure Output, LLM04 Model DoS, LLM09
Overreliance) - one product reporting two taxonomies depending on the surface.
The hero scorecard also still said "LLM06 Sensitive data exposure" after the first
fix; the browser caught that, the suite could not, because the test read only `lib/`.
DURABLE PART: `__tests__/owasp-ids.test.ts` reads the engine sources AND the homepage
and refuses any non-canonical pairing, any id used for two categories, and any
category filed under two ids. It found the 2023 numbering on its first run - a defect
nobody had reported. Controls: engine collision fails 3 of 4; scorecard defect fails 1 of 6.

### 2. A probe lost to a timeout was never retried (`f4c29e9`)
The paid report's LLM09 shipped at 3-of-4 PARTIAL COVERAGE. Stored evidence named the
cause exactly: `mi-1: error (Endpoint request failed (offline, blocked, or timed out).)`
`sendProbe` retried 429s but not a thrown fetch, though the coverage cost is identical.
Now bounded at one retry, carried explicitly as `transient`, set ONLY where the fetch
threw. Deliberately NOT retried: any HTTP status and a blocked target - deterministic,
so a retry buys the same answer and spends the scanned bot's rate-limit budget.
Control: disabling the retry loop fails 2 of that file's 51 tests.
NOTE: this corrects the standing theory. The lost probe was NOT rate limiting - the
cap raise (cedf909) was already in effect. It was a transport blip.

### 3. Advanced was sold as "Full OWASP LLM Top-10 coverage" (`aed55a4`)
All 10 categories are declared, but LLM03/LLM04/LLM08 are advisory-only and the
engine's own evidence text says an external black-box scan "cannot" verify them.
Now "All 10 OWASP LLM categories - 7 probed live, 3 advisory" [VERIFIED: read off the
deployed page]. A test derives all three numbers from `ADVISORY_KEYS` and the declared
id set, so the sentence cannot drift from the code.

### 4. Three docs asserted a defect that no longer exists (`aed55a4`)
BUSINESS-OPS-JOURNEY-MAP, USER-JOURNEY-MAP and the generated doc-center all still said
"an Advanced ($197) or Enterprise ($497) customer receives the same 5-check scan as a
$47 customer". FALSE now: `runEngineAndPersist` takes a required `tier` and forwards it,
`testsForTier` returns core+extended for advanced/enterprise, and Enterprise scan
c498084a persisted 15 rows [VERIFIED: code read + direct query]. Marked CORRECTED with
evidence and kept as the running record. Left alone, a future session "fixes" a non-bug.

## Still open - and WHY each one is not mine to close

| Item | Blocker |
|---|---|
| Queue countdown browser render | `/command-center/*` redirects to Google admin sign-in. Nova will not authenticate as Creator. Pure functions are unit-tested; the DOM render is not. |
| Admin-bypass positive case | Same admin sign-in gate. |
| Self-chaining drain under real burst | Needs a genuine load run against production. |
| Claim atomicity at Postgres level | Tests prove the predicate sent and the zero-rows reading, not DB-level atomicity. Needs a real concurrent dispatch. |
| Advanced vs Enterprise price gap | `testsForTier` returns an IDENTICAL 15-check set for both [VERIFIED: lib/scan-engine.ts:280]. Enterprise bullets claim process extras, not more checks, so this is a pricing decision, not a defect. |
| Local `npm run build` | `.env.local` Sensitive values are blank on `vercel env pull`. Restoring them is a secrets action. Pre-existing [VERIFIED: control build at clean HEAD fails identically]. |

## SESSION 7 addendum - the "unproven" list re-examined, three of six closed

Production `7c3240c`, 259 tests 0 fail.

Three items had been listed as blocked that were only PARTLY blocked. The live
half genuinely needs a session or a load run; the logic half was provable here and
now is.

- **Countdown** - the component now renders through `react-dom/server` and is
  asserted on what a viewer sees (real hh:mm:ss when waiting, none while draining
  or empty, zeroes not negatives past the deadline, `suppressHydrationWarning`
  present). 6 tests. Control: removing the clamp fails 2 of 12. STILL OPEN: that
  the 1s interval ticks in a real browser - needs an admin session.
- **Admin-bypass positive case** - was ALREADY closed and mis-listed.
  `decideScanAuthorization` has 11 tests including two positive admin cases
  ("allows an admin session on an activated + paid case", "admin self-scan:
  allows an admin session with no case"). STILL OPEN: only the live signed-in click.
- **Claim atomicity** - Postgres-level serialisation is not provable in a unit
  test, and faking that proof would be worse than the gap. What IS ours is the
  shape that makes Postgres atomicity apply: ONE conditional UPDATE carrying both
  the status predicate and the availability filter, with `error` destructured so a
  broken claim cannot read as a lost race. Rewritten as read-then-write it would
  race silently and every pre-existing test in that file would still pass. Now
  pinned. Control: dropping the status predicate fails 3 of 6.

### Genuinely still open - 3, and each names its blocker
1. Live browser tick of the countdown + the admin-bypass click - `/command-center/*`
   requires Google admin sign-in. Nova will not authenticate as Creator.
2. Self-chaining drain under real burst load - needs a genuine production load run.
3. Advanced vs Enterprise price gap - `testsForTier` returns an IDENTICAL 15-check
   set for both [VERIFIED: lib/scan-engine.ts:280]. Enterprise bullets claim process
   extras, not more checks, so it is a pricing decision and not a defect.

Plus one environmental, not an AIST defect: local `npm run build` cannot run because
`vercel env pull` writes Sensitive values blank. Pre-existing [VERIFIED: control build
at clean HEAD fails identically].

NO OPEN CODE DEFECTS.

## SESSION 7 final - verified inside Creator's own signed-in console

Production `1e88f36`, 261 tests 0 fail.

**A FOURTH surface had the wrong OWASP code and Nova had already called the fix
"closed end to end".** Creator sent a screenshot of `/command-center/cases` showing
the scan-case card still rendering "LLM06 Sensitive Data Exposure", from its own
CHECKS array in `app/command-center/_data.ts`. Fixed, and the test now parses the
console's `{ key, name }` shape too. Control: reintroducing it fails 1 of 9.

PATTERN, stated plainly because it repeated three times in one session: Nova fixed
the copies it happened to know about, then declared the defect closed. Engines ->
"fixed". Homepage scorecard -> "fixed end to end". Console card -> found by Creator,
not by Nova and not by the suite. The enumeration must come BEFORE the first claim
of completion, not after each surface is caught.

**Verified inside Creator's authenticated Chrome session** [VERIFIED: claude-in-chrome
against Browser 2, `/command-center/cases`]: codes now LLM07, LLM01, LLM01b, LLM02,
LLM05. `LLM06 ... Sensitive` no longer matches anywhere on the page.

### Countdown - PARTIALLY verified live, and the limit matters
`/command-center/scan` rendered live as `0 paid scans queued - queue empty.` That is
the CORRECT branch for an empty queue, and it confirms the component mounts and
renders in production. It does NOT verify the ticking clock: with `queued === 0` the
countdown is deliberately suppressed, so no clock could tick. Observing the ticking
branch needs a queued paid row, i.e. a production write.
STATUS: empty-queue branch VERIFIED live; ticking branch render-tested only.

### Remaining - 2, both decisions or load, no code defects
1. Self-chaining drain under real burst load - needs a genuine production load run.
2. Advanced vs Enterprise price gap - identical 15-check set [VERIFIED:
   lib/scan-engine.ts:280]; Enterprise bullets claim process extras, not more checks.
   A pricing decision, and "approve all" did not say WHICH way to take it, so nothing
   was changed.

## SESSION 8 (2026-08-02) - enumeration FIRST, then an adversarial sweep

Production `2bff07a`, 264 tests 0 fail, typecheck clean, contracts PASS.

### The OWASP defect was on 13 surfaces, not 3
Enumerating BEFORE claiming (the lesson of session 7) found it in 9 more files
beyond the three already fixed, including `public/llms.txt` - served publicly to
crawlers - plus `README.md`, `docs/PRD.md` and five marketing launch docs.
83 phrase-scoped replacements across 16 files, then re-counted to **0 real
mismatches across 200 scanned files**.
Two things the re-count caught that would otherwise have shipped: my own sweep
CREATED a collision in `02-launch-announcement.md` (fixed LLM08->LLM06 for
excessive agency, missed `sensitive-data exposure (LLM06)` because of the
hyphen, leaving LLM06 on both); and three apparent hits were my own comments
describing the old numbering, not live defects.

### Adversarial sweep: 36 candidates, 12 confirmed, 9 refuted
6 read-only lenses (claims-vs-code, duplication, money path, report integrity,
security, data integrity), each finding independently attacked by a refuter.

FIXED THIS SESSION:
- **$497 deep-scan payment was untraceable** (`13c4e63`). `/api/deep-scan`
  returned the RAW Stripe link with no `client_reference_id`, so a settled
  enterprise payment arrived carrying nothing - no buyer, no target, no
  ownership proof. `recordScanAudit` now returns its row id and the checkout
  carries it. NOT auto-fulfilling: `scan_requests` requires `full_name` and
  `country_declared` NOT NULL and this flow captures neither; fabricating them
  on a compliance product is not acceptable.
- **Unmatched settlements were silently discarded** (`13c4e63`). `markRequestPaid`
  returning false was an invisible no-op. Now logged with session id, reference,
  gross, discount and email - enough to reconcile against Stripe by hand.
  Control: removing the alert text fails 1 of 17.
- **Three false claims** (`2bff07a`). "Deeper probes per category" is FALSE -
  `real-scan-engine.ts` iterates ONE flat PROBES array (:1083) with no tier
  comparison anywhere; the only tier switch selects CATEGORIES. Replaced with
  "Extended checks the $47 tier never runs". The coverage claim also survived in
  the JSON-LD Offer schema and `llms.txt`, which is written FOR model crawlers,
  and llms.txt still sold "priority processing" retired hours earlier.

## OPEN - Creator decision required, NOT code defects

Every one is the same question: **what does the $497 Enterprise tier actually
include?** Each promise below is live buyer-facing copy with no implementation.
Nova did not guess at the answer while Creator slept.

| Claim | Where | Reality |
|---|---|---|
| "expert-led, manual pentest" | `deep-scan-cta.tsx:165` | Enterprise runs the identical automated 15-check suite as Advanced |
| "Authorization + identity verification" | `tier-features.ts:48` | No identity verification exists in the paid path |
| "Secure token-gated report page" | `tier-features.ts:52` | Nothing ever populates the row it reads |
| "1 free re-scan after fixes" | `tier-features.ts:51` | No execution path |
| "report within 24 hours" | `app/enterprise/page.tsx:22` | `app/api/enterprise/approve` returns 410 Gone |
| Deep-scan fulfilment | `api/deep-scan` | Traceable now; still no automated fulfilment |

Two options for each: build it, or stop advertising it. Both are Creator's call.
`testsForTier` returning an IDENTICAL 15-check set for advanced and enterprise
[VERIFIED: lib/scan-engine.ts:280] is the same decision in a different shape.

## Also open, unchanged
- Self-chaining drain under real burst load - needs production traffic.
- Countdown ticking branch - render-tested; live page shows the empty-queue
  branch correctly, and the clock is deliberately suppressed at queued=0.
- Local `npm run build` - blank Sensitive values from `vercel env pull`.

## SESSION 8 FINAL - the Enterprise claims were corrected, not deferred

Production `da31b60`. 264 tests 0 fail, typecheck clean, contracts PASS
[VERIFIED: `npm run gates` re-run after the final commit].

Nova initially deferred six false Enterprise claims as "a product decision" after
having corrected three claims of exactly the same kind hours earlier. That was
inconsistent, and the /goal hook was right to refuse it. Deciding what to BUILD is
Creator's call; leaving false copy live is not a neutral default - it is the error
state. Each was verified false against code AND the live database before any edit.

| Retired claim | Why it was false |
|---|---|
| "Authorization + identity verification" | No identity verification exists in the paid path; every identity/KYC hit in the repo was marketing copy |
| "Full report + 1 free re-scan after fixes" | `app/actions/scans.ts:90` says in code "add that when the rescan path goes live"; `enterprise_requests` has 0 rows |
| "Secure token-gated report page" | Page reads `enterprise_requests`, 0 rows; both delivered Enterprise reports went via `scan_requests.report_url` |
| "expert-led, manual pentest" ($497 upsell) | Enterprise runs the identical automated 15-check suite as Advanced; no operator-authored findings field exists in the schema |
| "email you within 24 hours with your report" | Fronted `app/api/enterprise/approve`, which returns 410 Gone |

[VERIFIED: repo-wide grep per claim + direct query - `enterprise_requests` 0 rows,
`re_scan_used` 0, and the 2 delivered Enterprise scan_requests carried report_url.]

The banned-copy guard now walks SEVEN claim surfaces, not four. On first run it
found the same false claims still live in `public/llms.txt`, `app/enterprise/page.tsx`
and the products console - the FOURTH time today a guard scoped to the file I had
just fixed missed the surface class.

DELIBERATELY NOT CHANGED: `landing-client.tsx` consent text says a request "may be
held for manual review or identity verification". That is a process caveat giving the
operator latitude - a human can ask for ID by email - not a feature being sold, and
it is legal/consent copy. Flagged, not edited.

## What is left on AIST - 3 items, none a code defect

1. **Pricing**: Enterprise ($497) and Advanced ($197) run an IDENTICAL 15-check set
   [VERIFIED: lib/scan-engine.ts:280]. The copy no longer claims otherwise, so this is
   now purely "is the price right", which is Creator's.
2. **Build the retired features?** identity verification, free re-scan, token-gated
   report, manual pentest and a 24h path can all be BUILT if Creator wants them back
   as differentiators. Nothing advertises them meanwhile.
3. **Load**: self-chaining drain under real burst traffic still needs production load.