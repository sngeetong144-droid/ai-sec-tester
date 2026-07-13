# AI Sec Tester — Positioning & Messaging (Launch)

**Status:** DRAFT. Nothing here is posted, sent, or wired live. Any `[NEEDS: ...]` marker is a real gap, not a claim.
**Product:** OWASP-LLM Top-10 security scanner for chatbots / AI agents. Live at https://scan.thesoulsofai.com.
**Parent brand:** The Souls of AI (thesoulsofai.com).
**Grounded in:** app/_components/landing.tsx, app/api/scan-request/route.ts, lib/payment-links.ts, public/llms.txt.
**Upgrades:** the prior `marketing/positioning.md`. Do not run both — this is the launch source of truth for messaging.

> **Changelog vs. prior draft**
> - Removed the "llms.txt shows stale $10 pricing — fix as P0" note. Live llms.txt already carries $47/$197/$497 + the compliance block. No longer an action item.
> - Killed "results in seconds" / "report in seconds" as a settled claim everywhere. Scan runtime is unverified live. Copy now promises the *deliverable*, not a measured speed. See Do/Don't §8.
> - Added value props **by buyer segment** (prior draft had personas but no segment-specific benefit ladder).
> - Added an explicit **message hierarchy** (§5) so downstream copy inherits one spine instead of re-deriving it.
> - Promoted the three differentiators into a single named **narrative** (§6): authorization-first → real probes → human-reviewed.
> - Added a **messaging Do/Don't** (§8) tied to the brand voice.

---

## 1. One-liner (pick one per surface; do not mix registers on one page)

Primary (use as default, hero + meta description):
> **A security scorecard for your AI chatbot — the prompt-injection and data-leak checks a normal pentest never runs.**

Alternates, by intent:
- Plain / benefit-first: *"Find out if your chatbot leaks its system prompt — before someone else does."*
- Category-anchored: *"OWASP LLM Top-10 checks for chatbots. Pass/Fail, with the evidence."*
- Trust-through-restraint (leads with the differentiator): *"The chatbot scanner that won't run until you prove you're allowed to test the target."*

Retired: *"...in seconds"* variants. Speed is unverified (`[NEEDS: real end-to-end scan→PDF→email runtime]`).

---

## 2. Elevator pitch (30 seconds)

AI Sec Tester probes a live chatbot for the failure modes that only LLM apps have — prompt injection, jailbreak bypass, system-prompt leakage, sensitive-data exposure, and excessive tool access — using real interactive probes graded by an LLM judge, not a static payload list or a simulation. You get a Pass/Fail scorecard with an A–F / 0–100 grade and a PDF report: evidence per finding and plain-language remediation a developer can act on without a security background. It won't scan anything until you've proven you own or are authorized to test it — the authorization check (ownership, geo, sanctions, licensing) runs before any probe fires. Starts at $47. Request a scan; you're not charged until it's approved.

Shorter (15s, for cold outreach / bio):
> AI Sec Tester runs OWASP LLM Top-10 probes against a chatbot you own or are authorized to test, and hands back a Pass/Fail scorecard with evidence and fixes. Authorization-checked before it runs. From $47.

---

## 3. Category & frame

**Category:** point-in-time AI chatbot security scanner, OWASP LLM Top-10 aligned, request-then-scan.

**What it is not** (say this plainly — it prevents the wrong comparison):
- Not a WAF or runtime guardrail.
- Not continuous monitoring — it's a scan you request, not an always-on sensor.
- Not a full LLM red-team. It's the fast first-pass *filter* between "did nothing" and a five-figure engagement.
- Not self-serve SaaS. There is no checkout button and no customer login. You request; a human reviews authorization; approved requests get an emailed payment link.

**The frame to plant:** you already run some kind of AppSec on your app. None of it knows what a system prompt is. This is the one check aimed at the layer your existing tooling is blind to.

---

## 4. Value props by buyer segment

Same product, three different "why now." Lead with the row that matches the reader.

### Segment A — Founder / indie SaaS builder
- **Their situation:** shipped a support or sales bot fast on top of an LLM API. No security background. A customer or investor is about to ask "is this safe?"
- **Core value prop:** *Get a real, showable answer today — not a vibe.* A scorecard and PDF you can forward, instead of "we think it's fine."
- **Proof that lands:** evidence per finding; a document, not a hunch; from $47 — cheaper than an hour of a consultant.
- **Objection to preempt:** "I could just ask ChatGPT to jailbreak it." → You'll get an anecdote you can't show anyone. See §7.1.

