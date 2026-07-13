# 05 — Channel & Funnel Strategy

**Product:** AI Sec Tester — OWASP-LLM Top-10 scanner for chatbots / AI agents
**Live:** https://scan.thesoulsofai.com (request-first, no self-serve checkout)
**Parent brand:** The Souls of AI
**Status:** DRAFT — planning only. No posting, sending, account changes, or spend authorized by this file.
**Owner:** Marketing (launch team)
**Date:** 2026-07-12

**Tag key** (identical to `00-LAUNCH-PLAYBOOK.md` — this file does not get its own, looser rules):
- `[NOVA-CAN-DO]` — draftable / buildable / verifiable now inside high-autonomy scope (owned stack, no send/post/spend).
- `[CREATOR-GATE]` — posting, sending, moving money, spend, or legal/account change. **Hard stop for Creator.** No file, plan, or week in this document can self-authorize one of these steps.
- `[NEEDS: ...]` — a real unverified dependency. Not a claim; a gap to close before the dependent step can proceed.

---

## 0. How to read this file

This is the go-to-market layer that sits on top of the assets already drafted:

- Positioning, ICP, objections → `marketing/positioning.md`
- Copy bank (hero, emails, posts, ads, PH) → `marketing/launch-content.md`
- Detailed channel calendar, Apollo segments, KPI math → `marketing/channel-funnel-plan.md`
- Short-form video/demo scripts → `marketing/video-social-scripts.md`
- SEO/GEO keyword + content plan → `marketing/seo-geo-content.md`

This file does not re-derive personas or re-write copy. It decides **which channels get effort**, **how the funnel is wired given a request-first model**, **three creative concepts**, and **what happens in the first 30 days, week by week**. Where it touches the same ground as `channel-funnel-plan.md`, treat that file as the operational long-form; this is the launch-team decision layer.

### Non-negotiables carried into every channel

1. **Authorization-first is the lead message, not the disclaimer.** Every channel states plainly: you may only scan a bot you own or are explicitly authorized to test; the product enforces this before any probe fires.
2. **No fabricated proof.** No invented metrics, logos, testimonials, or scan counts. Placeholders are marked `[NEEDS: ...]`.
3. **Voice = calm security engineer.** State the failure mode, then show the receipt. No AI-hype, no fear-selling, no countdown urgency. (See voice section in positioning.md.)
4. **Runtime claims are soft until proven.** Do not promise "results in seconds." Promise the deliverable (score + PDF + remediation), not a measured speed. `[NEEDS: proof of a real end-to-end scan→graded PDF→email]`.
5. **Tier scope is fixed** (`landing.tsx:74/92/111`). Normal $47 = **5 OWASP LLM checks**. Advanced $197 = **full OWASP LLM Top-10 coverage** — the paid differentiator; never imply it at $47. Enterprise $497 = full report + **1 free re-scan after fixes** — **Enterprise-only**, and it must not appear in any non-Enterprise copy in any channel.
6. **Admin-operated product.** The public page is a request-a-scan intake form: no customer login, no self-serve checkout, no customer-triggered scan. Never write channel copy whose verbs imply the reader operates the product.

---

## 1. Channel fit — where this niche actually is

Scoring key: **Fit** = how well the audience and message match the channel. **Cost** = MTCOOM effort/spend (owned stack preferred). **Speed** = time to first qualified request. Priority is Fit × Speed ÷ Cost, adjusted for launch realism.

| Channel | Fit | Cost | Speed to 1st lead | Verdict |
|---|---|---|---|---|
| **Cold outbound (targeted, authorized framing)** | High | Low (owned: Apollo free tier + Resend) | Fast | **P0 — primary** |
| **LinkedIn (founder + company, organic)** | High | Low | Medium | **P0 — primary** |
| **Dev/security communities** | High | Low but high-touch | Medium | **P1 — earn trust, don't spam** |
| **X / Twitter (build-in-public + AI-security niche)** | Medium-High | Low | Medium | **P1** |
| **Directories / marketplaces** | Medium | Low-Med | Slow (approval lag) | **P2 — set-and-forget** |
| **SEO / GEO (llms.txt + content)** | High long-term | Low-Med | Slow (weeks-months) | **P2 — compounding, start now** |
| **Product Hunt / launch platforms** | Medium | Med (prep-heavy) | One-shot spike | **P2 — after real proof exists** |
| **Paid ads** | Low (now) | High | Fast but wasteful pre-proof | **Hold — no spend until conversion is proven** |

### 1.1 Cold outbound — P0 primary

