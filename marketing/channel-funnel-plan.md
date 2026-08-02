# AI Sec Tester — Channel & Funnel Plan

> **Status:** DRAFT — planning only. Nothing here posts, sends, or charges.
> All outreach copy and sequences are templates for Creator review before any send.
> **Product source of truth:** `app/_components/landing.tsx`, `public/llms.txt`, `lib/payment-links.ts`,
> `app/actions/scan-request-lifecycle.ts`, `lib/jurisdiction-policy.ts`.
> **Live surface:** https://scan.thesoulsofai.com

---

## 0. What we are actually selling (grounding)

AI Sec Tester runs automated, OWASP-LLM-Top-10-aligned probes against a chatbot the
customer **owns or is authorized to test**, and returns a Pass/Fail security scorecard
(branded PDF) with per-finding evidence and plain-language remediation. Checks shipped
today: prompt injection (LLM01), insecure output handling (LLM05), sensitive info
disclosure (LLM02), system prompt leakage (LLM07), excessive agency (LLM06), and common
jailbreak/guardrail-bypass patterns.

**The funnel is request-first, not self-serve.** There is no checkout button on the
landing page and **no self-serve scanning exists today**. Every CTA routes to a scan-request
form. The real, code-confirmed path is:

```
Request a scan  →  Admin reviews authorization (~1 business day)  →  (if approved)
emailed payment link  →  Customer pays  →  Scan runs  →  Report emailed (PDF)
```

Lifecycle facts from `scan-request-lifecycle.ts` that shape the funnel:
- Approved-but-unpaid: a **payment reminder fires at 48h**, and the request **auto-closes at 14 days** unpaid.
- Jurisdiction gate (`jurisdiction-policy.ts`): **Singapore / Malaysia targets are held for manual
  licensing review** (not auto-rejected), and **OFAC-sanctioned countries are auto-rejected**.

This is a deliberate legal/safety gate (scanning a system you don't own is illegal), and
it is also the core of the marketing message: *"Find out before an attacker does — we
verify you're authorized first."* Every channel decision below respects this shape. We are
not driving impulse checkout; we are driving **qualified scan requests**, then converting
approved requests to payment inside the 48h→14d window.

**Live pricing (from `lib/payment-links.ts`):**

| Tier | Price | Unit | What it is |
|---|---|---|---|
| Normal | $47 | one-time · per scan | 5 OWASP LLM checks, automated risk triage, human authorization review, Pass/Fail scorecard, branded PDF, evidence + remediation |
| Advanced | $197 | one-time · per scan | Full OWASP LLM Top-10 — all 10 categories (7 probed live, 3 advisory) across 15 checks, automated risk triage, human authorization review, auto-emailed PDF |

Two tiers, both request-first. There is no third tier and no per-chatbot SKU.

**ICP:** small-to-mid teams shipping customer-facing chatbots/assistants with **no dedicated
AppSec function**. They ship an AI support bot, a sales concierge, or an in-product
assistant, and nobody on the team owns "is this thing safe to jailbreak." That gap is the
wedge.

---

## 1. Prioritized launch channels

Ranked by fit to a request-first, low-ticket, founder-led security product with zero ad
budget assumed. Rationale is tied to what the product does and who the ICP is.

### Tier A — start here (weeks 1–4)

**A1. Cold email to a tightly-defined ICP (Apollo).**
*Why first:* The buyer is nameable and enumerable — companies that visibly run a
customer-facing chatbot and have an engineering lead but no security title. Apollo builds
that exact list. The $47 entry price and "request a scan, no charge until approved" offer
removes cold-email friction (no demo call required to get value). Highest-intent,
lowest-cost channel we control end to end.

**A2. Founder-led LinkedIn (organic posts + targeted DMs).**
*Why:* The ICP's decision-makers (CTO, head of eng, founder at a 5–50 person software
company) live on LinkedIn. The product produces a **visual artifact** — a Pass/Fail
scorecard with a letter grade — which is inherently shareable. "Here's what a jailbreak of a
real support bot looks like" is native-feeling content, not an ad. DMs reuse the Apollo
segment logic.

**A3. Free mini-scan / sample report lead magnet.**
*Why:* Removes "will this even find anything" doubt before the $47 ask, and gives us an
email + an authorized target to convert. Top of the paid funnel; feeds A1/A2. See §3.

