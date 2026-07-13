# Launch + Marketing Ops Automation Map — AI Sec Tester

> **Status:** DRAFT. Nothing here posts, sends, charges, or changes a live account.
> Every "publish" / "send" step below stays behind a human gate until Creator approves.
> **Product:** AI Sec Tester — OWASP-LLM Top-10 scanner for chatbots/agents. Live at scan.thesoulsofai.com.
> **Model:** request-a-scan → admin due-diligence (geo/sanctions/licensing) → approve → emailed payment link → pay → scan → report. NOT self-serve SaaS.
> **Pricing (fixed, FastPayDirect):** $47 Normal / $197 Advanced (per scan) / $497 Enterprise (per chatbot).
> **Owned stack (MTCOOM — use before any paid tool):** n8n (automation.thesoulsofai.com), Supabase (DB + Storage), Resend (email, domain verified), Vercel (hosting + cron), Claude Code, existing test chatbots.

---

## 0. How to read this map

Each automation lists:

- **Replaces** — the manual work it removes.
- **Build on** — which owned tool carries it (no new paid tool unless justified with a revenue link + exit plan).
- **Effort** — S (≤ half a day), M (1–2 days), L (3+ days or depends on unbuilt infra).
- **Buildable now vs Gated** — can it ship as a draft-only automation today, or is it blocked by a hard gate / unverified dependency.
- **Revenue / time link** — why it earns money or gives back hours.

**Publishing rule for the whole map:** automations may *draft, queue, alert, and monitor* freely. Anything that *sends to a stranger, posts publicly, or moves money* stops at a human "approve" click. That gate is not friction to remove later — for this product the review discipline is the differentiator.

**Cross-cutting dependency (read once):** several flows below depend on the `scan_requests` table persisting in prod. Route code comments state migrations 0004/0006 are LOCAL / **not yet applied**. `[NEEDS: confirm scan_requests migrations applied in production]`. Until then, DB-triggered flows are "build against staging / verify before promising."

---

## 1. Lead capture → nurture email sequence

**Replaces:** manually watching for new leads, hand-writing a first-touch email, and remembering to follow up 2/5/9 days later. Today a lead magnet download or newsletter opt-in goes nowhere.

**Build on:** Supabase (`leads` table) + n8n (scheduler + branching) + Resend (send). Capture form posts to a Vercel route → insert row → n8n cron reads due rows → Resend sends the next step.

**Effort:** **M.** The send plumbing is small; the cost is writing the sequence and the capture surface. Sequence copy already drafted in `launch-content.md` (5-email) — reuse, do not rewrite.

**Buildable now vs Gated:**
- **Buildable now (draft-only):** table, capture route, n8n sequence logic, Resend templates. Run it in **draft/hold mode** — n8n creates the send but parks it for one-click approval.
- **Gated:** flipping the sequence to **auto-send** to real inboxes is a Creator gate (outbound send). Cold-audience sends also touch deliverability/CAN-SPAM — keep double-opt-in.
- `[NEEDS: the lead magnet itself]` — the sample-report magnet referenced across the funnel does not exist yet. Nurture has nothing to capture *from* until that ships. Sequence copy also "presumes a nurture list that does not exist" — this automation is what *builds* the list; don't cite list size as a proof point.

**Revenue / time link:** Direct. Nurture is the bridge from "downloaded a sample" to "requested a scan." Even a 3-email hold-and-approve flow removes the single biggest solo-op leak: leads going cold because nobody followed up. Time saved: ~15–20 min per lead of manual writing/tracking.

**Ponytail note:** don't build a visual drag-drop journey builder. A `leads` table with `next_step` + `send_after` columns and one n8n cron is the whole engine. Add stages when a real list exists, not before.

---

## 2. Requested-scan → operator alert (EXISTS) → follow-up if unpaid

**Replaces:** manually refreshing the request queue, and manually chasing a requester who was approved + sent a payment link but hasn't paid.

**Build on:** existing scan-request route (alert already fires) + Supabase (`scan_requests` status/timestamps) + n8n (cron over unpaid rows) + Resend (reminder).