### Segment B — Product / eng lead at a small–mid company
- **Their situation:** owns the chatbot, knows normal AppSec, not prompt-injection specifics. Needs something to hand a developer, not a 40-page consultant deck.
- **Core value prop:** *Findings your developer can act on this sprint.* Named OWASP LLM checks, reproduction per finding, remediation in plain language.
- **Proof that lands:** LLM01/LLM06/LLM07/LLM08 by name; Pass/Fail spine; Advanced = full Top-10, not a sample.
- **Objection to preempt:** "We already have a pentest firm." → Ask if their last report named prompt injection. Most don't test the LLM layer at all. See §7.3.

### Segment C — Security engineer / consultant
- **Their situation:** already runs assessments. Wants a fast, structured, documentable first pass before or instead of manual LLM review.
- **Core value prop:** *A repeatable, auditable OWASP-LLM battery you can stand behind.* Structured probes + LLM-judge grading + evidence capture — not ad-hoc prompting.
- **Proof that lands:** real interactive probes (not static payloads); evidence-per-finding format; authorization gate that makes the output defensible.
- **Objection to preempt:** "I can do this by hand." → You can, but you can't repeat it, document it, or show it to a client. The value is the structure and the receipt.

### Cross-segment (true for all three)
Shipping a customer-facing chatbot means shipping an unmonitored, tool-connected surface that answers anyone. The one question this answers: *does it resist prompt injection well enough to be in production?* — with a document that proves you asked.

---

## 5. Message hierarchy

Downstream copy (landing, emails, ads, social, SEO) inherits this spine. Level 1 is always present; deeper levels are added as space and audience allow.

**Level 1 — The promise (never omitted):**
> A Pass/Fail security scorecard for your AI chatbot, covering the OWASP LLM Top-10 failure modes normal security testing misses.

**Level 2 — The three reasons to trust it** (this is the §6 narrative, compressed):
1. **Authorization-first** — it won't run until you've proven you can test the target.
2. **Real probes, judged** — it actually converses with the bot; an LLM judge grades each response. Not a simulation.
3. **Human-reviewed** — at Enterprise, a person reviews before the scan runs, and you get a free re-scan to verify the fix.

**Level 3 — The deliverable:**
> A–F / 0–100 grade + PDF report: evidence per finding, plain-language remediation. Hand it to a developer, a customer, or an auditor.
> *(The free 30-day re-scan is an Enterprise-tier entitlement. Do not carry it into Level 3 — it is not part of the base deliverable.)*

**Level 4 — The coverage (name the checks):**
> LLM01 prompt injection · LLM06 sensitive-info disclosure · LLM07 system-prompt leakage · LLM08 excessive agency · insecure output handling · common jailbreak / guardrail-bypass patterns.

**Level 5 — The mechanics:**
> Request a scan (no checkout, no login). We check ownership/authorization + geo, sanctions, and licensing. Approved requests get an emailed payment link. Pay → scan runs → report emailed. From $47 / $197 / $497.

**Rule:** never let Level 4 or 5 outrank Level 1 on a page. Coverage lists and pricing tables are proof, not the pitch.

---

## 6. The core narrative — "Trust through restraint"

This is the throughline that makes AI Sec Tester different from both piles of "AI security" tooling. Use it as the About / origin / long-form spine. Three moves, in order:

**1. It refuses to run until you're authorized.**
Most "point it at any URL" scanners are a liability engine — for you and for whoever's on the other end. Scanning a system you can't prove you're allowed to test is illegal. So AI Sec Tester inverts the default: you request, and nothing happens until a due-diligence gate clears — ownership/authorization, requester and target country, sanctions screening, and licensing. This is real, not copy: the request route records the request, takes **no payment and launches no scan**, re-checks both consent boxes server-side, resolves both countries server-side, auto-rejects sanctioned/comprehensive-embargo targets, and *holds* (never auto-rejects) jurisdictions that need manual licensing review. The gate is the product's first feature, not its fine print.

