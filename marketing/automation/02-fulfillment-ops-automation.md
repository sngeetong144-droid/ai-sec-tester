# AI Sec Tester — Fulfillment & Customer-Lifecycle Automation Map

> **Status:** DRAFT (ops architecture). No live changes, no sends.
> **Product:** AI Sec Tester — OWASP-LLM Top-10 chatbot scanner. Live at scan.thesoulsofai.com.
> **Model:** request-first (no self-serve checkout). intake → triage → **admin approve** → emailed pay link → pay → scan → report.
> **MTCOOM rule:** every automation below runs on the OWNED stack (n8n, Supabase DB+Storage+cron-via-Vercel, Resend, Vercel). No new paid tool is recommended.
> **Grounded in code** (read 2026-07-12): `app/api/scan-request/route.ts`, `app/api/cron/dispatch-scans/route.ts`, `lib/command-center/run-scan.ts`, `lib/payment-links.ts`, `app/api/enterprise/approve/route.ts`, `vercel.json`.

---

## 0. Read-this-first accuracy corrections

These override the recon grounding where the code disagrees. Cite the code, not the older notes.

1. **Report storage EXISTS** (grounding said "MISSING"). `storeReportArtifact()` in `lib/command-center/run-scan.ts` uploads the report body to Supabase Storage bucket `reports` and returns a **30-day signed URL** (30-day TTL; it is a link-expiry window, not a free-rescan entitlement — no tier includes one), fail-soft. The stored artifact is currently **plain text** (the composed email body), not a rendered PDF. A PDF *is* rendered on demand at `app/api/scans/[id]/report`, but that PDF is not yet what gets uploaded. The header comment in the cron route ("REPORT UPLOAD IS MISSING") is **stale**.
2. **The live cron is DAILY, not "every 5 min".** `vercel.json` → `"schedule": "0 0 * * *"` = once/day at 00:00 UTC. The route's own doc-comment says "every 5 min" — that comment is **wrong vs. the deployed schedule**. Consequence: dispatch, the 48h reminder, and the 14d auto-close all only *evaluate once per day*. Do **not** market same-hour turnaround; worst-case dispatch latency is ~24h even when everything is wired.
3. **One-click email approval is RETIRED.** `app/api/enterprise/approve/route.ts` returns **410 Gone**. Approval is now a **manual admin action inside the private Command Center** (`executeScan` + `lib/command-center/admin.ts`). "Approve" is a human step by design, not an automatable HTTP link.
4. **The whole lifecycle is gated on two things that are NOT confirmed live:** (a) migrations `0004`+`0006` for `public.scan_requests` — route comment says LOCAL / not yet applied; (b) the **T-07 launch-block** on outbound payment send (`lib/payment-links.ts`). Until both clear, everything below is *designed-and-coded* behavior, not *proven-live* behavior. Mark any external claim `[NEEDS: verify live]`.

---

## 1. Pipeline at a glance

| Stage | State | Runs on | Trigger | Human in loop? |
|---|---|---|---|---|
| Intake (request form) | **AUTOMATED** | Vercel route + Supabase | Public POST | No |
| Bot/abuse filter | **AUTOMATED** | honeypot + rate-limit + Turnstile* | on submit | No |
| Jurisdiction due-diligence | **AUTOMATED (advisory)** | geo + sanctions + triage libs | on submit | No — but only *scores*, doesn't decide |
| Operator alert | **AUTOMATED** | Resend (`sendNewRequestAlert`) | on saved request | No |
| **Triage → approve** | **MANUAL** | Command Center (admin) | admin review | **Yes (required)** |
| Authorization / licensing decision | **MANUAL** | admin judgment | admin review | **Yes (must stay human)** |
| Payment-link send | **MANUAL, GATED (T-07)** | Resend + FastPayDirect link | admin action | **Yes (gate)** |
| Pay | **EXTERNAL** | FastPayDirect | customer | n/a |
| Payment → `paid_scanning` | **PARTLY AUTOMATED** | Stripe/FPD webhook `[NEEDS: verify]` | on payment | No (if webhook live) |
| Scan run | **AUTOMATED** | cron `dispatch-scans` → `runScanForRequest` → `executeScan` | daily cron | No |
| Report artifact store | **AUTOMATED** | Supabase Storage + signed URL | on scan complete | No |
| Report email | **AUTOMATED** | Resend (`deliverComposedEmail`) | on scan complete | No |
| 48h payment reminder | **AUTOMATED (coded)** | cron `handleStale` + Resend | daily cron ≥48h | No |
| 14d auto-close | **AUTOMATED (coded)** | cron `handleStale` | daily cron ≥14d | No |
| 30-day PAID re-scan reminder | **NOT BUILT** | — | — | — |
| Dunning / abandoned-request nudge | **PARTLY (the 48h reminder is the only nudge)** | — | — | — |

