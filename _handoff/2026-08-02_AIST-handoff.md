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

## 5. Proof status

- `npm run gates` → **exit 0, 272 pass / 0 fail** (was 264) [VERIFIED: exit code
  captured directly, not through a pipe]
- Surfaces clean [VERIFIED: post-edit repo-wide re-grep; only the two intentionally
  retained `/enterprise` route-path hits remain]
- **NOT pushed / NOT deployed** [VERIFIED: `git status -sb` → `ahead 1`]
- **NOT re-read in an unauthenticated browser** — outstanding, requires deploy first

## 6. Next actions

1. Push `4f13c6d` → Vercel auto-deploys.
2. `npm run assert:deployed` — proves the push actually reached prod. Vercel has
   twice refused a deploy silently; a green push is not proof.
3. Re-read the public page in an UNAUTHENTICATED browser (an admin session redirects
   `/` to `/command-center` and shows the wrong page).
4. Resolve `739486ac` before the Stripe link is decommissioned.
