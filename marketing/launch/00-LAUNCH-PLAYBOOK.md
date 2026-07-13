# AI Sec Tester — Launch Playbook (Master, DRAFT)

> **Status:** DRAFT / planning. Nothing here posts, sends, charges, or changes a live account. Every posting/payment/spend/legal step is a Creator gate.
> **Product:** AI Sec Tester — OWASP-LLM Top-10 scanner for chatbots / AI agents. Live at https://scan.thesoulsofai.com. Parent brand: The Souls of AI.
> **Pricing (fixed, FastPayDirect):** $47 Normal · $197 Advanced (per scan) · $497 Enterprise (per chatbot).
> **Model:** request-a-scan (no self-serve checkout, no customer login) → admin due-diligence (geo/sanctions/licensing) → approve → emailed payment link → customer pays → admin activates → scan → report emailed. Admin-operated throughout; the customer never triggers a scan.
> **Tier scope (`landing.tsx:74/92/111`):** Normal $47 = **5 OWASP LLM checks**. Advanced $197 = **full OWASP LLM Top-10 coverage** (the paid differentiator — never imply it at $47). Enterprise $497 = full report + **1 free re-scan after fixes** (**Enterprise-only**; the 30-day re-scan *invite* flow is **not built** — see `automation/02`).
> **Sources synthesized:** launch/01–06 + automation/01–02. Copy banks live in the numbered files; this is the sequenced go-live checklist on top of them.

**Tag key:**
- `[NOVA-CAN-DO]` — draftable / buildable / verifiable now inside high-autonomy scope (owned stack, no send/post/spend).
- `[CREATOR-GATE]` — posting, sending, moving money, spend, or legal/account change. Hard stop for Creator.
- `[NEEDS: ...]` — a real unverified dependency. Not a claim; a gap to close before the dependent step can proceed.

---

## THE ONE FIRST MOVE (do this before anything external)

**Prove the pipe once, end-to-end, on a bot you own.** `[NOVA-CAN-DO]` to run + verify; `[CREATOR-GATE]` on the T-07 payment-send step.

Every external promise ("we received your request", "you'll get a report", any pricing/CTA push) sits downstream of two unverified facts. Close them first or the worst launch outcome happens: strangers hit a form that silently drops, or pay for a scan that never delivers.

1. `[NEEDS: confirm scan_requests migrations 0004/0006 applied in prod]` — apply them (gated deploy), then confirm the request form actually persists a row.
2. `[NEEDS: proof one real intake → approve → pay → scan → graded report → email has completed end-to-end]` — run exactly one, on an owned test bot. Record the proof (request ID, report artifact, delivered email).
3. `[NEEDS: confirm CRON_SECRET set in Vercel]` and `[NEEDS: confirm approval→payment-link send is human/MFA-gated (T-07)]` while you're in there.

Until this single run is green, treat the whole launch as a verification sprint, not a marketing push. Nothing below that says "external" may fire before it.

---

## PHASE 1 — PRE-LAUNCH (readiness; mostly internal)

### 1A. Blocking product verification (gates all external claims)
- [ ] `[NEEDS: migrations 0004/0006 in prod]` — request-to-DB path verified live. **Blocks any "request received" copy.**
- [ ] `[NEEDS: one real end-to-end scan → PDF → email]` — **blocks all "you'll get a report" and any speed claim.**
- [ ] `[NEEDS: confirm T-07 payment-send gate]` — confirm approval→payment-link is human/MFA-gated, not auto-send. `[CREATOR-GATE]` to lift.
- [ ] `[NEEDS: confirm 48h reminder / 14d auto-close cron live]` — daily cron only (00:00 UTC); **do not market same-hour turnaround** — worst-case dispatch latency ~24h.
- [ ] `[NEEDS: verify Supabase `reports` bucket is private]` (signed-URL-only; reports contain vuln detail).
- [ ] Resend domain — **verified (confirmed)**. `[NOVA-CAN-DO]` re-check deliverability on the actual sending address.
- [ ] `[NOVA-CAN-DO]` Live smoke test: submit a real request through the landing, confirm it lands and the operator sees it.