**A4. Developer/AI communities (targeted, non-spammy).**
*Why:* People building chatbots congregate in specific places (r/LLMDevs, r/LocalLLaMA,
Indie Hackers, AI/LLM Discords and Slacks, Hacker News on OWASP-LLM news pegs). The angle is
educational — publish a real teardown of a jailbreak class, link the scanner as the "check
yours" CTA. Communities punish selling and reward teaching.

### Tier B — layer in once A is producing requests

**B1. SEO / content on OWASP-LLM long-tail.**
Buyers search "how to test chatbot for prompt injection," "OWASP LLM top 10 checklist," "is
my AI chatbot secure." Low competition, high intent, compounding. Runs in background from
week 1; not counted on for launch revenue.

**B2. Consultant / agency partnerships (referral).**
Fractional-CISO shops, AI dev agencies, MSPs have the ICP as clients but don't run
LLM-specific testing. Advanced ($197/scan, all 10 OWASP LLM categories, human authorization
review) is the natural referral SKU — one scan per client bot adds up.
Warm, relationship-dependent — a week-4+ play.

**B3. Product Hunt / launch-aggregator moment.**
One-time spike, good for backlinks/social proof, weak for sustained qualified requests in
this niche. Use as a milestone once the funnel converts, not as the launch itself.

### Not now (explicitly deprioritized)

- **Paid ads:** money gate + unproven funnel = premature. Prove organic request→pay first.
- **Broad influencer/sponsorship:** audience mismatch and spend before proof.

---

## 2. Four-week launch calendar

Assumptions: solo/founder-led, no ad spend, all sends/posts are **drafted for Creator
approval** (hard gate). "Ship" = *prepare + queue for approval*, not auto-send.

### Week 0 (pre-flight — may overlap week 1)

- Confirm the scan-request form captures: target URL, authorization attestation, email,
  chosen tier, and a free-text "what does your bot do."
- Stand up the **lead magnet** (sample report; mini-scan later) — §3.
- Build the **3 Apollo segments** (§4), export ~150–300 verified contacts. Apply the
  jurisdiction filter: exclude OFAC countries; flag SG/MY as "manual-review" (still valid
  outreach targets — just longer approval).
- Draft cold-email sequence + LinkedIn DM template (§4) — hold for approval.
- Instrument tracking (§5): request, approval, payment-link click, tier, source.

### Week 1 — "Prove the artifact"

- **Mon:** LinkedIn post #1 — "I scanned a live support chatbot for prompt injection. Here's
  the scorecard." Screenshot of a sanitized A− scorecard. CTA: free sample report.
- **Tue:** Publish the sample-report magnet publicly (link in bio, pinned post).
- **Wed:** Apollo cold-email batch 1 (Segment 1, ~50) — first touch only.
- **Thu:** LinkedIn post #2 — "5 ways attackers jailbreak a support bot" (maps to
  LLM01/06/07/08 + jailbreak). CTA: request a scan.
- **Fri:** 10 targeted LinkedIn DMs (Segment 1 engagers).
- **Ongoing:** publish 1 SEO article (OWASP-LLM checklist) to start compounding.
- **Gate checkpoint:** review every inbound request, run approval; for approved, prepare the
  payment-link email (Creator sends). Note the 48h reminder / 14d auto-close clock.

### Week 2 — "Convert requests to pay"

- **Mon:** cold-email batch 1 follow-up #1 + batch 2 (Segment 2, ~50).
- **Tue:** LinkedIn post #3 — "What a $47 scan found on a real bot" (anonymized evidence).
  Strongest proof post; CTA: request Normal scan.
- **Wed:** 10 more DMs (Segment 2).
- **Thu:** Community post #1 — teardown of one jailbreak class (r/LLMDevs / Indie Hackers),
  scanner as "check yours" CTA. Follow each community's self-promo rules.
- **Fri:** funnel metrics review (§5); kill/boost email vs LinkedIn vs community. First CAC
  read if any paid conversions landed. Chase any approved-unpaid before the 48h reminder.

### Week 3 — "Push Advanced, open partner referrals"

- **Mon:** cold-email batch 2 follow-up + batch 3 (Segment 3 — agencies, ~50).
- **Tue:** LinkedIn post #4 — "Normal or Advanced: which scan do you need?"
  Frame by coverage depth (5 checks vs all 10 OWASP LLM categories across 15 checks).
