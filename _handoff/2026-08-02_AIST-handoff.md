# AI Sec Tester — handoff 2026-08-02

**Project:** P-AIST · **Lane:** AI Apps / Revenue · **Status:** `DONE_VERIFIED` - R-15 complete AND the advisory assessment shipped
**Engine/agent:** [Claude][main]

---

## 1. What this session did — R-15 execution

Ruling R-15: AIST sells TWO tiers, Normal $47 and Advanced $197. Enterprise $497 is
RETIRED. Executed. Local commit `4f13c6d`.

**Enumeration first** (the defect class that cost this project four rounds):
repo-wide `grep -ri enterprise`, excluding node_modules/.next/.git, returned
**88 files**. Classified: ~40 code/app, 25 marketing/docs, 8 tests, 4 handoffs,
3 Raw design handoffs, 1 migration, rest config.

**Changed (buying surfaces):** landing.tsx pricing card + footer label; landing.css
grid 3→2 columns (2 cards in a 3-col grid left a dead column); landing-client.tsx
plan selector now DERIVED from `SELLABLE_TIERS`; faq.tsx JSON-LD Offer removed;
public/llms.txt; command-center/products/page.tsx (kept, relabelled RETIRED);
deep-scan-cta.tsx + /api/deep-scan repriced $497→$197; scans/[id] copy; lib/email.ts
customer-facing copy; app/enterprise/page.tsx tier-naming copy.

**New:** `__tests__/retired-tier.test.ts` — sweeps the surfaces as a SET, not one
file at a time.

## 2. Three briefing premises that were WRONG — do not re-inherit them

1. **`/enterprise` is NOT the Enterprise-tier funnel.** It is a separate
   ownership-verification lead form writing `enterprise_requests` (different table
   from `scan_requests`), with no plan field. Reachable from the landing footer.
   R-15 did not retire it. Route KEPT; only its tier-naming copy changed.
2. **deep-scan-cta.tsx and /api/deep-scan were NOT dead.** The CTA renders on
   `/scans/[id]` for every sub-advanced buyer and quoted $497. Live buying surface —
   repriced, not deleted.
3. **Production was NOT at 817fe56.** `/api/health` reports `d59b39c`
   [VERIFIED: curl, this session].

## 3. The trap — why PAYMENT_LINKS.enterprise SURVIVES

`markRequestPaid` (app/actions/scan-request-lifecycle.ts) computes
`expectedCents = link ? link.priceUsd * 100 : 0` and only enforces the underpayment
guard `if (expectedCents > 0)`. Deleting the `enterprise` key makes
`resolvePaymentLink("Enterprise — $497")` return null → expectedCents 0 → **the guard
FAILS OPEN**. The key stays, marked `retired: true`. Pinned by test.

## 4. Enterprise scan_requests rows — PURGED 2026-08-02

Creator: "just purge the enterprise records, they are testing only." Correct, and the
earlier "real completed sales" line in R-15 and the 2026-08-01 handoff was WRONG.