### 1B. Copy assets (drafted — need approval, not building)
- [ ] `[NOVA-CAN-DO]` Positioning / message hierarchy locked → `launch/01-positioning-messaging.md` (this is the messaging source of truth; supersedes old `positioning.md`).
- [ ] `[NOVA-CAN-DO]` Launch blog post drafted → `launch/02-launch-announcement.md` §1 (slug `/blog/ai-sec-tester-launch`). `[NEEDS: confirm a blog surface exists / is buildable]`.
- [ ] `[NOVA-CAN-DO]` Product-Hunt tagline + maker's first comment drafted → `02` §2. Advanced-vs-Normal delta is **RESOLVED** (`landing.tsx:74/92`): Normal = 5 OWASP LLM checks; Advanced = full OWASP LLM Top-10 coverage.
- [ ] `[NOVA-CAN-DO]` Press blurb (50/90-word) drafted → `02` §3. `[NEEDS: named spokesperson/founder quote if it goes to any outlet — do not fabricate]`.
- [ ] `[NOVA-CAN-DO]` Landing copy consistency check — pricing/tiers on the live landing match $47/$197/$497.
- [ ] `[NOVA-CAN-DO]` 3-email warm-launch + nurture + upsell sequences drafted → `launch/03-email-sequences.md`. `[NEEDS: verified Resend marketing from-address]`; `[NEEDS: confirm review SLA]` before printing "within one business day".
- [ ] `[NOVA-CAN-DO]` 10 social posts + 5 short-form scripts + 2-week calendar drafted → `launch/06-social-shortform.md`.

### 1C. Visual + demo assets
- [ ] `[NOVA-CAN-DO]` OG / social share image (1200×630), brand-consistent, **no fabricated scorecard**.
- [ ] `[NOVA-CAN-DO]` Scorecard visual — **must be captioned "illustrative example."** `[NEEDS: on-landing scorecard is a static mock (hardcoded PASS/PASS/REVIEW/PASS/PASS, grade A-)]` — any reuse is a category demo, never a real break.
- [ ] `[NEEDS: build the sample-report lead magnet]` — the top-of-funnel asset referenced everywhere; does not exist. Build from the one real end-to-end run (redact owner-specific detail). `[NOVA-CAN-DO]` once the run exists.
- [ ] `[NEEDS: record the demo-bot prompt-injection clip]` — Video 1 (`06`) leak, against a bot the team owns, captioned "a bot we control." The whole educational hook depends on it. `[NOVA-CAN-DO]` build locally (OBS + Remotion + ffmpeg per MTCOOM; no paid video tool).

### 1D. SEO / GEO groundwork (compounding — start now, publish later)
- [ ] `[NOVA-CAN-DO]` Audit landing meta (`app/layout.tsx`) BEFORE editing; then set title / description / OG / canonical → `launch/04-seo-aeo-geo.md` §4.
- [ ] `[NOVA-CAN-DO]` Add `Organization` + `Service` + `FAQPage` JSON-LD (8 Q&A in `04` §5). **No `aggregateRating`/`review` schema — zero real reviews exist; fabricating is a manual-action risk.**
- [ ] `[NOVA-CAN-DO]` Verify `sitemap.xml` / `robots.txt` (Next.js may auto-emit); ensure `/command-center`, `/login`, API routes are `noindex`/disallowed.
- [ ] `[NOVA-CAN-DO]` Write Pillar 1 (prompt-injection how-to) + Pillar 5 (checklist / doubles as lead magnet) — drafts only. Pillars 2/3/4 + comparison pages later.
- [ ] **SHIPPED:** `public/llms.txt` is live and current ($47/$197/$497 + compliance block) — the only live GEO asset. **Drop the old "stale $10 pricing" action item; it is done.**
- [ ] `[NEEDS: Semrush validation]` — all keyword difficulty is estimated. `[CREATOR-GATE]` on Semrush credit spend; ship on low-competition buyer-intent long-tails without it.