**Why it fits:** The buyer is specific and findable — teams shipping a customer-facing chatbot or AI agent (SaaS, support automation, AI-native products). Apollo can segment on "AI/ML" + "support automation" job posts, chatbot-adjacent titles (Head of Eng, CTO, AppSec lead, Founder at seed/Series-A AI product), and companies with a visible bot on their site.

**Angle that lands:** not "buy a scan" — **"before an attacker does."** A one-line, specific, non-alarmist opener naming the exact failure mode (system-prompt leakage, prompt injection) plus the authorization gate as the reason this is legitimate. This is the sharpest wedge because it names a risk the recipient's existing pentest almost certainly never tested. (Objection #3 in positioning.md is the script.)

**MTCOOM:** Apollo free/existing tier for lists; Resend (domain verified) for sends. No new tool.

**Ethical guardrail baked into the pitch itself:** outbound must offer to scan **the recipient's own bot**, with their authorization. Never frame outreach as "we scanned you" — that would imply unauthorized testing and is exactly what the product refuses to do. The pitch is "here's what a first-pass looks like on a bot you authorize us to test."

> `[NEEDS: build/segment the Apollo list]` — assumed by channel-funnel-plan.md, not yet built.
> `[NEEDS: confirm scan_requests migrations 0004/0006 applied in prod]` — until confirmed, do not promise reliable "we received your request." Route outbound to a form that at minimum emails the team.

### 1.2 LinkedIn — P0 primary

**Why it fits:** This is where AppSec leads, AI product founders, and eng managers actually read long-form technical takes. The authorization-first story is a *point of view*, not just a product — that travels on LinkedIn.

**Two surfaces:** (a) founder/personal account posting technical POV and findings-style content; (b) The Souls of AI company page as the credibility anchor and re-share.

**Content spine:** the "trust through restraint" angle. Post the *category* of failure (a bot handing over its system prompt to anyone polite about it), name the OWASP LLM code, then land on why a first-pass filter beats "did nothing" and costs less than a five-figure red-team.

**MTCOOM:** organic only. No LinkedIn ad spend at launch.

### 1.3 Dev/security communities — P1

**Why it fits but needs care:** r/netsec, r/LLMDevs, OWASP LLM community, AI-security Discords/Slacks, Hacker News (Show HN much later, only with real scan proof). These audiences are allergic to marketing and to overclaiming. They will punish "AI-powered unhackable scanner" language instantly — which is exactly why our anti-hype, evidence-first voice is an *advantage* here.

**Rule:** contribute before pitching. Answer prompt-injection questions, share the OWASP-LLM framing, be useful. The product mention is a footnote, not the post. One overclaim here costs more than ten good comments earn.

**Do not:** post "run our scanner on any URL" — the community will (correctly) read it as an unauthorized-scanning tool. Lead every mention with the authorization gate.

### 1.4 X / Twitter — P1

**Why it fits:** active AI-security and build-in-public niche; short technical threads on a specific failure mode perform. Repurpose the same POV as LinkedIn, tighter. Good home for the short-form video scripts (`video-social-scripts.md`).

### 1.5 Directories / marketplaces — P2 set-and-forget

Submit once, then leave: AI-tool directories, security-tooling lists, OWASP resource pages where appropriate, relevant "AI security tools" GitHub awesome-lists. Low effort, slow trickle, compounding backlink/GEO value. `[NEEDS: shortlist + submission copy]`.

### 1.6 SEO / GEO — P2 but start now

Compounding, not fast. `llms.txt` is already live and correct ($47/$197/$497 + compliance block) — it is currently the **only** shipped GEO asset. The 6 blogs, 2 comparison pages, and pillar guide in `seo-geo-content.md` are outlines only. Start publishing the highest-intent comparison page ("LLM chatbot security scan vs. generic DAST" / "vs. red-team") early because it maps directly to the buyer's mental model.

> Correction for the team: the old action item "fix stale $10 llms.txt pricing" is **DONE**. Drop it.

### 1.7 Paid ads — HOLD

No paid spend until the organic funnel proves that a request converts to a paid scan at all. Spending to drive traffic into an unproven request→pay→deliver flow is burning money to discover the flow is broken. Ads become a scaling lever *after* first paid scans, not a discovery tool before them. (Hard gate: any ad spend is a Creator money decision.)

---

## 2. Funnel map — awareness → requested-scan → paid → re-scan/upsell

The request-first model changes the standard SaaS funnel in one important way: **there is a human due-diligence gate between "wants it" and "pays."** That gate is a conversion step *and* the core differentiator. Design the funnel to treat approval as a feature the buyer is glad to clear, not friction to hide.

