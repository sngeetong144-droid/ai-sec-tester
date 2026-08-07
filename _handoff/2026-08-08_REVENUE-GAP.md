# AI Sec Tester — Revenue Gap Analysis — 2026-08-08

**Scope:** Local read-only analysis. No pricing/Stripe/deploy/post actions taken.

## VERDICT

It earns nothing because no stranger has ever reached the site. The paid pipeline
(request → human approval → email payment link → Stripe webhook → auto-dispatch scan
→ PDF delivered) is real and was proven end-to-end on 2026-08-01 (request 7fdd21ea,
paid to delivered PDF in under 4 minutes) [VERIFIED: prior handoff + code read]. But
every "sale" on record was Creator's own test traffic (own email, own domain, $0
settled) [VERIFIED: 2026-08-02 handoff purge record]. Marketing is 100% DRAFT — every
launch file under `marketing/launch/` is explicitly marked "Nothing here is posted,
sent, or wired live" [VERIFIED: file headers, read]. Zero outbound channels have ever
fired. The product is not broken; the funnel has no mouth.

## THE BROKEN STEP

Step 0, before the funnel even starts: **traffic**. `marketing/launch/04-seo-aeo-geo.md`
lists Google Search Console verification as **TO-DO** [VERIFIED: file read]; sitemap
lists only 2 URLs and robots.txt allows crawling [VERIFIED: live curl,
`scan.thesoulsofai.com/sitemap.xml`, `/robots.txt`], but allowing a crawler is not the
same as being indexed or linked. One inbound link exists from `thesoulsofai.com` (its
homepage HTML contains `scan.thesoulsofai.com` and "Security Scan" copy) [VERIFIED:
live curl, HTTP 200]. No social post, email blast, directory submission, or cold
outreach has occurred — all are still checklist items `[ ]` in the launch docs.

## ADVERTISED-VS-REAL TABLE

| Claim (landing/tier copy) | Reality | File:line | Status |
|---|---|---|---|
| "Scan starts automatically after payment" | True — webhook fires dispatch on `checkout.session.completed` | `app/api/stripe/webhooks/route.ts:120-121` | [VERIFIED: code read] |
| "PDF reports emailed automatically" | Wired: `RESEND_API_KEY` present, `emailSendEnabled: true`, `autoDispatchArmed: true` in prod | live `/api/health` | [VERIFIED: curl 2026-08-07] |
| "All 10 OWASP LLM categories — 7 tested live, 3 by a control review you complete" | Accurate self-disclosure; advisory rows never render PASS/FAIL | `lib/tier-features.ts:47`, `lib/advisory-review.ts` | [VERIFIED: code read] |
| "Reviewed within 1 business day" (approval SLA) | No code enforces this — approval is a manual click by whoever is watching Command Center; nothing pages an operator | `app/actions/scan-request-lifecycle.ts` (no auto-approve path) | [VERIFIED: code read] — staffing reality is [UNVERIFIED] |
| No self-serve checkout anywhere in copy | Confirmed true — landing has zero Stripe links, only `#request` form | `app/_components/landing.tsx:12-16` | [VERIFIED: code read] |
| "STRIPE_SECRET_KEY" concern (raised, then resolved by team) | Not required for webhook verify; `constructEvent` is HMAC-only. Documented, not a live blocker | `lib/stripe/index.ts:13-24` | [VERIFIED: code read + comment] |

No priced-but-unbuilt feature found this pass — the one that existed (Enterprise
$497 = Advanced $197) was already retired under R-15.

## FUNNEL MAP

1. Stranger arrives — **NO ROUTE EXISTS today** beyond the one link from
   thesoulsofai.com's homepage and whatever a search crawler finds unassisted; GSC
   unverified, no posts/ads/outreach sent [VERIFIED: file + live checks].
2. Landing `#request` form — real, captures target + email + plan, writes
   `scan_requests` (`approved_awaiting_payment` not yet set).
3. Human review — a Command Center operator manually approves/rejects. No
   auto-approve, no SLA timer that pages anyone; if no one checks the console, the
   request sits forever [VERIFIED: `scan-request-lifecycle.ts` has no cron
   auto-approve].
4. Approval emails a Stripe payment link (native, live per Creator ruling) with
   `client_reference_id`.
5. Stripe webhook on `checkout.session.completed` → `markRequestPaid` → cron/direct
   `kickDispatch()` → real scan engine runs → PDF generated → emailed. This half is
   proven and armed in prod [VERIFIED: `/api/health` 2026-08-07 —
   `webhookSecretPresent:true`, `autoDispatchArmed:true`, `emailSendEnabled:true`,
   `realScanEnabled:true`].

First missing link is step 1; first **manual-dependency** link is step 3.

## WHAT IS MISSING, ranked

1. **Traffic — nothing drives a stranger to the URL.** All launch/social/SEO/outreach
   assets are drafts. This alone explains zero revenue regardless of everything else
   working. [VERIFIED: file headers across `marketing/launch/*.md`]
2. **No sample report / proof artifact on the public page.** No demo PDF, case study,
   or testimonial anywhere in `landing.tsx`; buyer asked to pay $47–$197 before seeing
   real output. `/scans/<id>` 404s for non-owners, so even a completed scan can't be
   shown as a live demo link (known limitation, prior handoff). [VERIFIED: code read]
3. **No refund/guarantee copy anywhere** in landing or PRD — searched, zero hits.
   [VERIFIED: grep, 0 matches]
4. **Approval step has no staffing guarantee.** The "1 business day" promise depends
   on a human checking Command Center; nothing alerts if that doesn't happen (no
   SMS/push, only the operator-alert email itself, which requires the same person to
   be watching their inbox). [VERIFIED: code path has no escalation beyond email]
5. **GSC/indexing unverified**, so even organic discovery is unconfirmed.
   [VERIFIED: `04-seo-aeo-geo.md` checklist unchecked]

## CHEAPEST PATH TO FIRST SALE

1. **Creator-gated, no code needed:** verify Google Search Console + submit sitemap
   (already listed as TO-DO in `04-seo-aeo-geo.md §6`) — free, fastest indexing lever.
2. **Creator-gated (public posting/outbound — hard gate):** publish ONE already-drafted
   asset from `marketing/launch/02-launch-announcement.md` or send the first outreach
   batch from `05-channel-funnel.md` — this is the actual missing ingredient; Nova
   cannot post or send under any standing authority.
3. **Local prep, no gate:** add a redacted/synthetic sample-report screenshot or a 60
   second walkthrough to the landing page so a $197 buyer has something to evaluate
   before paying — buildable now, needs Creator sign-off on the sample content only.
4. **Local prep, no gate:** add one refund/guarantee line to reduce first-purchase
   risk — copy-only change, still needs Creator approval since it's live offer copy
   (hard gate: "any change to ... refund terms, guarantees, or live offer copy").
5. **Operational, Creator-owned:** confirm someone is actually watching Command Center
   intake so step 3 of the funnel doesn't silently stall a real lead once traffic
   exists.

Steps 1, 3 (build), 4 (draft) are safe LOCAL_ONLY prep Nova can do now. Steps 2 and
the actual publish of 3/4 require Creator to open the public-posting / live-offer-copy
gate — nothing here authorizes that on its own.
