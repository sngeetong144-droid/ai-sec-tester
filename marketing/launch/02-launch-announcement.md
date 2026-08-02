# AI Sec Tester — Launch Content (DRAFT)

> **Status:** DRAFT. No public posting, sending, or account changes. For Creator review.
> **Product:** AI Sec Tester by The Souls of AI — OWASP-LLM Top-10 security scanner for chatbots / AI agents.
> **Live:** https://scan.thesoulsofai.com
> **Voice:** calm, credible, plainspoken, evidence-first. No AI-hype. Authorization framing stays central.
> **Grounding rule:** every claim below traces to a verified safe-claim. Anything unproven is marked `[NEEDS: ...]`. Do not remove a `[NEEDS:]` tag by inventing a proof point.

---

## 1. Launch Announcement / Blog Post

**Working title:** *We built a security scanner that refuses to run until you prove the bot is yours*

**Alt titles (pick one):**
- *Your chatbot will hand its system prompt to anyone who asks nicely. Now you can check.*
- *AI Sec Tester is live: OWASP-LLM Top-10 checks for the bot you shipped*
- *The first-pass security scan for customer-facing chatbots — authorization required*

**Suggested slug:** `/blog/ai-sec-tester-launch`
**Meta description (155 char):** A security scanner for customer-facing chatbots. Real OWASP-LLM probes, an A–F report with evidence, and an authorization gate before any scan runs. Live now.

---

If you shipped a customer-facing chatbot this year, you shipped an attack surface most of your existing security tooling can't see.

A generic web scanner — the Burp/ZAP/Nessus class of tool — will test your endpoints for SQL injection and missing headers and tell you the app is fine. It has no concept of a system prompt. It will happily pass a chatbot that leaks its entire instruction set to anyone who asks politely, because "leaking the instructions when asked" isn't a category it knows how to test.

The other option people reach for is asking an LLM to jailbreak their own bot. That gets you an anecdote, not evidence. It's unstructured, undocumented, and un-repeatable. You can't show it to a customer, an investor, or an auditor, and you can't prove what you did or didn't test.

**AI Sec Tester** is the thing in between. It's live today at [scan.thesoulsofai.com](https://scan.thesoulsofai.com).

### What it actually checks

The scan runs real interactive probes against the target chatbot — it converses with the bot, tries the failure modes that are specific to LLM applications, and an LLM judge grades each response. It's aligned to the OWASP LLM Top-10, and the checks named on the live product include:

- **LLM01 — Prompt injection.** Can an instruction hidden in user input override the bot's own rules?
- **LLM05 — Insecure output handling.** Does the bot emit unsafe content downstream systems will trust?
- **LLM02 — Sensitive information disclosure.** Will it reveal data it shouldn't — keys, internal context, other users' information?
- **LLM07 — System-prompt leakage.** Will it hand over its own instructions?
- **LLM06 — Excessive agency.** If it's wired to tools or a backend, can it be talked into using them in ways you didn't intend?
- Plus common **jailbreak and guardrail-bypass** patterns.

This is not a static payload list matched against a regex. The probes are interactive and the grading is done by a judge model reading the actual exchange.

One thing to be precise about, because tier copy elsewhere gets this wrong: the **$47 Normal** tier runs five checks. **All ten OWASP LLM categories start at Advanced ($197)** — fifteen checks, seven probed live and three covered as advisory findings. Don't sell the full Top-10 at $47.

### What you get back

A Pass/Fail scorecard with a grade — A–F, 0–100 — and a branded PDF report. Every finding carries the evidence behind it: the probe that was sent, the bot's response, and plain-language remediation a developer can act on without a security background.

It's a document you can hand to a teammate, a customer, or an auditor. That's the point.

### Why you have to request a scan instead of just pointing it at a URL

This is the part we're most deliberate about.

Scanning a system you can't prove you're authorized to test is illegal, and a self-serve "point it at any URL" scanner is a liability engine — for the person running it and for whoever's on the other end. So AI Sec Tester doesn't work that way.

You request a scan. Before anything runs, the request goes through a due-diligence gate: you confirm you own or are authorized to test the target, and the system resolves the requester and target jurisdiction, checks against sanctions, and holds anything that needs a licensing review for a human to look at. Only after that clears do you get an emailed payment link. No charge until it's approved.

We treat that gate as a feature, not fine print. The same discipline that keeps the scan legal is what makes the result something you can stand behind.

### What it costs

Two tiers, one-time, per scan. Both include automated risk triage and a human authorization review before anything runs.

