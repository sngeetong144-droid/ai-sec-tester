# AI Sec Tester — Ranked Automation Roadmap (merged backlog)

> **Status:** DRAFT plan. Nothing here posts, sends, charges, or spends.
> **Source:** merged + ranked from `automation/01-launch-ops-automation.md` and `automation/02-fulfillment-ops-automation.md`, cross-checked against `launch/00–06`.
> **Product:** AI Sec Tester — OWASP-LLM Top-10 chatbot scanner. Live at scan.thesoulsofai.com. Admin-operated: request → triage → approve → customer pays → activate → scan → report emailed. No customer login.
> **Pricing (single source, `lib/payment-links.ts`):** $47 / $197 / $497 — three distinct FastPayDirect links.
> **Owned stack only (MTCOOM):** n8n (automation.thesoulsofai.com), Supabase (DB + Storage), Resend (domain verified), Vercel (hosting + daily cron), Claude Code, Remotion/ffmpeg, local scripts.
> **Ranking:** revenue-or-time impact ÷ effort, highest first. Effort: S ≤ half a day · M 1–2 days · L 3+ days.

**Read this before ranking anything else.** Every revenue row below sits downstream of one unfinished prerequisite: migrations `0004`/`0006` applied in prod, `CRON_SECRET` set, and **one real intake → approve → pay → scan → graded report** completed end-to-end on an owned test bot. That single proof run also produces the sample-report lead magnet and the first real screen assets. It is listed as G1 in the gated table because its payment step is T-07. Until G1 is green, treat the whole launch as a verification sprint.

Also standing, do not re-litigate: **the daily cron is `0 0 * * *`** — worst-case dispatch latency ~24h. No automation below may be used to market same-hour turnaround. And there are **zero customers, metrics, testimonials, or logos** — no automation may generate or imply one.

---

## 1. Build this week — owned stack, no gate

Nova can build, run, and verify these unattended. None of them send to a stranger, post publicly, move money, or spend.

| # | Automation | Owned tool | Replaces (the manual step today) | Effort | Buildable-now vs GATED | Revenue / time link |
|---|---|---|---|---|---|---|
| 1 | **Daily "open requests aging" operator digest** (S4) | Vercel daily cron + Resend (internal email) | Hoping the real-time `sendNewRequestAlert` was seen; manually re-checking the queue | **S** (~1h) | **NOW** — internal email only | A silently-dropped alert = an aged-out request = a lost $47–$497 sale. Cheapest reliability backstop in the whole list. |
| 2 | **Store the rendered PDF, not the plain-text body** (A6 gap) | Supabase Storage `reports` + existing `/api/scans/[id]/report` render | Report artifact stored as email text; operator hand-explaining/hand-attaching the real PDF | **S** (~1–2h) | **NOW** — swap the upload source | The PDF *is* the deliverable ("a document you can hand an auditor"). Also the raw material for the lead magnet and the first case asset. |
| 3 | **Stage counter + UTM attribution** (request → approved → paid → delivered → re-scan) | Supabase table + Vercel route + UTM scheme | Guessing which channel produced a request; no request→approved / approved→paid ratio | **S–M** | **NOW** | You cannot decide where to spend the next 30 days without this. `05-channel-funnel` §2.1 blocks channel scaling on it. |
| 4 | **Mention / competitor monitoring — free tier** | Google Alerts RSS → n8n → Supabase `mentions` (dedup on URL) → Resend digest | Ad-hoc manual searching for "prompt injection scanner", competitor names, OWASP-LLM chatter | **S** (~20–30 min for the RSS digest) | **NOW** — read-only + internal digest | Catches the moment someone publicly asks "how do I test my chatbot for prompt injection" — a warm, authorized-framing outreach opening. Reply is gated; the *signal* is free. |
| 5 | **Social queue (draft-and-hold)** | Supabase `social_queue` (`channel`, `body`, `asset_path`, `scheduled_for`, `status`) + n8n weekly nudge | Deciding what to post, rewriting it fresh, remembering the 2-week calendar | **S** | **NOW** for the queue — **publishing is gated (G4)** | The copy bank already exists (10 posts + 5 scripts + calendar in `launch/06`). The queue's only job is to stop drafted assets from rotting unposted. |
| 6 | **Nurture engine in draft/hold mode** | Supabase `leads` (`next_step`, `send_after`) + capture route + n8n cron + Resend templates | Watching for opt-ins by hand; writing a first-touch email; remembering day 3 / day 7 | **M** | **NOW as draft-only** (n8n composes and parks the send) — **flipping to auto-send is gated (G5)** | The bridge from "downloaded the sample report" to "requested a scan". Sequences A/B/C are already written in `launch/03` — reuse, do not rewrite. Needs the lead magnet (falls out of G1). |
| 7 | **Feedback / testimonial capture** | Vercel form route + Supabase `feedback` table (incl. consent + attribution level + `approved_to_publish`) + parked ask email | Remembering who got a report and asking each one by hand | **S–M** | **NOW to build; parked** — nothing to trigger on until the first real report ships; **sending the ask is gated (G6)** | Zero social proof exists today; it is the #1 conversion gap. This guarantees the ask fires at the highest-response moment (report delivery) instead of never. |