- **Wed:** direct outreach to 5–10 AI agencies / fractional-CISO shops (Advanced referral).
- **Thu:** community post #2 (different community, different jailbreak class).
- **Fri:** metrics review; adjust copy on the lowest-converting step.

### Week 4 — "Amplify what worked"

- **Mon:** scale the single best channel (more contacts in winning segment, or more of the
  winning post format).
- **Tue:** final follow-up on all cold-email batches (breakup email).
- **Wed:** collect 1–2 testimonials from week 1–3 payers → social-proof asset.
- **Thu:** prep Product Hunt listing (assets, copy, hunter) — schedule post-launch once
  conversion is proven.
- **Fri:** **Month-1 retro** vs §5 KPIs. Decide what graduates to a repeatable playbook and
  whether paid ads are now justified.

---

## 3. Lead-magnet funnel design

Goal: turn a cold visitor into an authorized email + a first paid $47 scan, then into a
repeat/Advanced buyer — without breaking the authorization-first gate.

### 3.1 The magnet (pick one to launch; A is lighter to ship)

**Option A — Sample report (recommended first).**
A downloadable, fully-branded example PDF scorecard for a fictional "support-bot," showing
the A− grade, each check's Pass/REVIEW/PASS status, one worked example of a found issue
(evidence + remediation). Gated by email only. Zero scanning infra, zero authorization risk.
*Purpose:* kills "what do I actually get?"; the artifact sells the $47.

**Option B — Free mini-scan (higher intent, more infra).**
A single-check (LLM01 prompt injection) automated probe against a URL the visitor attests
they own. Returns a one-line Pass/Fail + "run the full 5-check scan for $47." Still routes
through the authorization attestation and jurisdiction gate; mini-scan runs LLM01 only and is
explicitly non-invasive. *Purpose:* live proof on *their* bot. Add in week 2–3 if volume warrants.

### 3.2 Funnel stages and the offer ladder

```
[Ad-free traffic: LinkedIn / cold email / community / SEO]
        │
        ▼
STAGE 1 — LEAD MAGNET  (email captured)
   Sample report download  OR  free LLM01 mini-scan
        │  nurture: "here's what the full scan checks"
        ▼
STAGE 2 — REQUEST  ($0, no charge)
   Scan-request form: target + authorization + tier = Normal ($47)
        │  admin approval gate (~1 business day; SG/MY = manual licensing review)
        ▼
STAGE 3 — PAY  ($47 Normal)
   Approved → emailed payment link → pay → scan runs → PDF emailed
   (reminder at 48h unpaid; auto-close at 14d unpaid)
        │  in-report + follow-up upsell
        ▼
STAGE 4 — UPSELL
   Advanced $197 (all 10 OWASP LLM categories, 15 checks)
   Per-bot expansion (one scan per customer-facing bot in the fleet)
   Repeat scans ("scan after every prompt change")
```

### 3.3 Upsell / expansion logic (grounded in real tier differences)

- **Normal → Advanced:** trigger when the Normal scorecard shows any REVIEW/FAIL, or when the
  bot has tools/actions (excessive-agency surface). Line: "Normal runs 5 checks; Advanced runs
  the full OWASP LLM Top-10 — all 10 categories across 15 checks, 7 probed live, 3 advisory."
  Put it **inside the emailed Normal report**, not just in follow-up.
- **Advanced → fleet coverage:** trigger for multi-bot orgs and regulated buyers. Pitch one
  Advanced scan per customer-facing surface — the support bot, the sales concierge, and the
  in-product assistant each carry their own attack surface and each get their own scorecard.
- **Repeat revenue:** every prompt/system change re-opens the attack surface. Position a scan as
  a per-release check — turns a one-time $47 into recurring behavior despite no subscription SKU.

### 3.4 Nurture (drafts, no auto-send)

- **Magnet → request:** 2–3 touches. (1) deliver magnet + one striking finding; (2) "the 3
  checks most bots fail"; (3) "request your scan — no charge until we confirm you're authorized."
- **Approved-but-unpaid:** the approval email *is* the payment link; the system's 48h reminder
  backstops it. One manual nudge before 14d auto-close if still unpaid.
- **Paid Normal → Advanced:** in-report CTA + one follow-up 5–7 days later referencing their result.