- **Normal — $47.** Five checks, the Pass/Fail scorecard, and the PDF report. The "did we do the obvious things right?" pass — not the full Top-10.
- **Advanced — $197.** All ten OWASP LLM categories across fifteen checks — seven probed live against your bot, three delivered as advisory findings — with deeper probing per category. Full coverage is the paid step up from Normal; that is the whole delta.

That's the entire menu. No third tier, no seat pricing, no subscription.

### Where this fits

AI Sec Tester is a fast first-pass filter, not a replacement for a full red-team engagement. It sits in the gap between "we did nothing" and a five-figure specialist engagement: narrower, faster, and something you can run before or while your bot is in production. If your last pentest report never mentioned prompt injection or system-prompt leakage — most generic AppSec reports don't — this is the layer that covers what it missed.

Find out before an attacker does. [Request a scan.](https://scan.thesoulsofai.com)

*AI Sec Tester is built by [The Souls of AI](https://thesoulsofai.com).*

`[NEEDS: real customer testimonial / case study / scan-count metric — none exist yet; do not add social proof until it does]`

---

## 2. Product-Hunt-Style Tagline + First Comment

### Taglines (pick one)

**Primary:**
> **AI Sec Tester — OWASP-LLM security scans for the chatbot you shipped.**

**Alternates:**
- The security scanner that won't run until you prove the bot is yours.
- Prompt-injection and jailbreak testing for customer-facing AI, with an A–F report.
- Real OWASP-LLM probes for your chatbot. Evidence per finding. Authorization required.

### Maker's first comment

Hi Product Hunt 👋

I build under **The Souls of AI**, and AI Sec Tester came out of a simple gap: we kept shipping chatbots and had no honest way to answer "is this thing safe to put in front of customers?"

Generic web scanners don't know what a system prompt is — they'll pass a bot that leaks its whole instruction set to anyone polite about it. And ad-hoc "ask ChatGPT to jailbreak it" testing gives you a story, not a document you can show anyone.

So AI Sec Tester does three things:

1. **Real interactive probes, not a simulation.** It actually converses with your bot across the OWASP-LLM Top-10 failure modes — prompt injection, jailbreak bypass, system-prompt leakage (LLM07), sensitive-data exposure (LLM02), excessive agency (LLM06) — and an LLM judge grades each response.
2. **An authorization gate before any scan runs.** You request a scan; we check ownership/authorization plus jurisdiction and sanctions before anything fires. You can only scan bots you own or are authorized to test. This is enforced server-side, not a checkbox you tick and forget.
3. **A hand-off-able result.** An A–F / 0–100 scorecard and a PDF with the evidence behind each finding and plain-language remediation.

It's live now: **scan.thesoulsofai.com**. One-time pricing, two tiers — $47 Normal (five checks) and $197 Advanced (all ten OWASP LLM categories, fifteen checks). Both include automated risk triage and a human review before the scan runs.

It's a fast first pass, not a replacement for a full red-team. Honest about that.

Happy to answer anything — especially skeptical questions about the authorization model. Ask away.

`[NEEDS: confirm whether a live PH launch date/hunter is planned — this is draft copy, not a scheduled launch]`

---

## 3. Press Blurb

**Short (≈50 words):**

> The Souls of AI has launched **AI Sec Tester**, a security scanner for customer-facing chatbots and AI agents. It runs real OWASP-LLM Top-10 probes — prompt injection, jailbreak, system-prompt leakage — graded by an LLM judge, and returns an A–F report with evidence and remediation. Every scan requires verified authorization. Live at scan.thesoulsofai.com.

**Standard (≈90 words):**

> **The Souls of AI launches AI Sec Tester, an authorization-first security scanner for AI chatbots.**
>
> AI Sec Tester probes customer-facing chatbots and AI agents for the failure modes unique to large language models — prompt injection, jailbreak bypass, system-prompt leakage, sensitive-data exposure, and excessive tool agency — using real interactive probes graded by an LLM judge rather than a static payload list. Findings are delivered as an A–F / 0–100 scorecard and a PDF report with evidence and plain-language remediation. No scan runs until a due-diligence gate confirms the requester is authorized to test the target. One-time pricing, two tiers, from $47. Available now at scan.thesoulsofai.com.

**Boilerplate (for "About"):**

> The Souls of AI builds practical AI systems for people shipping real products. AI Sec Tester is its security-scanning product for customer-facing chatbots and agents. More at thesoulsofai.com.

`[NEEDS: a named spokesperson / founder quote if the blurb goes to any outlet — do not fabricate one]`

---

## 4. Launch-Day Asset Checklist

Ordered by dependency. Nothing here is scheduled or sent — this is a readiness list for Creator approval.

### A. Blocking prerequisites (verify BEFORE any public launch)

- [ ] `[NEEDS: confirm scan_requests migrations 0004/0006 are applied in production]` — route code says LOCAL/not-applied. If unconfirmed, the request form may not persist. **Do not launch until the request-to-DB path is verified live.**
- [ ] `[NEEDS: prove one real end-to-end scan runs and emails a graded PDF]` — no evidence a live scan→PDF→email has completed. Blocks any "you'll get a report" promise.
- [ ] `[NEEDS: confirm approval→payment-link email flow]` — payment-links.ts notes outbound send is a gated live action behind a launch-block (T-07), not auto-send. Confirm the human/MFA gate before implying "approved requests get a payment link."
- [ ] Resend domain verified — **confirmed done** per stack notes. Re-check deliverability on the actual sending address.
- [ ] Live smoke test: submit a real request through scan.thesoulsofai.com, confirm it lands, confirm the operator sees it in the admin flow.

### B. Copy assets (this file + siblings)

- [ ] Blog post — approved and published to `/blog/ai-sec-tester-launch` `[NEEDS: confirm blog surface exists / is buildable]`
- [ ] PH tagline + maker's first comment — approved, PH launch date decided or shelved
- [ ] Press blurb — approved; recipient list decided (or held)
- [ ] Landing copy consistency check — pricing/tiers on the live landing match this announcement (two tiers: $47 Normal / $197 Advanced, nothing else)

### C. Visual assets

- [ ] OG / social share image (1200×630) — brand-consistent, no fabricated scorecard
- [ ] Scorecard visual — **must be captioned as an illustrative example, not a real scan result.** `[NEEDS: the on-landing scorecard rows are hardcoded (PASS/PASS/REVIEW/PASS/PASS, grade A-) — any reuse is a category demo, not a live break]`
- [ ] Sample PDF report — `[NEEDS: build a real or clearly-labeled example report; the sample-report lead magnet does not exist yet]`
- [ ] Short demo clip — `[NEEDS: real product screen recordings; build locally with Remotion+ffmpeg per MTCOOM, no paid video tool]`

### D. Distribution surfaces (draft, do not send/post)

- [ ] LinkedIn / X launch posts — draft exists in `launch-content.md`; keep authorization framing central
- [ ] Email announcement — `[NEEDS: a real list — the 5-email nurture sequence presumes subscribers who don't exist yet]`
- [ ] Communities / relevant threads — draft only; respect each community's self-promo rules

### E. Tracking + follow-through

- [ ] UTM / analytics instrumentation — `[NEEDS: not built; funnel plan assumes it]`
- [ ] Operator ready to review inbound requests same day (authorization due-diligence is manual)
- [ ] 48h payment reminder / 14d auto-close lifecycle — `[NEEDS: confirm migrations + cron are live before promising this behavior]`

### F. Governance gates (require Creator approval — do not self-authorize)

- [ ] Any public posting or press send
- [ ] Any outbound email to prospects
- [ ] Turning on the approval→payment-link send flow (money + outbound = hard gate)
- [ ] Any account/billing/FastPayDirect change

---

## Grounding Notes (for the team, not for publication)

- **Pricing is fixed and verified:** two tiers, one-time, both billed per scan — $47 Normal, $197 Advanced. There is no third tier; anything quoting a higher price is retired copy.
- **Tier scope is fixed and verified:** Normal $47 = **5 checks**; Advanced $197 = **all 10 OWASP LLM categories** (7 probed live, 3 advisory) across **15 checks** — this is the paid differentiator, never give it away at $47. Both tiers include automated risk triage and a human authorization review before the scan runs.
- **No free re-scan exists in any tier.** There is no customer-triggered re-scan and no automated re-scan invite (see `marketing/automation/02-fulfillment-ops-automation.md`). A re-scan is simply a new paid scan; never promise one as an entitlement.
- **Admin-operated product.** Public page is a request-a-scan intake form. No customer login, no self-serve checkout, no customer-triggered scan. Never write a verb that implies the customer runs the product.
- **Authorization gate is real code,** not marketing: server-side consent re-check, jurisdiction resolution, OFAC auto-reject, SG/MY manual hold. Lead with it.
- **Do NOT claim speed** ("results in seconds", "report in seconds"). Runtime is unproven live. Promise the deliverable, not a measured time.
- **Do NOT claim social proof.** Zero real testimonials/metrics/logos exist. Use `[NEEDS:]` placeholders only.
- **CORRECTION:** the "stale $10 llms.txt pricing" action item from older drafts is DONE — live llms.txt already carries correct pricing. Ignore it.
- **Positioning line to hold:** fast first-pass filter between "did nothing" and a five-figure red-team. Never imply it replaces a full red-team or claims 100% coverage.