### 1E. Outreach + tracking infra (build before scaling channels)
- [ ] `[NEEDS: build the Apollo segment/list]` — 50–100 tight-ICP accounts (teams shipping customer-facing bots). `[NOVA-CAN-DO]` build on Apollo free/existing tier.
- [ ] `[NEEDS: build UTM + stage tracking]` — request → approved → paid → delivered → re-scan. `[NOVA-CAN-DO]`.
- [ ] `[NOVA-CAN-DO]` Confirm which social accounts (LinkedIn page, X handle) are approved. `[NEEDS: confirm approved accounts]`.

### 1F. Governance gates to clear before launch day `[CREATOR-GATE]` (all)
- [ ] Lift T-07 to enable approval→payment-link send (money + outbound).
- [ ] Approve any public posting / press send.
- [ ] Approve any outbound email to prospects.
- [ ] Approve GSC property creation under Creator's Google account.
- [ ] `[REVIEW]` Legal/brand pass on the authorization-first language before public use.

---

## PHASE 2 — LAUNCH DAY (nothing fires until Phase 1A is green + gates lifted)

Ordered by dependency. Keep authorization-first central in every asset; promise the deliverable, never a speed; zero fabricated proof.

- [ ] `[NOVA-CAN-DO]` Final consistency pass: pricing, tiers, CTAs all route to `#request`; no self-serve-checkout language anywhere.
- [ ] `[CREATOR-GATE]` Publish launch blog to `/blog/ai-sec-tester-launch`.
- [ ] `[CREATOR-GATE]` Publish Post 8 "Launch announcement" (LinkedIn + X) + seed Video 2. `[NEEDS: request-form persistence confirmed]` before Post 8 implies "request received."
- [ ] `[CREATOR-GATE]` Send warm-list email A1 (Sequence A) — **warm opt-in list only**, every recipient with a lawful basis. Not cold.
- [ ] `[CREATOR-GATE]` Product Hunt — **only if** a real showable scan result + ≥1 genuine proof point exist. Otherwise shelve. `[NEEDS: PH date/hunter decided or shelved]`.
- [ ] `[CREATOR-GATE]` Press blurb send — recipient list decided or held; `[NEEDS: founder quote]`.
- [ ] `[NOVA-CAN-DO]` Operator on standby to review inbound requests same day (authorization due-diligence is manual by design).
- [ ] `[NOVA-CAN-DO]` Watch the stage counter; confirm first real inbound request persists and alerts.

---

## PHASE 3 — FIRST 30 DAYS (weekly; from `05-channel-funnel.md`)

Channel priority: cold outbound + LinkedIn (P0) > communities + X (P1) > directories + SEO/GEO (P2) > Product Hunt (P2, proof-gated) > paid ads (HOLD, money gate).

### Week 1 — Prove the pipe + arm the channels (mostly internal)
- [ ] `[NOVA-CAN-DO]` / `[NEEDS]` Complete THE ONE FIRST MOVE (§ top): one real scan end-to-end; record proof.
- [ ] `[NOVA-CAN-DO]` Build UTM scheme + stage counter (request/approved/paid/delivered).
- [ ] `[NOVA-CAN-DO]` Draft sample-report lead magnet from the real run (redacted). `[NEEDS: the run]`.
- [ ] `[NOVA-CAN-DO]` Finalize Apollo segment (50–100 accounts); draft cold sequence + first 3 LinkedIn posts + Concept B carousel — **draft, not sent.**
- [ ] **Gate to Week 2:** ≥1 real scan proven end-to-end; tracking live; list + sends drafted.

### Week 2 — Quiet outbound + POV, start listening in communities
- [ ] `[CREATOR-GATE]` Send cold sequence to a **small** first batch (20–30) to test deliverability + request→approved quality. Do not blast. Frame: "a bot you authorize us to test" — never "we scanned you."
- [ ] `[CREATOR-GATE]` Publish Concept C "authorization as the feature" (founder POV + company re-share) + one "ask it nicely" teardown (illustrative).
- [ ] `[NOVA-CAN-DO]` Begin *contributing* (answers, not pitches) in 2–3 dev/security communities. Zero product spam. `[CREATOR-GATE]` on any post that mentions the product.
- [ ] `[CREATOR-GATE]` Repurpose the LinkedIn POV as a tight X thread.
- [ ] **Gate to Week 3:** deliverability healthy; ≥1 qualifying request OR clear signal on what to fix.