---

## 4. Apollo outreach — segments + templates

> Segments are **definitions to build in Apollo**, not scraped lists. All copy is a **draft for
> Creator approval**; nothing sends from here. Respect anti-spam basics (real identity, physical
> address, easy opt-out, no deception) and the jurisdiction policy (drop OFAC; SG/MY are valid but
> flag as longer-approval).

### 4.1 Segment definitions

**Segment 1 — "Has a customer-facing bot, no security title" (primary).**
- Headcount: 11–200 · Industry: SaaS / software / internet / e-commerce / fintech-lite
- Signal: visible chatbot/AI assistant on site or in-product (Intercom/Drift/custom LLM
  widget), OR job posts mentioning "AI assistant," "chatbot," "LLM," "RAG," "support automation"
- Titles: Founder, CTO, Co-founder, Head of Engineering, VP Eng, Lead Engineer
- **Negative filter:** exclude companies with Security Engineer / AppSec / CISO on staff — that
  exclusion *is* the ICP
- Pull: person, title, company, domain, whether site has a bot

**Segment 2 — "Just shipped an AI feature" (timing signal).**
- Same firmographics as S1
- Signal: last-90-day job post for "AI/ML engineer," "prompt engineer," "conversational AI," OR
  recent funding (new AI budget), OR press/blog announcing an AI assistant launch
- Titles: S1 + Head of Product, PM (AI)
- Angle: most anxious and least covered right after launch

**Segment 3 — "Referral partners" (Advanced channel).**
- AI dev agencies, fractional-CISO / vCISO shops, MSPs, dev consultancies · headcount 2–50
- Titles: Founder, Principal, Practice Lead, Head of Delivery
- Angle: white-label / refer the Advanced ($197/scan) tier for their clients, one scan per bot

### 4.2 Cold email template (Segment 1) — DRAFT

```
Subject: quick question about {{company}}'s support bot

Hi {{first_name}},

Saw {{company}} runs an AI {{bot_type|"support assistant"}} on your site. Quick, honest
question: has anyone tested whether it can be jailbroken?

Most teams shipping a customer-facing bot don't have an AppSec person, so nobody owns
"can an attacker make this thing leak its system prompt or ignore its instructions." That's
literally the OWASP Top-10 for LLM apps — the same failure modes real attackers probe.

We run those checks for you (prompt injection, data leakage, system-prompt leak, jailbreaks)
and send back a Pass/Fail scorecard with evidence and plain-language fixes. First scan is $47,
and there's no charge until we confirm you're authorized to test the target — we review every
request first, on purpose.

Want me to send the request link? Takes 2 minutes, and you'll know before an attacker does.

{{sender_name}}
The Souls of AI · scan.thesoulsofai.com

[physical address] · reply "no thanks" and I won't follow up
```

**Follow-up #1 (day 3–4):**
```
Subject: re: {{company}}'s support bot

{{first_name}} — no worries if this isn't a priority. One thing worth 30 seconds: the most
common thing our scans catch is system-prompt leakage — the bot handing over its hidden
instructions when asked the right way. If {{company}}'s bot has business logic in its prompt,
that's worth knowing. Same offer: $47 first scan, no charge until you're verified. Want the link?
```

**Breakup (day 8–10):**
```
Subject: closing the loop

Last note, {{first_name}} — I'll assume the timing's off. If you ever want a Pass/Fail read on
{{company}}'s bot, the scanner's at scan.thesoulsofai.com and the first scan is $47. Thanks for
reading.
```

### 4.3 LinkedIn DM template — DRAFT

```
Hi {{first_name}} — noticed {{company}} ships an AI {{bot_type}}. I run an OWASP-LLM security
scanner for chatbots (prompt injection, jailbreaks, system-prompt leak, data exfil) and send
back a Pass/Fail scorecard with fixes. Curious — has your bot been tested for jailbreaks yet?
No pitch if it has. If not, happy to send a sample report so you can see what it catches.
```

*If they reply positive:*
```
Great — here's a sample scorecard [magnet link]. When you want the real thing on {{company}}'s
bot, it's a $47 scan and we verify you're authorized to test it before anything runs (keeps it
legal + clean). Want the request link?
```

### 4.4 Segment 3 partner email — DRAFT