```
[ AWARENESS ]
  Cold email · LinkedIn/X POV · community answers · directories · GEO/llms.txt
  Message: "Your chatbot has a system prompt. Can a stranger read it?"
        │
        ▼
[ INTEREST / EDUCATION ]
  Landing page (scan.thesoulsofai.com) · sample report lead magnet [NEEDS: build]
  · comparison content (vs DAST / vs red-team)
  Message: authorization-first + real OWASP-LLM probes + evidence-per-finding
        │
        ▼
[ REQUESTED SCAN ]  ◄── primary conversion event
  Request form (#request), two consent boxes, target + tier
  NO payment taken, NO scan launched yet
  Server-side: re-checks consent, resolves requester+target country,
  auto-rejects OFAC/sanctions, HOLDS SG/MY for manual licensing review
  [NEEDS: confirm scan_requests migrations live in prod]
        │
        ▼
[ DUE-DILIGENCE / APPROVAL ]  ◄── the differentiator, made visible
  Admin reviews authorization + jurisdiction. Target: ~1 business day.
  Outcome: approve · hold-for-review · reject (with reason)
  This step is positioned to the buyer as "why the result is credible."
        │
        ▼
[ PAID ]
  Approved → emailed FastPayDirect payment link
  Normal $47 · Advanced $197 (per scan) · Enterprise $497 (per chatbot)
  [NEEDS: confirm approval→payment-link is human/MFA-gated, not auto-send (T-07 launch-block)]
        │
        ▼
[ SCAN RUNS → REPORT DELIVERED ]
  Real interactive probes graded by LLM judge → A–F / 0–100 + branded PDF
  + evidence per finding + plain-language remediation
  [NEEDS: proof of a real end-to-end scan→PDF→email]
        │
        ▼
[ RE-SCAN / UPSELL ]
  • One free 30-day re-scan — ENTERPRISE ONLY (landing.tsx:111). Not at $47 or $197.
    [NEEDS: the re-scan INVITE flow is NOT BUILT (automation/02). Today the only
     mechanism is: customer replies with the re-scan reference, operator queues it.
     Do not design this funnel stage around an invite email or a link that exists.]
  • Fixed the findings? A re-scan proves it. Natural re-engagement, no new sell.
  • Tier-up: Normal (5 core checks) → Advanced (full OWASP LLM Top-10) → Enterprise (identity verify + human review + free re-scan)
  • Per-bot expansion: multi-bot orgs scan each customer-facing surface
  • Cadence: re-scan after each material bot/prompt change (bots drift; so does risk)
```

### 2.1 Funnel-stage instrumentation `[NEEDS: build UTM/analytics]`

You cannot optimize what you cannot see. Minimum viable tracking before scaling any channel:

- UTM tags on every outbound/social link (source/medium/campaign) → attribute requests to channel.
- Count at each stage: request submitted → approved → paid → report delivered → re-scan.
- The two ratios that decide everything: **request→approved** (are we targeting authorized owners?) and **approved→paid** (is price/value/payment-link working?).

### 2.2 The two failure points to watch

1. **Approval drop-off from unqualified requests.** If lots of requests get held/rejected for authorization or jurisdiction, the *targeting* is wrong, not the funnel. Fix upstream (who we email), not the gate.
2. **Approved-but-unpaid.** The lifecycle plan cites a 48h payment reminder + 14d auto-close. `[NEEDS: confirm 48h/14d cron lifecycle is live]` — cite as designed behavior, don't promise it externally until verified.

---

## 3. Three ad / creative concepts

All three are **concepts + angles**, not final copy — the copy bank in `launch-content.md` holds the polished versions. Each obeys voice rules: concrete failure mode first, evidence not adjectives, authorization as a feature. None fabricate results.

Reusable visual caution: the on-landing scorecard (PASS/PASS/REVIEW/PASS/PASS, grade A-) is a **static mock** in landing.tsx. Any creative reusing it must caption it as an *illustrative category example*, not a real scan result. `[NEEDS: real scan output before any "this is a real result" visual]`.

### Concept A — "Ask it nicely" (the leak demo)

- **Insight:** the most visceral, least hypey LLM failure is a bot revealing its own system prompt to a polite request.
- **Format:** 15–30s screen-style short (repurpose from `video-social-scripts.md`) OR a static two-panel.
- **Beat 1:** a plausible chatbot. Beat 2: a calm, polite message → the bot starts leaking its instructions. Beat 3: cut to the scorecard row `LLM07 System-prompt leakage — FAIL` (captioned as illustrative).
- **Line:** *"Your bot has a system prompt. Can a stranger read it? Find out before an attacker does."*
- **CTA:** Request a scan on a bot you own. $47 to start.
- **Why it works:** shows the receipt, names the OWASP code, no fear-porn, no hype word.