Evidence they were test traffic [VERIFIED: full row dump before deletion]: all three
carried `email sngeetong@gmail.com` (Creator's own), `company "Test Inc"`, and
`target_url https://scan.thesoulsofai.com/` (own site) — and `paid_at`,
`paid_amount_cents` and `stripe_session_id` were **NULL on all three**. No payment
ever settled. Two had report_urls only because the scans ran and produced PDFs.

Purged: 3 rows deleted, **0 remaining** [VERIFIED: DELETE ... RETURNING, then count].
Backup written first: `C:\AI-Workspaceackups6-08-02_aist-enterprise-scan_requests-prepurge.json`.

Consequence: the stranded `739486ac` is gone, so decommissioning the Enterprise Stripe
link now strands nothing. Creator is doing that themselves; Nova did not touch Stripe.

`PAYMENT_LINKS.enterprise` still stays (see §3) — the justification is now defence in
depth, not historical rows.

## 5. Proof status — R-15 COMPLETE

| Proof | Result |
|---|---|
| Gates | `npm run gates` **exit 0, 272 pass / 0 fail** (was 264) [exit code captured directly, not through a pipe] |
| Adversarial sweep | 5 lenses x 15 agents; **1 real blocker** found and fixed (lib/chat-assistant.ts, below) |
| Deployed | pushed `d59b39c..dd49f32`; `/api/health` commit == local HEAD `dd49f32` [polled] |
| Public page, UNAUTHENTICATED | tiers `["Normal","Advanced"]`, amounts `$47`/`$197`, plan selector 2 options, JSON-LD offers 2, `enterprise` absent from body, `497` absent from **entire HTML**, `redirectedToAdmin: false` |
| Pricing layout | `grid-template-columns: 369px 369px`, both cards same row, block centred at 760px @1280w |
| Live sales bot | POST /api/chat "list every tier" -> "We offer two scan tiers: Normal $47 ... Advanced $197 ... There are no other tiers." No `enterprise`, no `497` |
| DB | 0 Enterprise rows remain |

**The sweep earned its keep.** `lib/chat-assistant.ts:63` hardcoded
`"TIERS: Normal $47 ... Advanced $197. Enterprise $497"` into CHAT_SYSTEM, the system
prompt behind the PUBLIC landing chat bubble. The prompt scopes the bot to answer
pricing and forbids it inventing prices, so that string WAS its authoritative price
list — every visitor asking about cost got quoted a retired tier. It is a price-quote
surface that does not look like one, it was in the 88-file enumeration, and the
file-by-file pass never opened it. Now DERIVED from SELLABLE_TIERS and added to the
sweep test's SURFACES.

LESSON: enumerating files is not the same as inspecting them. A grep hit count of 1
on a lib/ file hid a customer-facing price quote.

## 6. Remaining

- Creator is decommissioning the Enterprise Stripe payment link themselves. Nova did
  NOT touch Stripe. Nothing now depends on that link (the stranded row was purged).
- Marketing collateral under `marketing/**` still names the Enterprise tier. It is
  internal launch copy, not a shipped surface, so it was left alone. Sweep it before
  any launch that reuses those files.

## 7. Change log

| Date | Who | What | Where | Why |
|---|---|---|---|---|
| 2026-08-02 | Claude/main | Retired Enterprise from app buying surfaces; grid 3->2 cols | landing/faq/landing-client/llms.txt/products/deep-scan-cta/api-deep-scan/scans[id]/email/enterprise page | Ruling R-15 |
| 2026-08-02 | Claude/main | Kept PAYMENT_LINKS.enterprise as `retired: true` | lib/payment-links.ts | Deleting it makes the underpayment guard fail OPEN (expectedCents 0) |
| 2026-08-02 | Claude/main | Added surface-sweep guard test | __tests__/retired-tier.test.ts | Enumeration gap cost 4 prior rounds |
| 2026-08-02 | Claude/main | PURGED 3 Enterprise scan_requests rows | Supabase xgpywicrgcqnmkvahoke | Creator: test traffic. Backup written first |
| 2026-08-02 | Claude/main | Fixed public chat bubble quoting $497 | lib/chat-assistant.ts | Adversarial sweep; prompt was the bot's authoritative price list |
| 2026-08-02 | Claude/main | Retired tier across 26 collateral/doc/script files | marketing/, docs/, scripts/, README, .env.example | Finish R-15 outside the app |
| 2026-08-02 | Claude/main | Killed dangling Enterprise-only "free re-scan" entitlement | marketing/automation/ | Would have shipped a cron promising a benefit that never existed |
| 2026-08-02 | Claude/main | Fixed public test-target bot quoting $497 | lib/test-targets/secure-live-bot.ts | Served by public /api/test-target route |
| 2026-08-02 | **Creator** | ARCHIVED the Enterprise Stripe payment link - DONE | Stripe dashboard (external) | R-15. Nova never touched Stripe. [VERIFIED: Creator attestation 2026-08-02 - external system Nova cannot inspect] |

## 8. Next session — FIRST ACTIONS

1. **BUILD (Creator-approved 2026-08-02):** deliver a real assessment for the 3 advisory
   OWASP categories (LLM03 supply chain, LLM04 data/model poisoning, LLM08 vector store).
   They cannot be probed black-box, so the evidence must come FROM the customer: a
   structured control questionnaire/attestation, scored against the same criteria and
   written into the same report. Makes "all 10 categories" literally true and gives
   Advanced a real differentiator over Normal. Creator's constraint: "I need working
   stuffs to sell, dont make me lose credibility" - so it SHALL NOT claim to have tested
   anything it did not; it reports a REVIEWED verdict, distinct from a PROBED one.
2. ~~Confirm the Stripe link~~ DONE - Creator archived it 2026-08-02.
3. `/scans/<id>` web report page 404s for a non-owner - gated by session. If the report
   page is to be used in a pitch or shared with a buyer, it needs a shareable view.

## 9. Advisory assessment (LLM03/04/08) - SHIPPED

**The problem it solves.** Three OWASP categories cannot be probed by a black-box scan;
the evidence lives in the customer's build pipeline, training data and vector store. They
shipped as verdict-less ADVISORY rows. A buyer who paid for "all 10 OWASP LLM categories"
reasonably reads that as work not done - the refund argument.

**The fix.** Evidence the scanner cannot reach is evidence the CUSTOMER can hand over. A
12-control disclosure (4 per category) is assessed and written into the same report.

| Piece | Where |
|---|---|
| Controls + scoring | `lib/advisory-review.ts` |
| Labels | `lib/report-labels.ts` (REVIEWED / REVIEWED - GAPS / NOT ASSESSED) |
| Storage | migration `0022_advisory_disclosure.sql`, `scan_requests.advisory_disclosure` jsonb |
| Intake | optional collapsed section on the request form (`landing-client.tsx`) |
| Rendering | `report-pdf.ts` - reviewed rows + a separate self-reported summary line |

**THE CREDIBILITY RULE - test-enforced, do not weaken it.** This is the whole reason the
feature is defensible rather than a self-certification mill:
- A reviewed row is NEVER rendered PASS or FAIL.
- Reviewed controls NEVER enter the probe score - separate line, marked self-reported.
- Every reviewed row opens "REVIEWED, NOT PROBED - assessed from your own control
  disclosure and not independently verified by this scan."
- Silence is not a control: omitted/unsure = UNKNOWN, never a pass.
- An explicit NO outranks an UNKNOWN, so a real gap cannot hide behind uncertainty.
- All-yes reads as "a documented baseline, not an independent test".
- Evidence prefix is "Reviewed:", not "Observed:" - nothing was observed.

**Deliberate design calls (overrule if you disagree):**
- The disclosure is OPTIONAL, not a checkout gate. Skipping it renders ADVISORY exactly as
  before. Mandatory disclosure buys coverage at the cost of conversions.
- Tier bullet reads "3 by a control review you complete", not a flat "3 reviewed" - the
  review only happens if they fill it in.

**Live proof (2026-08-02, prod e4b4c08):** form renders 12 controls with all 3 disclaimers;
a live POST stored 4 valid answers and DROPPED an unknown control id and a bad value; the
verification row was purged. Gates exit 0, 293 pass / 0 fail (session started at 264).

## 10. Known limitation

`/scans/<id>` returns 404 for a non-owner - the report page is gated by session. The
shareable artifact is the signed PDF. Do NOT demo the web report page to a buyer until a
shareable view exists.


## Board detail snapshot - 2026-08-07

> Verbatim text moved out of the `tasks.md` Board Focus cell so the Board can stay one line per project per CLAUDE.md section 6. Nothing edited.

R-15 COMPLETE (tier retired in code, collateral, DB; Stripe link ARCHIVED by Creator). ADVISORY ASSESSMENT SHIPPED at e4b4c08: LLM03/04/08 assessed from a 12-control customer disclosure, so all 10 OWASP categories are addressed; tier bullet updated to match. Credibility rule test-enforced (REVIEWED never renders PASS/FAIL, never enters the probe score, silence is never a pass). Gates exit 0, 293 pass/0 fail. KNOWN LIMIT: /scans/<id> 404s for non-owners - the PDF is the shareable artifact.