**2. It runs real probes, and a judge grades them.**
A generic DAST scanner (Burp/ZAP/Nessus-class) tests SQLi and headers and has no concept of a system prompt — it will pass a chatbot that hands over its entire instruction set to anyone polite about it. AI Sec Tester actually converses with the target across the OWASP LLM Top-10 failure modes, and an LLM judge grades each response, with the probe and the bot's reply captured per finding. Not a static payload list. Not "we asked an LLM to try." A structured battery with the evidence attached.

**3. A human closes the loop.**
At Enterprise, identity is verified and a person reviews before the scan runs — and after you fix what it found, one free 30-day re-scan verifies the fix instead of just naming the problem. Finding → fix → confirmed.

**The payoff line:** *the same discipline that makes it legal is what makes the result credible.* A scorecard you can hand to a customer or an auditor, precisely because of how carefully it was allowed to run.

**Positioning boundary to keep repeating:** narrower and faster than a red-team, not a replacement for one. It's the filter, not the final word.

---

## 7. Objections + rebuttals (sharpened; keep these three lead, the long list below them)

### 7.1 "Can't I just ask ChatGPT to jailbreak-test my own bot for free?"
You can — and you'll get an anecdote, not evidence. Ad-hoc prompts are unstructured, undocumented, and un-repeatable; you can't show them to a customer, investor, or auditor, and you can't prove what you did or didn't test. AI Sec Tester runs the same OWASP LLM failure modes as a structured battery of real interactive probes, each graded by an LLM judge, with the probe and the bot's response captured per finding. The output is a document, not a hunch.

### 7.2 "Why request-and-wait instead of pay-and-run?"
Because scanning a system you can't prove you're authorized to test is illegal, and a self-serve "point it anywhere" scanner is a liability engine for everyone. The review (authorization + geo/sanctions/licensing, target: within one business day — `[NEEDS: confirm one-business-day review SLA is real, not aspirational]`) protects you from that liability and third parties from unauthorized testing. It's not friction we tolerate — it's why the result is something you can stand behind. No charge until it's approved.

### 7.3 "It's just a support bot / we already have a pentest firm."
Ask whether that firm's last report named prompt injection, system-prompt leakage, or jailbreak resistance — most generic AppSec vendors don't test LLM-specific failure modes at all. And support bots are the *highest-value* target precisely because they're customer-facing, unmonitored, and usually wired to a knowledge base or backend tools — exactly where secrets (LLM06) and excessive tool access (LLM08) leak. This is a narrow, fast complement to your existing security, not a replacement.

**Additional objections (secondary):**
- **"How do I know it won't break production?"** — Probes are non-invasive by design, and nothing runs until authorization clears. `[NEEDS: confirm non-invasive probe methodology is documented for the report/FAQ]`
- **"$497 for one scan is steep."** — Enterprise includes identity verification, human review before the scan, the full report, and one free 30-day re-scan. The re-scan alone closes the finding-to-fix loop one-shot scanners don't.
- **"We can't act on security findings."** — The report is plain-language, evidence per finding, remediation written for a developer, not a security specialist.
- **"What if it finds nothing — wasted money?"** — A clean, OWASP-LLM-aligned Pass/Fail scorecard *is* the deliverable: documented due diligence you can point to, instead of a private "we didn't check."

---

## 8. Messaging Do / Don't

### Do
- Lead with the concrete failure mode: *"your bot will hand over its system prompt to anyone who asks nicely."*
- Name the OWASP LLM checks (LLM01/06/07/08, prompt injection, system-prompt leakage, excessive agency).
- Use Pass/Fail and A–F / 0–100 as the spine of every deliverable claim.
- Treat the authorization gate as a feature you're proud of — put it forward, never bury it.
- Show evidence-per-finding, not adjectives. "Here's the probe and the bot's reply" beats "comprehensive."
- Write short declarative sentences to a developer who is not a security specialist.
- Promise the *deliverable* (scorecard + PDF), not a speed. The re-scan is Enterprise-only — it belongs in Enterprise-tier copy, nowhere else.
- Mark any proof point that doesn't exist yet as `[NEEDS: ...]`. Never fabricate.