**Do not rebuild (already automated and correct):** public intake + persistence (A1), honeypot/rate-limit bot filter (A2), jurisdiction/geo/sanctions scoring (A3), new-request operator alert (A4), scan dispatch → run → finalize (A5), report delivery email (A7), the 48h reminder + 14d auto-close logic (A8 — coded, enabling is gated). The cron doc-comment saying "every 5 min" and the header saying "REPORT UPLOAD IS MISSING" are both **stale** — trust `vercel.json` and `storeReportArtifact()`.

---

## 2. Gated / later

Each row names the exact gate and who opens it. Nova drafts, wires, and verifies; **Creator releases.**

| # | Automation | Owned tool | Replaces (the manual step today) | Effort | Gate — and who opens it | Revenue / time link |
|---|---|---|---|---|---|---|
| G1 | **Prove the pipe once** — apply migrations `0004`/`0006`, set `CRON_SECRET`, run ONE real end-to-end scan on an owned bot | Supabase migration + Vercel env + existing cron path | Everything. Persistence, dispatch, reminders and every external claim are dark until this is green | **M** | **Payment + prod deploy.** Creator applies the migration and takes the payment-send step (T-07) once, on an owned bot. | **Unblocks G2, G3, #6, #7 and every "we received your request / you'll get a report" line in the launch pack.** Highest-value single action in the file. |
| G2 | **"Approve & send pay link" one-tap console action** (S2) | Command Center action → `resolvePaymentLink` + `buildPaymentUrl` + Resend; sets `payment_link_sent_at` | Admin approving, then separately composing and sending the payment email by hand | **S–M** (pieces exist; wire behind one guarded button) | **Payment + outbound (T-07 hard gate).** Creator lifts T-07. Human still taps — the tap is not the friction, the copy-paste is. | Highest revenue leverage of the gated set. It also populates `payment_link_sent_at`, which is what arms G3. |
| G3 | **Enable the 48h payment reminder + 14d auto-close** (A8 — already coded) | `handleStale()` in the daily cron + Resend (idempotency already guarded) | Chasing approved-but-unpaid requests by hand; manually closing dead ones | **S** (enable + verify, not build) | **Payment + outbound.** The reminder re-sends a live pay link → same gate class as first send. `[NEEDS: confirm T-07 scope covers the reminder path, not just first send]`. Creator. | Recovering one approved-but-unpaid request is a near-pure-margin $47–$497. These people already asked, passed due diligence, and got a price. |
| G4 | **Publishing from the social queue** | Creator posts manually from the queue (no platform-API auth built — deliberately) | Nothing further — the drafting is #5 | — | **Public posting (hard gate).** Creator. Do not wire LinkedIn/X API publishing; the one step a scheduler would automate is the one step that stays human. | Indirect, compounding top-of-funnel. |
| G5 | **Flip the nurture sequence to auto-send** | n8n + Resend (built in #6) | One-click approval per parked send | **S** (a flag) | **Outbound send.** Creator. Warm/opt-in list only, double opt-in, unsubscribe honored. | Direct — but only once a list exists. The list does not exist yet; #6 is what builds it. |
| G6 | **Send the testimonial/feedback ask; publish a testimonial** | Resend (built in #7) + site pulls `approved_to_publish` rows | Asking by hand; never asking | **S** | **Outbound send** for the ask; **public content + explicit customer consent** for publishing. Creator. | Strategic — one real, consented, named testimonial removes a top-3 objection everywhere. **Never fabricate one.** |
| G7 | **30-day re-scan invite** (S5) | Daily-cron pass over completed scans (~day 25) + Resend; needs `completed_at` + a "rescan invited" guard flag | Nothing today — the free re-scan is promised and never proactively offered | **S–M** | **Outbound send (light).** Creator approves the copy once. Also needs a delivered report to exist (G1). `[NEEDS: confirm which tiers include the free re-scan — copy assumes Enterprise]`. | Retention + tier-up. Lands on the same clock as the 30-day signed-URL expiry — one reminder covers both. |
| G8 | **Payment webhook → `paid_scanning`** (S3) | Existing `app/api/stripe/webhooks/route.ts` shell + FastPayDirect | Admin manually flipping status after seeing a payment | **M** | **Payment + credential.** `[NEEDS: confirm FastPayDirect emits signed webhooks]` — **not confirmed.** Creator checks the FPD account and supplies the signing secret. **If FPD cannot sign, do not build it** — fall back to a manual "mark paid" tap. Never auto-launch a scan on an unauthenticated "paid" callback. | Closes pay → scan without a human flip. Genuinely nice; strictly less urgent than G2/G3, and worthless if the webhook doesn't exist. |
| G9 | **GSC / rank monitoring** | Vercel or n8n cron → Google Search Console API (**free**) → Supabase `rank_history` → threshold alert | Logging into GSC and eyeballing indexation/queries weekly | **M** (OAuth is the real cost) | **Credential.** Creator owns the Google account and must consent to the GSC property + OAuth token. | Indirect, slow. **Defer:** `llms.txt` is the only live GEO asset — everything else in `launch/04` is an outline. Build this *with* the SEO content push or it monitors a blank room. |
| G10 | **Auto-approve a "clean" lane** (S1) | — | Admin triage on the obviously-fine minority | **M** | **Legal / authorization.** Creator only. | **Recommendation: do not build in v1.** Authorization is the receipt the product sells; moving it into code destroys the differentiator and creates real liability. Ship `low_risk_recommend_approve` as an advisory flag with a one-tap human confirm instead. |
| G11 | **Multi-step dunning ladder** (S6) | — | The single 48h nudge before the 14d close | S | Payment + outbound (each step re-sends a pay link). | **DROP — YAGNI.** One reminder + auto-close is adequate at launch volume. Add a second nudge only if data shows drop-off between 48h and 14d. There is no funnel to measure yet. |

---

## 3. New paid tools — justified or dropped

Every one of these was considered against the owned stack. **All are dropped or gated. Nothing new is recommended for purchase.**

| Paid tool | Considered for | Verdict |
|---|---|---|
| Buffer / Hypefury (social scheduler) | Social queue (#5) | **DROPPED.** The queue is a Supabase table with a `scheduled_for` column. Publishing is a Creator hard gate regardless — the scheduler would automate the one step that can't be automated. |
| Semrush credits | Keyword-difficulty validation (`launch/04`) | **GATED — spend. Drop for launch.** Ship the low-competition buyer-intent long-tails; they're worth writing without validation. Revisit only if a pillar demonstrably stalls. |
| Bright Data / paid social listening | Tier-2 depth on mention monitoring (#4) | **DROPPED for now.** Google Alerts RSS covers ~70% of the value for $0. Revisit only if the free digest proves there's enough signal to structure — and only with a revenue link + exit plan. |
| Ahrefs / Surfer / Clearscope | SEO | **DROPPED.** GSC + Bing Webmaster Tools + Keyword Planner + Rich Results Test cover go-live for free. |
| Paid ads (any platform) | Top-of-funnel | **HOLD — money gate.** Spending to drive traffic into an unproven request→pay→deliver flow is paying to discover the flow is broken. Ads are a scaling lever after the first paid scans, not a discovery tool before them. |
| Apollo | Cold-outbound list | **No new spend.** Free/existing tier only. |

---

## If you only do three things

1. **G1 — prove the pipe once.** Migrations + `CRON_SECRET` + one real scan end-to-end on a bot you own. It unblocks the reminders, the lead magnet, the first real assets, and every external claim in the launch pack.
2. **#1 + #2 — the daily aging digest and the PDF-in-storage swap.** Three hours total, zero gates, and together they mean no request quietly dies and the deliverable is actually the document you promised.
3. **G2 — lift T-07 and ship "approve & send pay link."** It's the only automation that directly converts an approval into money, and it arms the 48h reminder (G3) that recovers the ones who stall.

Everything else — social queue, nurture, testimonials, GSC — is drafted, parked, and worthless until a stranger can pay you and get a report back. Build in that order.