**Effort:** **S–M.** The operator alert already exists. The new piece is the *unpaid follow-up* loop: cron finds `approved && payment_link_sent && !paid && older_than_48h` → drafts a reminder.

**Buildable now vs Gated:**
- **Existing:** request → operator alert. Keep as-is.
- **Buildable now (draft-only):** the unpaid-reminder query + a drafted reminder email held for approval.
- **Gated:** the whole approve → payment-link → pay path is a **hard gate**. `payment-links.ts` warns outbound send + payment is a GATED live action behind launch-block **T-07**, not auto-send. So both the *initial* payment-link email and any *reminder* stay human/MFA-gated. `[NEEDS: confirm approval→payment-link email is human/MFA-gated]` — treat "approved requests get an emailed payment link" as by-design, not a confirmed automated live flow.
- `[NEEDS: confirm 48h reminder / 14d auto-close lifecycle + cron are live]` — cited in funnel plan but depends on the unapplied migrations + cron wiring. Cite as *designed behavior*, verify before promising.

**Revenue / time link:** Highest-leverage of all six. These are people who already asked, passed due diligence, and got a price. A recovered unpaid request is a near-pure-margin sale at $47–$497. Even at manual-approve, auto-*drafting* the reminder removes the "did I forget to chase X?" tax.

**Ponytail note:** one cron, one status filter, one drafted email. The reminder is the same Resend template with a merge field. Auto-close at 14d is a status update, not a new system.

---

## 3. Social post scheduling / queue (draft-and-hold; publish stays gated)

**Replaces:** manually deciding what to post, writing it fresh each time, and hand-posting on a schedule. Post copy already drafted (6 LinkedIn/X posts in `launch-content.md`, 5 short scripts in `video-social-scripts.md`).

**Build on:** Supabase (`social_queue` table: `channel`, `body`, `asset_path`, `scheduled_for`, `status`) + n8n (cron surfaces "due" drafts) + a simple review view (or just the Supabase table + a Telegram/email nudge). **No paid scheduler (Buffer/Hypefury) — the queue is a table.**

**Effort:** **S** for the draft-and-hold queue. **M** only if/when auto-publish to platform APIs is ever approved (LinkedIn/X API auth adds real work).

**Buildable now vs Gated:**
- **Buildable now (draft-only):** queue table, cron that pings "3 posts due this week, approve to publish," a slot calendar seeded from the 4-week plan in `channel-funnel-plan.md`.
- **Gated (hard):** actual publishing is a **Creator hard gate** (public posting). Nova drafts and queues; Creator posts. Do not wire live platform-API publishing without explicit approval.
- `[NEEDS: real product screen recordings]` for video posts — the on-landing scorecard is a **static mock** (hardcoded PASS/PASS/REVIEW). Any visual reusing it must be captioned "illustrative example," not "live scan." `[NEEDS: verify scorecard is a static mock]` (recon says yes).

**Revenue / time link:** Indirect but compounding. Consistent, queued posting feeds top-of-funnel (channel plan ranks LinkedIn/communities above SEO for speed). Time saved: batching a week of posts into one review session vs daily context-switching. The draft bank already exists — the queue just prevents it from rotting unposted.

**Ponytail note:** resist a "content calendar app." A table with a `scheduled_for` column and a weekly cron nudge *is* the calendar. Publishing stays a human click regardless — so the fancy scheduler would automate the one step that's gated anyway. YAGNI.

---

## 4. Review / testimonial collection after a report

**Replaces:** manually remembering who got a report, and manually asking each one for feedback/a testimonial. Today: zero real social proof exists, and no ask goes out.

**Build on:** Supabase (`scan_requests` completed rows + a `feedback` table) + n8n (cron: report delivered + N days → draft ask) + Resend (send) + a plain feedback form (Vercel route → `feedback` table).

**Effort:** **S–M.** Trigger is "report delivered N days ago." Form is one route + one table.