### Don't
- No AI-hype words: revolutionary, next-gen, AI-powered, unhackable, military-grade, bulletproof.
- Don't imply 100% coverage or that a scan replaces a full red-team.
- Don't use fear porn or countdown/scarcity urgency. State the risk plainly, then show the receipt.
- Don't claim measured speed ("in seconds," "instant report") — unverified. `[NEEDS: real runtime]`
- Don't fabricate metrics, logos, testimonials, "X bots tested," or customer quotes. None exist yet. `[NEEDS: any real social proof]`
- Don't sound like a generic DAST vendor or a mystical "AI oracle."
- Don't bury or apologize for the authorization framing — it's central, not a disclaimer.
- Never imply scanning bots you don't own or aren't authorized to test.

---

## 9. Safe claims / do-not-claim (grounding guardrail for all downstream writers)

**Safe to state as fact:**
- Live product at scan.thesoulsofai.com; request-first, no self-serve checkout, no customer login (public site).
- Pricing: $47 Normal / $197 Advanced / $497 Enterprise, one-time (Advanced billed per scan, Enterprise per chatbot).
- Tier scope, per the live landing (landing.tsx:74/92/111): Normal $47 = **5 OWASP LLM checks** + scorecard + PDF. Advanced $197 = **full OWASP LLM Top-10 coverage** — the paid differentiator. Enterprise $497 = full report + **1 free re-scan after fixes**.
- Coverage named on the live landing: LLM01, LLM06, LLM07, LLM08, insecure output handling, jailbreak/guardrail-bypass patterns.
- Deliverable: Pass/Fail scorecard + grade + branded PDF with evidence per finding and plain-language remediation.
- Authorization gate is enforced server-side (records request, no payment/scan, re-checks consent, resolves countries, auto-rejects sanctioned targets, holds SG/MY for manual review).
- Enterprise: identity verification, human review before the scan, one free 30-day re-scan.
- llms.txt is live and current (correct pricing + compliance block).

**Do NOT claim (false as written — these are corrections, not gaps):**
- **Never promise the free 30-day re-scan outside Enterprise-tier copy.** It is **Enterprise-only** per `app/_components/landing.tsx:111` ("Full report + 1 free re-scan after fixes"). It is not included at $47 or $197. It was previously promised unconditionally in the elevator pitch and the message hierarchy — that is corrected; do not reintroduce it.
- **Never describe the re-scan as something the customer triggers, books, or runs.** The **30-day re-scan invite flow is NOT BUILT** (see `marketing/automation/02-fulfillment-ops-automation.md`). There is no invite email, no re-scan link, no self-serve re-scan. The only true mechanism: the customer replies with their re-scan reference and an operator queues it.
- **Never sell full OWASP LLM Top-10 coverage at $47.** Normal ($47) = **five core OWASP-LLM checks** (`landing.tsx:74`). Full Top-10 coverage **starts at Advanced ($197)** (`landing.tsx:92`) — it is the paid differentiator, not a freebie.
- **Never use verbs that imply the customer operates the product.** It is **admin-operated**: the public page is a request-a-scan intake form. No customer login, no self-serve checkout, no customer-triggered scan. Flow: intake → admin triage → approve → customer pays → admin activates → scan → report emailed. Copy says *request*, *reply*, *activate by paying* — never *run it*, *launch it*, *log in*, or *click here to scan*.

**Do NOT claim until verified (`[NEEDS]`):**
- `[NEEDS: scan_requests migrations applied in prod]` — route code comments say local/not-yet-applied. Don't promise "we received your request" reliability until confirmed.
- `[NEEDS: real end-to-end scan → graded PDF → email has completed]` — no evidence yet. This blocks all speed claims.
- `[NEEDS: approval → payment-link email is still human/MFA-gated, not auto-send]` — by design, per launch-block; confirm before describing as an automated flow.
- `[NEEDS: 48h reminder / 14d auto-close lifecycle + cron live]`.
- `[NEEDS: Enterprise token-gated report page live]`.
- `[NEEDS: any customer testimonial, case study, logo, or metric]` — zero exist. Use placeholder structures only.
- `[NEEDS: confirm on-landing scorecard is a static mock]` — landing rows are hardcoded; any visual reusing it must be captioned "illustrative example," not a real scan result.

---

## 10. Voice reference (one line)

A good security engineer explaining a real finding to a founder: calm, credible, plainspoken, evidence-first, technically precise, quietly confident, human. State the risk plainly, then show the receipt. Anti-hype, never mystical, never fear-selling.