### Concept B — "Two piles" (category wedge)

- **Insight:** buyers think they're covered because they have a pentest firm or ran a jailbreak prompt once. Neither tests LLM-specific failure modes.
- **Format:** static carousel (LinkedIn) or thread (X). Three cards.
- **Card 1:** "Generic DAST scanners test SQLi and headers. They pass a chatbot that leaks its entire instruction set." **Card 2:** "'Just ask an LLM to jailbreak it' gives you an anecdote you can't show a customer or auditor." **Card 3:** "AI Sec Tester: real OWASP-LLM probes, graded by an LLM judge, evidence per finding — a document, not a hunch. And it won't run until you prove you're authorized to test the target."
- **Line:** *"The fast first-pass filter between 'did nothing' and a five-figure red-team."*
- **Why it works:** it's the positioning angle verbatim; it educates and disqualifies competitors without naming or trashing them.

### Concept C — "Authorization as the feature" (trust through restraint)

- **Insight:** the thing that makes it legal is the thing that makes the result credible. Lead with the restraint.
- **Format:** single strong static / LinkedIn text post / cold-email hero line.
- **Copy spine:** *"Most scanners will point at any URL you give them. Ours refuses. It won't fire a single probe until you've shown you own — or are authorized to test — the target: ownership, plus a geo, sanctions, and licensing check. That's not fine print. It's why the Pass/Fail report is something you can hand to a customer, an investor, or an auditor."*
- **CTA:** Request a scan — no charge until it's approved.
- **Why it works:** turns the one thing a lazy competitor calls "friction" into the headline differentiator, and pre-answers objection #2 (why request-and-wait).

> All three creatives: no "revolutionary / next-gen / AI-powered / unhackable / military-grade." No 100%-coverage or "replaces a red-team" implication. No invented stats.

---

## 4. First 30 days — weekly GTM sequence

Reality gates this plan: two runtime unknowns (`scan_requests` migrations live? real end-to-end scan proven?) sit upstream of promising anything externally. **Week 1 is partly a verification sprint** — you cannot responsibly drive strangers into a request→pay→deliver flow you haven't watched complete once. This is not padding; it prevents the worst launch outcome (traffic hits a form that silently drops or a scan that never delivers).

Each week: a theme, concrete actions, and the gate that must clear before the next week scales.

### Week 1 — Prove the pipe + arm the channels (mostly internal)

**Theme:** make one real request go all the way through, and load the guns without firing.

- **Verify (blocking):** confirm `scan_requests` migrations 0004/0006 are applied in prod; run one real request end-to-end on an owned test bot → approval → payment link → scan → graded PDF email. Record proof. `[NEEDS]` × these until done.
- **Verify:** confirm approval→payment-link send is human/MFA-gated (T-07), and whether the 48h/14d lifecycle cron is live.
- **Build (owned stack):** UTM scheme + a simple stage counter (request/approved/paid/delivered). Draft the sample-report lead magnet from the real end-to-end run (redact anything owner-specific). `[NEEDS: sample-report magnet]`.
- **Arm:** `[NOVA-CAN-DO]` finalize Apollo segment (50–100 target accounts, tight ICP), draft the cold sequence from launch-content.md, draft first 3 LinkedIn posts + Concept B carousel. **Drafting only — nothing in Week 1 is sent or posted.**
- **Gate to Week 2:** at least one real scan proven end-to-end; tracking live; list + first sends drafted (not sent).

### Week 2 — Quiet outbound + POV, start listening in communities

**Theme:** first real conversations, small volume, learn fast.

- **Outbound:** `[CREATOR-GATE]` send cold sequence to a *small* first batch (e.g. 20–30) to test deliverability, reply rate, and — critically — request→approved quality. Do not blast the full list. **Outbound sending is a hard Creator gate. This file cannot authorize it.**
- **LinkedIn:** `[CREATOR-GATE]` publish Concept C ("authorization as the feature") as founder POV + company re-share. `[CREATOR-GATE]` publish one "ask it nicely" style teardown (illustrative).
- **Communities:** `[NOVA-CAN-DO]` begin *contributing* (answers, not pitches) in 2–3 target communities. Zero product spam this week. `[CREATOR-GATE]` on any post that mentions the product.
- **X:** `[CREATOR-GATE]` repurpose the LinkedIn POV as a tight thread.
- **Measure:** reply rate, request rate, and the request→approved ratio on the first batch.
- **Gate to Week 3:** deliverability healthy; ≥1 qualifying request from outbound OR clear signal on what to fix in targeting/message.