\*Turnstile is skipped unless `TURNSTILE_SECRET_KEY` is set — currently a no-op gate.

---

## 2. ALREADY AUTOMATED (accurate — do not rebuild)

### A1 — Public request intake + persistence
- **Replaces:** a human copy-pasting form submissions into a tracker.
- **Owned tool:** Vercel serverless route (`scan-request/route.ts`) + Supabase `scan_requests`.
- **Effort:** built. Only remaining effort = apply migrations `0004`/`0006` in prod (gated deploy).
- **Buildable-now vs gated:** **GATED** — persistence is dark until the migrations land. Route inserts the row today; without the table the insert 500s.
- **Risk:** LOW logic risk; **the risk is a false "we got your request" promise** if the table isn't live. Verify before any funnel copy claims reliable receipt.

### A2 — Bot / abuse filtering
- **Replaces:** manual spam triage.
- **Owned tool:** honeypot field + IP/email-domain rate limiter (`lib/rate-limit`) + optional Cloudflare Turnstile.
- **Effort:** built (Turnstile dormant until keys provisioned — free tier).
- **Buildable-now:** **NOW** for honeypot+rate-limit; Turnstile is a 15-min wire-up once Creator adds keys.
- **Risk:** LOW. Turnstile-off means slightly weaker bot resistance, not a correctness bug.

### A3 — Jurisdiction due-diligence scoring (advisory, server-authoritative)
- **Replaces:** a human manually checking requester country / target host / sanctions on every request.
- **Owned tool:** `lib/geo`, `lib/jurisdiction-review`, `lib/jurisdiction-policy`, `lib/triage`. Server resolves requester IP-country + target DNS→country independently of client claims.
- **Effort:** built. Auto-**rejects** comprehensive-sanctions hits; **holds** SG/MY (licence-regulated) as `pending_review` — never auto-rejects on unverified law.
- **Buildable-now vs gated:** built; gated on same migrations.
- **Risk:** MEDIUM if ever repurposed to auto-*approve* — see must-stay-human §4. As-is (scores + flags only, human decides) risk is LOW. This scoring is a differentiator; keep it visible in ops, not just code.

### A4 — New-request operator alert
- **Replaces:** the operator polling a dashboard.
- **Owned tool:** Resend (`sendNewRequestAlert`), best-effort inline send.
- **Effort:** built.
- **Buildable-now:** **NOW** (Resend domain verified).
- **Risk:** LOW — send failure is swallowed so it never turns a saved request into an error. Downside: a silently-dropped alert = a request that waits. Add a daily "open requests" digest as backstop (see S4).

### A5 — Scan dispatch → run → finalize
- **Replaces:** an operator manually kicking off each scan engine run and babysitting it.
- **Owned tool:** Vercel Cron → `dispatch-scans` → `runScanForRequest` → `executeScan`. Bridges `scan_request` to its guarded `cc_case`, runs the ONE authorized scan path, marks complete, flips status. Batched (5/run), bounded retry (3 attempts), `in_flight` guard against double-run.
- **Effort:** built and well-guarded.
- **Buildable-now vs gated:** **GATED** — needs `CRON_SECRET` set, migrations live, and a real payment→`paid_scanning` transition upstream. Also `[NEEDS: proof a real end-to-end scan → graded report has completed once in prod]`.
- **Risk:** MEDIUM. Scans run **synchronously inside the request** (`maxDuration=60`). A slow target or slow LLM-judge can blow the 60s ceiling → the batch item fails and falls to retry/manual. Fine at low volume; revisit if a scan regularly exceeds ~50s. **Daily cron = up to 24h dispatch latency** (correction §0.2).

### A6 — Report artifact storage + signed URL
- **Replaces:** manually saving/hosting each report and pasting a link.
- **Owned tool:** Supabase Storage bucket `reports`, 30-day signed URL.
- **Effort:** built (fail-soft). **Gap:** stored artifact is plain-text email body, not the rendered PDF.
- **Buildable-now:** **NOW** to store PDF instead — swap the upload source to the existing `app/api/scans/[id]/report` PDF render. ~1–2h.
- **Risk:** LOW-MEDIUM. Reports contain vuln detail; the signed-URL TTL (30d) is correct restraint. Confirm the bucket is **private** (signed-URL-only, no public read) `[NEEDS: verify bucket ACL]`.

