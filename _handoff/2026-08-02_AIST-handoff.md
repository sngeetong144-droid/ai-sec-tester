# AI Sec Tester — handoff 2026-08-02

**Project:** P-AIST · **Lane:** AI Apps / Revenue · **Status:** `WIP`
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