```
Subject: LLM security testing for your clients (white-label)

Hi {{first_name}} — {{company}} builds AI for clients who now all ship chatbots. Most of them
have no LLM-specific security testing. We run OWASP-LLM-Top-10 scans (prompt injection,
jailbreaks, data leak, excessive agency) and return a branded Pass/Fail report. Our Advanced
scan ($197/scan) covers all 10 OWASP LLM categories and includes a human authorization review
before anything runs — a clean per-bot add-on you can resell or refer. Open to a quick chat
about referral terms?
```

---

## 5. Measurement & KPI plan

Funnel is request-first, so the two conversion rates that matter most are **visitor→scan-request**
and **approval→pay**. Track every stage; don't average across tiers.

### 5.1 Funnel metrics (the spine)

| Stage | Metric | Definition | Launch target (month 1) |
|---|---|---|---|
| Traffic | Unique visitors | — | baseline (measure, don't target) |
| Magnet | Lead-magnet conversion | emails / visitors | ≥ 8–12% |
| Request | **Scan-request rate** | requests / visitors | ≥ 2–4% |
| Approval | Approval rate | approved / requests | 60–80% (rest fail authz / jurisdiction) |
| **Pay** | **Approval→pay conversion** | paid / approved | ≥ 40–55% |
| Overall | Visitor→paid | paid / visitors | ≥ 0.8–1.5% |
| Expansion | Upsell rate | Advanced / total paid | ≥ 15% |
| Lifecycle | Unpaid decay | % approved that hit 48h reminder / 14d auto-close | watch; high = pricing or trust gap |

### 5.2 Revenue metrics (per tier — never blended)

- Paid scans by tier (Normal $47 / Advanced $197)
- Revenue by tier and **blended AOV** (watch mix — one Advanced ≈ 4 Normals)
- Repeat-scan rate (same customer, 2nd+ scan) — proxy for recurring behavior absent a sub SKU

**Month-1 illustrative target** (adjust after week-1 real data):
- 40–60 requests → ~30–45 approved → ~15–22 paid.
- Mix guess: ~16 Normal ($752) + 5 Advanced ($985) ≈ **$1,700–$1,750**.
- This is a *proof-of-funnel* target. The month-1 win condition is a known, repeatable
  approval→pay rate — not raw revenue.

### 5.3 Channel attribution & CAC

Tag every inbound with source (UTM on links; "how'd you hear" on the request form as backstop).
Per channel: requests, paid, revenue, **CAC**.

- **CAC = (hard costs + valued time) / customers acquired**, per channel.
- Organic channels have ~$0 hard cost — CAC is **time cost**. Value founder time at a nominal
  rate so channels are comparable and the later paid-ads decision has a baseline to beat.
- **CAC targets:** Normal ($47) must stay near-zero CAC — it's a tripwire/lead product,
  effectively break-even, justified by upsell. Margin lives in Advanced; tolerate
  higher CAC there. Graduate a channel to paid spend only at blended **LTV:CAC ≥ 3:1**, where LTV
  includes expected upsell + repeat scans, not just the first $47.

### 5.4 Outreach-channel health

- Email: open, reply, positive-reply, request-generated, unsubscribe/spam (keep spam <0.1%).
- LinkedIn: impressions, profile visits, DM reply rate, requests-generated.
- Community: upvotes/comments, clickthrough, requests-generated (educational-first; don't get banned).

### 5.5 Review cadence

- **Weekly (Fri):** funnel snapshot; kill/boost per §2. Chase approved-unpaid before 48h/14d marks.
- **Month-1 retro:** lock the winning channel, the real approval→pay rate, per-tier CAC. Only then
  decide paid ads and Product Hunt timing.

---

## 6. Hard gates (this plan does not cross them)

- **No auto-send.** Every email/DM/post here is a draft; Creator sends.
- **No auto-pay-link email.** The approval→payment-link step is a gated live outbound action (per
  `payment-links.ts` note + launch block) — human/MFA gate stays on until Creator lifts it.
- **Authorization-first stays sacred.** No scan (including the free mini-scan) runs against a
  target the requester hasn't attested they own/are authorized to test.
- **Jurisdiction policy honored** in targeting and approval: OFAC-sanctioned dropped; SG/MY held
  for manual licensing review.
- **Defensive-use framing only** in all copy — matches llms.txt compliance stance.
