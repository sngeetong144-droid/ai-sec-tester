# AI Sec Tester — Positioning & Messaging

Grounded in: app/_components/landing.tsx, lib/payment-links.ts, public/llms.txt (pricing corrected to live values — llms.txt is stale, code is source of truth).

## 1. ICP & Personas

**Category:** Point-in-time AI/LLM security scanner (OWASP LLM Top-10 aligned), request-then-scan model — not a monitoring platform, not a general pentest firm.

**ICP:** Small-to-mid teams that shipped a customer-facing chatbot/AI assistant and have no dedicated AppSec function testing it for LLM-specific failure modes.

**Personas:**
- **Founder/indie SaaS builder** — shipped a support or sales bot fast (often on top of an LLM API), no security background, needs a pass/fail answer before a customer or investor asks "is this safe?"
- **Product/eng lead at a small-mid company** — owns the chatbot, knows regular AppSec but not prompt-injection specifics, needs evidence to hand to a developer, not a 40-page consultant report
- **Security engineer/consultant** — already runs defensive assessments, wants a fast automated first pass (OWASP LLM01/02/06/07/08 + jailbreak) before or instead of manual review, values the evidence-per-finding format

## 2. Core Value Prop

One sentence: AI Sec Tester runs automated OWASP LLM Top-10 checks against a live chatbot and returns a Pass/Fail scorecard with evidence and remediation steps, so a non-security team can find and fix its bot's prompt-injection and data-leak risks before an attacker does.

## 3. Category

"AI chatbot security scanner" — sits between doing nothing and hiring a full LLM red-team engagement. Not a WAF, not a runtime guardrail product, not a continuous monitoring SaaS (current product is scan-on-request, not always-on).

## 4. Competitive Angle vs Generic Pentest/DAST Tools

- **Generic DAST/web scanners** (Burp, ZAP, Nessus-class) test HTTP/app-layer vulnerabilities — SQLi, XSS, headers. They have no concept of a system prompt, a jailbreak, or "did the model leak its instructions." They will pass a chatbot that leaks your entire prompt to anyone who asks nicely.
- **Manual LLM red-team engagements** are accurate but slow and priced for enterprise budgets (five figures, weeks of lead time). A founder shipping this quarter can't wait on that.
- **AI Sec Tester's angle:** OWASP LLM Top-10-aligned checks specifically built for the failure modes unique to LLM apps (prompt injection, system prompt leakage, excessive agency, jailbreak bypass) — automated, non-invasive, no security background required to read the report, and gated by a human authorization review on every scan. It is a first-pass filter, explicitly positioned as narrower and faster than a full red-team, and not a replacement for one.

## 5. Pricing Narrative (live pricing: two tiers, $47 / $197 one-time — request-first, no self-serve checkout)

Both tiers route through the same scan-request form; every request gets automated risk triage and a human authorization review confirming the requester can test the target, before any payment link is issued or any probe fires. No charge until approved.

- **Normal — $47/scan:** "Get a real answer today." 5 OWASP LLM checks, Pass/Fail scorecard, branded PDF report, evidence + remediation per finding. The entry point for anyone who just wants to know where they stand — cheaper than one hour of a security consultant's time.
- **Advanced — $197/scan (most popular):** "The full Top-10, not a sample." Everything in Normal plus all 10 OWASP LLM categories — 7 probed live against the bot, 3 assessed as advisory — across 15 checks, with deeper probing per category. The default for a team actually shipping this bot to real customers and wanting the complete picture rather than a partial one.

Narrative arc across the two tiers: Normal answers "is there a problem," Advanced answers "where exactly, across the whole Top-10, and how deep." The choice maps to how much the team has riding on the answer being right. There is no third tier and nothing to upsell to — the human authorization review is standard on both, not a premium add-on.

## 6. Top 8 Objections + Rebuttals

1. **"We already have a pentest firm / security vendor."** — Ask if that vendor's last report mentioned prompt injection, system prompt leakage, or jailbreak resistance by name. Most generic AppSec vendors don't test for LLM-specific failure modes; this is a narrow, fast complement, not a replacement.
2. **"Our chatbot is just customer support, not high-risk."** — Support bots are the most common target because they're customer-facing, unmonitored, and often connected to backend tools or knowledge bases — the OWASP LLM02/LLM06 checks exist because "just support" bots are exactly where secrets and excessive tool access leak.
3. **"How do I know this won't break our production bot?"** — Checks are explicitly non-invasive, aligned to OWASP LLM Top-10 probing methodology, and every scan requires authorization confirmation before it runs against the target.
4. **"$197 for Advanced seems steep for a one-time scan."** — Advanced covers all 10 OWASP LLM categories (7 probed live, 3 advisory) across 15 checks versus 5 at $47, plus automated risk triage and a human authorization review before anything runs against the target. That is still a fraction of a day of a consultant's time, and orders of magnitude under a manual LLM red-team engagement.
5. **"Why do I have to request a scan instead of just paying and running it?"** — Scanning a system without proof of ownership/authorization is illegal; the review step (usually within one business day) protects the customer from liability and protects third parties from unauthorized testing.
6. **"We don't have security expertise to act on the results."** — The report is a plain-language Pass/Fail scorecard with evidence per finding and remediation guidance meant to be handed directly to a developer — no security background required to read or act on it.
7. **"Can't I just ask ChatGPT/an LLM to jailbreak-test my own bot for free?"** — Ad hoc manual prompts are unstructured and undocumented; this runs OWASP LLM Top-10-aligned checks with evidence captured per finding, in a report you can show a customer, investor, or auditor.
8. **"What if the scan finds nothing — did we waste the money?"** — A clean Pass/Fail scorecard aligned to OWASP LLM Top-10 is itself the deliverable: documented proof of due diligence you can point to, not just a private "we didn't check."

## 7. One-liner / Elevator / Tagline Options

**One-liners:**
- "Find out if your chatbot is easy to jailbreak — before an attacker does."
- "OWASP LLM Top-10 checks for your chatbot, in seconds."
- "A Pass/Fail security scorecard for AI chatbots."

**Elevator pitch:**
AI Sec Tester runs automated, OWASP LLM Top-10-aligned checks — prompt injection, system prompt leakage, sensitive data disclosure, excessive agency, jailbreak bypass — against a chatbot you own or are authorized to test. You get a Pass/Fail scorecard with evidence per finding and plain-language remediation guidance, so you can fix real risks before a customer or attacker finds them for you. No security background required, results in seconds, starting at $47 per scan.

**Tagline options:**
- "Know your chatbot's risks before attackers do."
- "Security scorecards for AI chatbots."
- "Test it before they do."

## Notes / open questions for review
- Pricing is two tiers only — Normal $47 and Advanced $197. The $497 Enterprise tier was retired on 2026-08-02 (ruling R-15) and removed from the product; do not reintroduce it, a three-tier table, or an Enterprise upsell in any downstream copy. The `/enterprise` URL is an ownership-verification funnel, not a price tier — keep the link, never call it a tier.
- Any pricing surface (llms.txt, payment links, decks) must be checked against lib/payment-links.ts and show the two live tiers only.
- No real customer testimonials/case studies exist yet — social-proof section for any funnel copy needs a placeholder structure, not fabricated quotes or stats (hard ban on hollow social proof applies).
- "Results in seconds" and "usually within one business day" (for request review) are two different clocks in the actual flow (scan runtime vs. authorization review) — keep these separated in downstream copy to avoid an implied bait-and-switch on speed.