**Buildable now vs Gated:**
- **Buildable now (draft-only):** the feedback table, the form, the drafted ask email held for approval.
- **Gated:** sending the ask to a real customer is an outbound-send gate. Low-risk, but still Creator-approved for the first cohort.
- **Publishing** any testimonial on the site is separately gated (public content) and requires explicit customer consent captured in the form.
- `[NEEDS: a completed end-to-end scan → report delivered]` — no evidence a live scan→PDF→email has completed. This automation has **nothing to trigger on** until the first real report ships. Until then it's built-and-parked. **Never fabricate a testimonial** — use `[NEEDS: real quote]` placeholder structures only.

**Revenue / time link:** Strategic. Social proof is the product's biggest current gap (recon: "ZERO real social proof exists"). One real, consented testimonial from a named team removes a top-3 objection and lifts conversion on every other channel. The automation guarantees the *ask* actually happens the moment a report lands — the highest-response-rate moment.

**Ponytail note:** capture consent + attribution level (name / company / anonymous) *in the same form* as the feedback. One form, one table. Don't build a testimonial CMS — a `feedback` table with an `approved_to_publish` flag is enough; the site pulls approved rows.

---

## 5. GSC / rank monitoring

**Replaces:** manually logging into Google Search Console and eyeballing whether the site/llms.txt is getting indexed and which queries surface it.

**Build on:** Vercel cron (or n8n cron) → Google Search Console API → Supabase (`rank_history` table) → threshold alert via Resend/Telegram. GSC API is **free** on the existing Google account. **No Semrush/Ahrefs subscription needed for monitoring** — Semrush is only worth it for one-off keyword *difficulty validation* (recon flags KD as a guess), not ongoing rank tracking.

**Effort:** **M.** GSC OAuth setup is the real cost; the polling + storage + alert is small.

**Buildable now vs Gated:**
- **Buildable now:** entirely read-only external API + local storage + internal alert. No public/money/destructive action → within high-autonomy scope. Only gate is one-time Google OAuth consent (`[NEEDS: GSC property verified + OAuth token]`).
- **Caveat:** monitoring only pays off once there's content to rank. Right now **llms.txt is the only live GEO asset** — all 6 blogs / 2 comparison pages / pillar are outlines. Low signal until content ships. Build it *with* the SEO content push, not before.

**Revenue / time link:** Indirect, slow. SEO/GEO is a long-horizon channel (ranked below cold email/LinkedIn for launch speed). Monitoring's value is catching indexation problems early and telling you which content actually earns impressions, so you write more of what works. Time saved: replaces a weekly manual GSC check.

**Ponytail note:** this is a read + store + threshold-alert loop — `@cron` + one API call + one `if delta > X` check. Don't build a dashboard first; a "traffic changed" alert is the MVP. Skip until at least 2–3 content pages are live, or it monitors a blank room.

---

## 6. Competitor / mention monitoring

**Replaces:** manually searching for "AI Sec Tester," "prompt injection scanner," competitor names, and OWASP-LLM chatter across the web / X / LinkedIn / HN.

**Build on:** n8n cron → search/RSS/API sources → Supabase (`mentions` table, dedup on URL) → digest alert via Resend/Telegram.

- **Tier 1 (free, buildable now):** Google Alerts RSS, subreddit/HN/RSS feeds, keyword pulls via already-available web tooling. Zero new spend.
- **Tier 2 (paid, only if justified):** a scraping/social-listening API (e.g. Bright Data, already present as MCP) for X/LinkedIn depth. **Gate behind a revenue link + exit plan** per MTCOOM — don't turn it on for a launch with no customers yet.

**Effort:** **S** for the free RSS/alert digest. **M** if Tier-2 social scraping is added.

**Buildable now vs Gated:**
- **Buildable now:** free-source monitoring + internal digest. Read-only, internal alert → high-autonomy scope.
- **Gated:** any *paid* data source is an MTCOOM spend decision (Creator gate). Any *public response* to a mention is a public-posting gate — monitor and draft, never auto-reply.

**Revenue / time link:** Indirect. Early signal on competitor positioning, and catches the moment someone publicly asks "how do I test my chatbot for prompt injection?" — a warm inbound-outreach opening (respond manually, gated). Also protects the brand (catches misuse/impersonation). Time saved: replaces ad-hoc manual searching.