### Week 3 — Scale what worked, publish the wedge

**Theme:** double down on the channel showing request signal; ship the comparison asset.

- **Outbound:** `[CREATOR-GATE]` expand to the next batch using the winning subject/opener from Week 2. Kill the weakest variant.
- **Content:** `[CREATOR-GATE]` publish the highest-intent comparison page (vs DAST / vs red-team) from `seo-geo-content.md` — the buyer's actual mental model, and it feeds GEO. (Drafting the page is `[NOVA-CAN-DO]`; publishing is not.)
- **LinkedIn/X:** `[CREATOR-GATE]` post Concept B "two piles" carousel/thread; `[CREATOR-GATE]` one findings-style post from a real (owned-bot) run.
- **Directories:** `[CREATOR-GATE]` submit to the shortlisted AI-tool / security-tool directories (set-and-forget). `[NEEDS: shortlist]`.
- **Measure:** channel-attributed requests via UTM. Identify the single best channel.
- **Gate to Week 4:** one channel clearly outperforming; approved→paid ratio observable (i.e. at least a few approvals reaching the payment-link stage).

### Week 4 — Convert, close the loop, decide on scaling

**Theme:** turn approvals into paid scans, activate the re-scan loop, decide what earns more spend.

- **Conversion focus:** review approved-but-unpaid; confirm the 48h reminder is doing its job. `[CREATOR-GATE]` any manual follow-up send. Fix any approved→paid friction found.
- **Re-scan/upsell motion:** for **Enterprise** reports only, set the free 30-day re-scan expectation and the "re-scan after you fix, then after every material change" cadence. Normal/Advanced customers get **no** free re-scan — offer a tier-up or a paid re-scan instead. `[NEEDS: the re-scan invite flow is NOT BUILT — the only mechanism is customer replies with the re-scan reference and an operator queues it. Do not promise an invite or a link.]` `[CREATOR-GATE]` on any re-scan/upsell email actually being sent.
- **Content:** `[CREATOR-GATE]` publish second POV/teardown; `[NOVA-CAN-DO]` begin drafting the next comparison/FAQ asset.
- **Review & decide:** compile the 30-day scorecard (requests, approved, paid, delivered, by channel). Decide: (a) which channel gets more effort in days 31–60; (b) whether organic conversion is proven enough to *consider* paid ads — this is a Creator money gate, not an auto-decision; (c) whether Product Hunt is warranted (only if a real, showable scan result and at least one genuine proof point exist).
- **Gate to Month 2:** a documented winning channel + a proven request→pay→deliver→re-scan loop, or a clear, specific blocker list.

### 30-day scorecard template `[NEEDS: fill with real data — do not fabricate]`

| Metric | Target (illustrative, unvalidated) | Actual |
|---|---|---|
| Requests submitted | — | `[NEEDS]` |
| Request → approved % | — | `[NEEDS]` |
| Approved → paid % | — | `[NEEDS]` |
| Reports delivered | — | `[NEEDS]` |
| Best channel by requests | — | `[NEEDS]` |
| Re-scans triggered | — | `[NEEDS]` |

All target numbers are illustrative placeholders; do not present them as forecasts. First cohort *sets* the baseline.

---

## 5. Open dependencies & gates (roll-up)

**Build before scaling (MTCOOM — owned stack):**
- `[NEEDS]` Apollo segment/list · sample-report lead magnet · UTM + stage tracking · comparison/FAQ pages (llms.txt is the only live GEO asset today).

**Verify before promising externally:**
- `[NEEDS]` `scan_requests` migrations 0004/0006 live in prod · one real end-to-end scan→PDF→email · approval→payment-link human/MFA gating (T-07) · 48h reminder / 14d auto-close cron · Enterprise token-gated report page.

**Hard gates (Creator approval required — do not self-authorize):**
- Any paid ad spend or new paid tool.
- Any live outbound send at volume, public posting, or Product Hunt launch (public + money-adjacent).
- Sending payment links (gated live action).
- Anything touching pricing, billing, or the FastPayDirect links.

**Do not fabricate:** no testimonials, logos, scan counts, or metrics until real ones exist. Every proof point in every channel is either verifiable today or marked `[NEEDS]`.

---

*End of 05 — Channel & Funnel Strategy (DRAFT). Operational detail lives in `channel-funnel-plan.md`; copy lives in `launch-content.md`.*