### A7 — Report delivery email
- **Replaces:** operator emailing each finished report.
- **Owned tool:** Resend via `composeEmail`/`deliverComposedEmail` inside the finalize flow.
- **Effort:** built.
- **Buildable-now vs gated:** gated only by the upstream scan actually running.
- **Risk:** LOW.

### A8 — 48h payment reminder + 14d auto-close (dunning, v0)
- **Replaces:** an operator chasing unpaid approved requests and manually closing dead ones.
- **Owned tool:** `handleStale()` in the cron. 48h → ONE reminder (idempotent: guarded by a `Reminder:%` subject match in `cc_email_log`). 14d → auto-reject with reason, idempotent via conditional `WHERE status=approved_awaiting_payment`.
- **Effort:** **already built** — this is the "48h reminder that exists" and the "14d auto-close" from the funnel plan. Both send/close through owned tools.
- **Buildable-now vs gated:** **GATED** on migrations + `payment_link_sent_at` being populated at approval time + T-07 (the reminder embeds a live pay link → that's an outbound-send-of-a-payment-link, same gate class as first send).
- **Risk:** MEDIUM. The reminder **auto-sends a payment link** — under §11/T-07 that is a gated live money-adjacent send. Confirm the T-07 gate covers the *reminder* path, not just the first approval send, before enabling the cron in prod. Idempotency logic itself is sound.

---

## 3. STILL MANUAL (by design or by gap)

| # | Step | Why manual now | Can it be semi-automated? |
|---|---|---|---|
| M1 | Admin triage & **approve** | Human decision on authorization/legality | Partial — auto-approve a narrow low-risk lane only (S1) |
| M2 | Authorization / licensing / sanctions **decision** | Legal risk acceptance | **No — must stay human (§4)** |
| M3 | Payment-link **send** | T-07 launch gate on outbound money path | Partial — one-click "approve & send" that still needs a human tap (S2) |
| M4 | Payment→`paid_scanning` reconciliation | Webhook wiring unconfirmed | Yes — verify/finish the FPD webhook (S3) |
| M5 | 30-day PAID re-scan invite | Not built | Yes — cron pass (S5) |
| M6 | "Open requests aging" oversight | No backstop if an alert drops | Yes — daily digest (S4) |

---

## 4. MUST STAY HUMAN (do not automate — this is the product's spine)

These are authorization/legal decisions. Automating them destroys the "authorization-first" differentiator and creates real liability.

- **The go/no-go authorization decision** — approving that the requester owns or is authorized to test the target. The system may *score, flag, reject-sanctions, and hold-licence*; a human must *approve*.
- **Licence-regulated jurisdictions (SG/MY and any future restricted code).** Code correctly holds, never auto-rejects on unverified law and never auto-approves. Keep the human sign-off.
- **Any sanctions/OFAC edge case the auto-reject didn't catch cleanly** (e.g. mismatch between declared, IP, and target country). Auto-reject handles the clear hits; the ambiguous ones are a human call.
- **First-ever outbound payment send while T-07 is active** — Creator gate, not an ops automation.

> Rule of thumb: automation may gather evidence and *stop the clearly-illegal*; it may not *authorize*. Authorization is the receipt the whole product sells.

---

## 5. SAFE SEMI-AUTOMATION CANDIDATES (per-item)

### S1 — Auto-approve a narrow "clean" lane
- **Replaces:** manual approval on the obviously-fine minority (owner-domain match, requester = target country, no sanctions/licence flag, low triage score, Normal tier).
- **Owned tool:** extend the existing status decision in `scan-request/route.ts` + one boolean policy check; no new infra.
- **Effort:** MEDIUM. The dangerous part isn't code, it's defining the lane conservatively.
- **Buildable-now vs gated:** **GATED — Creator approval required.** This moves an *authorization decision* into code; only safe for a tightly-fenced subset, and even then Creator must own the fence.
- **Risk:** HIGH if the lane is loose. Recommend **NOT auto-approving in v1.** Instead auto-*pre-clear* (mark `low_risk_recommend_approve`) and still require a one-tap human confirm. Restraint here is on-brand.

### S2 — "Approve & send pay link" one-tap console action
- **Replaces:** admin approving, then separately composing/sending the payment email.
- **Owned tool:** Command Center action → Resend + `resolvePaymentLink` + `buildPaymentUrl`; sets `payment_link_sent_at` (which A8's reminder depends on).
- **Effort:** LOW-MEDIUM (the pieces exist; wire them behind one guarded button).
- **Buildable-now vs gated:** **GATED (T-07).** Human still taps; automation only removes the copy-paste.
- **Risk:** MEDIUM — money path. Keep the human tap; log the send to `cc_email_log`. This is the highest-leverage safe win because it also lights up A8's 48h reminder.

### S3 — Payment webhook → `paid_scanning` (close the loop)
- **Replaces:** an admin manually flipping status after seeing a payment.
- **Owned tool:** the existing `app/api/stripe/webhooks/route.ts` shell + FastPayDirect webhook `[NEEDS: confirm FPD posts webhooks; else poll]`.
- **Effort:** MEDIUM. Map payment event → `scan_requests.status='paid_scanning'` (which A5's cron already consumes).
- **Buildable-now vs gated:** buildable now; verify FPD capability first.
- **Risk:** MEDIUM. Validate webhook signature; never trust an unauthenticated "paid" callback to launch a scan. If FPD can't sign webhooks, fall back to a manual "mark paid" tap — do **not** auto-scan on an unverified signal.

### S4 — Daily "open requests aging" operator digest
- **Replaces:** hoping every real-time alert (A4) was seen.
- **Owned tool:** add a branch to the existing daily cron → Resend summary of `pending_review` + `approved_awaiting_payment` with ages.
- **Effort:** LOW (~1h, reuses cron + Resend).
- **Buildable-now:** **NOW.** Cheapest reliability backstop; no gate (internal email only).
- **Risk:** LOW.

### S5 — 30-day PAID re-scan reminder
- **Replaces:** nothing today. Scoped when a free re-scan was believed to be an entitlement; ruling R-15 retired the Enterprise tier and NO tier includes one. A re-scan is a NEW PAID SCAN, so this step must sell one, never gift one.
- **Owned tool:** daily-cron pass over completed scans at ~day-25/30 → Resend invite to BUY a re-scan (and to upgrade Normal → Advanced).
- **Effort:** LOW-MEDIUM (needs a `completed_at` timestamp + a "rescan invited" guard flag, mirroring A8's idempotency pattern).
- **Buildable-now vs gated:** buildable now; internal-value email (not money) so lighter gate — still confirm copy with Creator before enabling.
- **Risk:** LOW. Retention/upsell on a paid re-scan. MUST NOT imply a free one — that entitlement never existed after R-15. Ties directly to the 30-day signed-URL TTL (A6) — expire and re-scan land on the same clock.

### S6 — Dunning beyond one reminder (optional, low priority)
- **Replaces:** the single 48h nudge before the 14d silent close.
- **Owned tool:** extend `handleStale` to a 2-step ladder (e.g. 48h + day-7) using the same email-log guard.
- **Effort:** LOW.
- **Buildable-now vs gated:** GATED (T-07 — each step re-sends a pay link).
- **Risk:** LOW-MEDIUM. **YAGNI for now** — one reminder + auto-close is adequate at launch volume. Add the second nudge only if data shows payment drop-off between 48h and 14d. `ponytail: don't build the ladder before there's a paying funnel to measure.`

---

## 6. Recommended build order (MTCOOM / laziest-first)

1. **S4 daily digest** — 1h, no gate, immediately de-risks dropped alerts.
2. **A6 PDF-in-storage swap** — reuse the existing PDF render; 1–2h.
3. **Verify the gated live path** — apply migrations `0004`/`0006`, set `CRON_SECRET`, run ONE real end-to-end scan → report to satisfy the `[NEEDS: proof]` items. This unlocks A1/A5/A7/A8 from "coded" to "live."
4. **S2 approve-&-send** (Creator lifts T-07) — highest revenue leverage; also activates A8.
5. **S3 webhook** — closes pay→scan without a human flip.
6. **S5 paid re-scan reminder** — retention, after the core loop is proven. Sells a new scan; no free re-scan exists.
7. Defer **S1 auto-approve** and **S6 multi-step dunning** — build only with data + Creator sign-off.

---

## 7. Open verification items (block external claims until cleared)

- `[NEEDS: verify]` migrations `0004`/`0006` applied in prod (all persistence).
- `[NEEDS: verify]` `CRON_SECRET` set in Vercel env (dispatcher auth).
- `[NEEDS: proof]` one real intake→approve→pay→scan→report has completed end-to-end.
- `[NEEDS: verify]` T-07 gate scope covers the A8 reminder's pay-link re-send, not only first send.
- `[NEEDS: verify]` FastPayDirect emits signed webhooks (S3 feasibility).
- `[NEEDS: verify]` Supabase `reports` bucket is private (signed-URL-only).
- **Do not** promise same-day turnaround while the cron is daily (§0.2).
- **No** invented metrics, testimonials, or scan counts — none exist.