**Ponytail note:** start with Google Alerts → email digest. That's a 20-minute setup that covers 70% of the value with zero code and zero spend. Only build the n8n/Supabase pipeline if the free digest proves there's enough signal to justify structuring it.

---

## 7. Summary table

| # | Automation | Build on | Effort | Buildable now? | Revenue link |
|---|-----------|----------|--------|----------------|--------------|
| 1 | Lead capture → nurture | Supabase + n8n + Resend | M | Draft-only now; auto-send gated; **needs lead magnet** | Direct — converts downloads → requests |
| 2 | Request → alert → unpaid follow-up | route (exists) + Supabase + n8n + Resend | S–M | Alert exists; reminder draft-only; **payment path hard-gated (T-07)** | Highest — recovers near-margin sales |
| 3 | Social queue (draft-and-hold) | Supabase + n8n | S | Queue now; **publish hard-gated** | Indirect — feeds top-of-funnel |
| 4 | Post-report testimonial ask | Supabase + n8n + Resend | S–M | Built-and-parked; **needs a real completed report** | Strategic — fills the #1 social-proof gap |
| 5 | GSC / rank monitoring | Vercel/n8n cron + GSC API (free) | M | Yes (OAuth once); **low signal until content ships** | Indirect/slow — SEO feedback loop |
| 6 | Competitor / mention monitoring | n8n + free RSS (Tier 2 paid gated) | S | Yes (free tier); **paid sources gated** | Indirect — inbound signal + brand watch |

---

## 8. Recommended build order (MTCOOM: value ÷ effort, respecting gates)

1. **#2 unpaid follow-up** — smallest new build, highest revenue leverage; alert already exists. *(Blocked on: verify scan_requests persistence + cron. Reminder draft is buildable against staging today.)*
2. **#6 competitor/mention (free tier)** — 20-min Google Alerts digest, zero spend, immediate inbound signal.
3. **#3 social queue** — copy bank already exists; a table + weekly nudge stops drafts from rotting. Publish stays gated.
4. **#1 nurture** — high value but **blocked on the lead magnet**; build the magnet first, then the sequence (copy already drafted).
5. **#4 testimonial ask** — build-and-park; arms itself the moment the first real report ships.
6. **#5 GSC monitoring** — defer until 2–3 content pages are live, or it watches a blank room.

---

## 9. Gate ledger (needs Creator approval before going live)

| Action | Gate type | Automation |
|--------|-----------|------------|
| Auto-sending nurture emails to real inboxes | Outbound send | #1 |
| Sending payment link / unpaid reminder | Payment + outbound (hard gate, T-07 launch-block) | #2 |
| Publishing any social post | Public posting (hard gate) | #3 |
| Sending testimonial ask; publishing a testimonial | Outbound send; public content + consent | #4 |
| Google OAuth consent for GSC | One-time credential authorization | #5 |
| Turning on any paid data source (Tier-2 listening) | MTCOOM spend decision | #6 |
| Any public reply to a monitored mention | Public posting | #6 |

## 10. Open verifications (do not promise until confirmed)

- `[NEEDS: confirm scan_requests migrations 0004/0006 applied in prod]` — gates #1, #2, #4 DB triggers.
- `[NEEDS: proof a real end-to-end scan → graded PDF → email has completed]` — gates #4 (nothing to trigger on); soften all runtime-speed claims.
- `[NEEDS: confirm 48h reminder / 14d auto-close cron is live]` — gates #2 lifecycle.
- `[NEEDS: build the sample-report lead magnet]` — gates #1 (nothing to capture from).
- `[NEEDS: GSC property verified + OAuth token]` — gates #5.
- `[NEEDS: verify on-landing scorecard is a static mock]` — affects #3 visual captions (recon: yes, hardcoded).

*All copy and flows here are DRAFT. No sends, posts, charges, or live account changes were made. Correction carried from recon: the "stale $10 llms.txt pricing" item is resolved — live llms.txt already carries $47/$197/$497; not an action item.*