### Week 3 — Scale what worked, publish the wedge
- [ ] `[CREATOR-GATE]` Expand outbound to next batch using the Week-2 winning opener; kill the weakest variant.
- [ ] `[CREATOR-GATE]` Publish the highest-intent comparison page (vs DAST / vs red-team) — buyer's mental model, feeds GEO.
- [ ] `[CREATOR-GATE]` Post Concept B "two piles" + one findings-style post from a real owned-bot run.
- [ ] `[CREATOR-GATE]` Submit to shortlisted AI-tool / security-tool directories (set-and-forget). `[NEEDS: shortlist + submission copy]`.
- [ ] **Gate to Week 4:** one channel clearly outperforming; approved→paid ratio observable.

### Week 4 — Convert, close the loop, decide on scaling
- [ ] `[NOVA-CAN-DO]` Review approved-but-unpaid; confirm the 48h reminder works (or send manual, gated follow-ups).
- [ ] `[NOVA-CAN-DO]` Activate the re-scan/upsell expectation on any delivered report (free 30-day re-scan; re-scan after each material bot change).
- [ ] `[CREATOR-GATE]` Second POV/teardown; begin next comparison/FAQ asset.
- [ ] `[NOVA-CAN-DO]` Compile the 30-day scorecard (requests / approved / paid / delivered / re-scans, by channel) — `[NEEDS: real data; do not fabricate targets]`.
- [ ] `[CREATOR-GATE]` Decide: which channel earns more effort days 31–60; whether conversion is proven enough to *consider* paid ads (money gate); whether Product Hunt is now warranted.
- [ ] **Gate to Month 2:** documented winning channel + proven request→pay→deliver→re-scan loop, or a specific blocker list.

---

## STANDING RULES (carry into every phase)
- Authorization-first is the lead message, not the disclaimer. Never imply scanning bots you don't own.
- Promise the deliverable (score + PDF + evidence), never "in seconds." `[NEEDS: real runtime]`. The free re-scan is **Enterprise-only** — it belongs in Enterprise-tier copy and nowhere else.
- Never sell full OWASP LLM Top-10 coverage at $47. Normal = 5 core checks; the Top-10 starts at Advanced ($197).
- Never use verbs that imply the customer operates the product (*run it*, *log in*, *click to scan*). It is admin-operated: they request, reply, and pay; we run.
- Zero fabricated proof — no testimonials, logos, scan counts, ratings. Use `[NEEDS: ...]` placeholders only.
- Voice = calm security engineer: state the failure mode, then show the receipt. No AI-hype, no fear-selling, no countdown urgency.
- Positioning boundary: fast first-pass filter between "did nothing" and a five-figure red-team. Never "replaces a red-team" / "100% coverage" / "unhackable."
- Every "send / post / charge / spend" is a Creator gate. Nova drafts, queues, verifies, and monitors; Creator releases.

## GATE LEDGER (roll-up — Creator approval required)
| # | Action | Gate type | Phase |
|---|--------|-----------|-------|
| 1 | Lift T-07 (approval→payment-link send) | Payment + outbound (hard) | 1F / 2 |
| 2 | Any public posting / press send | Public posting | 2 / 3 |
| 3 | Outbound email to prospects (warm or cold) | Outbound send | 2 / 3 |
| 4 | GSC property under Creator's Google account | Credential authorization | 1D |
| 5 | Semrush credit spend (KD validation) | MTCOOM spend | 1D |
| 6 | Any paid ad spend / new paid tool | MTCOOM spend (hard) | 3 |
| 7 | Product Hunt launch | Public + proof-gated | 2 / 3 |
| 8 | Legal/brand pass on authorization language | Legal review | 1F |
