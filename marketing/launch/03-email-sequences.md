# AI Sec Tester — Email Sequences (DRAFT)

**Status:** DRAFT — nothing here is scheduled, sent, or wired to a list. Review before any use.
**Product:** AI Sec Tester by The Souls of AI · https://scan.thesoulsofai.com
**Pricing (fixed):** Normal $47 · Advanced $197 (per scan) · Enterprise $497 (per chatbot)
**Voice:** calm, plainspoken, evidence-first — a good security engineer explaining a real finding to a founder. State the risk, then show the receipt. No AI-hype, no fear-selling, no fabricated proof.

---

## Tone lock — reuse the real transactional emails

These three sequences must sound like the emails the product already sends (`app/command-center/_email.ts`, `lib/email-templates.ts`). The transactional voice is:

- Greeting: `Hi {first name},` — sign-off: `— AI Sec Tester`
- Short declarative sentences. No exclamation marks. No emoji.
- Findings framed as `PASS / FAIL`, a grade, and `X of Y checks passed`.
- OWASP LLM checks named by code (LLM01 prompt injection, LLM02 sensitive info disclosure, LLM07 system-prompt leakage, LLM06 excessive agency) plus jailbreak / guardrail-bypass.
- Reference codes shown plainly (CASE-xxxx, SCN-xxxx, RESCAN-xxxx).
- Authorization framed as a feature the product is proud of, never as fine print.
- Real transactional subject lines to echo (do not contradict them):
  - Approval: *"Your AI chatbot security test is approved — pay to activate"*
  - Report: *"Your AI security test report is ready"*

Marketing copy sits one notch warmer than transactional, but never crosses into hype.

---

## Global grounding rules for whoever edits/sends these

**Allowed to say (verified):**
- Live request-first product; every CTA routes to the request form — no self-serve checkout.
- $47 / $197 / $497 one-time. Advanced billed per scan, Enterprise per chatbot.
- Tier scope (`landing.tsx:74/92/111`): Normal $47 = **5 OWASP LLM checks**; Advanced $197 = **full OWASP LLM Top-10 coverage** (the paid differentiator — never imply it at $47); Enterprise $497 = full report + **1 free re-scan after fixes** (**Enterprise-only**).
- **Admin-operated.** The public page is a request-a-scan intake form. There is no customer login, no self-serve checkout, and no customer-triggered scan or re-scan. Flow: intake → admin triage → approve → customer pays → admin activates → scan → report emailed. Copy may say *request*, *reply*, *activate by paying*. Copy may **never** say *run it*, *launch it*, *log in*, *click here to scan*, or *re-run it yourself*.
- Real interactive OWASP-LLM probes graded by an LLM judge — not a static payload list, not a simulation.
- Deliverable = Pass/Fail scorecard + A–F / 0–100 grade + branded PDF with evidence per finding and plain-language remediation.
- Authorization-first is enforced server-side: no payment taken and no scan launched at request time; consent re-checked, requester + target country resolved, OFAC/sanctioned targets auto-rejected, SG/MY held for manual licensing review.
- Enterprise adds identity verification, human review before the scan runs, and one free 30-day re-scan.

**Do NOT say (unverified / not yet true — mark `[NEEDS: …]` instead of inventing):**
- No customer testimonials, logos, case studies, scan counts, or "X bots tested" metrics exist. **Never fabricate social proof.**
- Do **not** promise "results in seconds" or a measured scan runtime. Promise the *deliverable*, not a speed. `[NEEDS: verified end-to-end scan→PDF→email runtime]`
- The 48h payment reminder / 14d auto-close cadence and cron are **designed behavior**, `[NEEDS: confirm migrations + cron live in prod]`. Copy below uses soft language ("in the next few days", "we hold your slot") so it stays true even if the exact timing isn't wired yet.
- Approval → payment-link email is a **Creator-gated live action**, not confirmed auto-send. Nurture copy must not promise instant automated delivery of a pay link.
- The on-landing scorecard is a static illustrative mock — any visual reusing it must be captioned as an example, not a real scan result.

**Placeholders in copy:** `{first_name}`, `{company}`, `{target_url}`, `{tier}`, `{case_ref}`, `{payment_link}`, `{score}`, `{grade}`, `{verdict}`, `{passed}`, `{total}`, `{rescan_ref}`. Merge-token names mirror `composeEmail()` so eng can wire them 1:1.

`{report_link}` is deliberately **not** in that list. There is no customer-facing page a recipient can click to run or re-run anything. Do not reintroduce it.

---

# SEQUENCE A — 3-Email Launch (warm list)

**Audience:** people who already know The Souls of AI — prior subscribers, waitlist, network who opted in. Warm only; this is not cold outreach. Every recipient must have a lawful basis to be emailed.
**Goal:** one action — request a scan of a bot they own or are authorized to test.
**Cadence (suggested):** Day 0 → Day 3 → Day 7. Stop the sequence the moment someone submits a request (they move to transactional lifecycle).
**Sender:** `The Souls of AI <hello@thesoulsofai.com>` `[NEEDS: confirm a Resend-verified marketing from-address; transactional uses no-reply@ / reports@ / alerts@]`

---

## A1 — Launch / the failure mode

**Subject line options**
1. Your chatbot will hand over its system prompt if someone asks nicely
2. We built a security scanner for the bots you're shipping
3. The security test your pentest firm didn't run on your chatbot

**Preview text:** Prompt injection, jailbreaks, system-prompt leakage — graded, with the evidence.

**Body**

Hi {first_name},

Most security tools have no concept of a system prompt. A web scanner will check your chatbot for SQL injection and missing headers, pass it, and never notice that the bot will recite its entire instruction set to anyone who asks the right way.

That gap is what we built AI Sec Tester for.

It runs the OWASP LLM Top-10 failure modes against a chatbot you own — as real interactive probes, not a checklist:

- **LLM01 — prompt injection:** can a user override your instructions?
- **LLM07 — system-prompt leakage:** will it reveal how it was told to behave?
- **LLM02 — sensitive info disclosure:** does it leak data from its context or backend?
- **LLM06 — excessive agency:** can it be talked into using tools it shouldn't?
- Plus jailbreak and guardrail-bypass patterns.

Each probe is graded by an LLM judge, with the probe and the bot's response captured as evidence. You get a Pass/Fail scorecard, an A–F / 0–100 grade, and a PDF report with plain-language remediation — a document you can hand to a developer, a customer, or an auditor.

One thing that makes us different: we won't scan a bot until you show you own it or are authorized to test it. That's enforced, not a checkbox — and it's exactly why the result is something you can stand behind.

Find out what your bot does before an attacker does.

**Request a scan → https://scan.thesoulsofai.com**

— AI Sec Tester

---

## A2 — How it works + why request-first

**Subject line options**
1. Why you request a scan instead of just paying and running it
2. The review step is the product, not the friction
3. What happens after you request a scan

**Preview text:** Point-and-scan tools are a liability engine. Here's the safer path.

**Body**

Hi {first_name},

A quick answer to the question we get most: *why can't I just pay and point it at a URL myself?*

Because scanning a system you can't prove you're authorized to test is illegal, and a self-serve "scan any URL" tool is a liability engine — for you and for whoever's on the other end. So the flow is deliberate:

1. **You request a scan** at scan.thesoulsofai.com — no payment, no login.
2. **We run due diligence** — ownership/authorization, plus geo, sanctions, and licensing checks. Nothing runs until this clears. `[target: usually within one business day — NEEDS confirm SLA before promising]`
3. **We approve and email a payment link** for your tier. No charge until it's approved.
4. **You pay, the scan runs, and your report is emailed** — Pass/Fail, grade, and a remediation PDF.

Three tiers, one-time:

- **Normal — $47:** five core OWASP-LLM checks, scorecard and PDF, for a single bot.
- **Advanced — $197 per scan:** the full OWASP LLM Top-10, with deeper probing per category. The Top-10 is the step up from Normal.
- **Enterprise — $497 per chatbot:** identity verification, human review before the scan runs, and one free 30-day re-scan after you fix findings.

The review step isn't friction we tolerate. It's the reason the result holds up.

**Request a scan → https://scan.thesoulsofai.com**

— AI Sec Tester

---

## A3 — Objection close + who this is for

**Subject line options**
1. "It's just a support bot" is exactly why it's the target
2. Last note on this — then we'll leave it
3. Where secrets actually leak in an AI chatbot

**Preview text:** Customer-facing, unmonitored, wired to a backend. That's the risk.

**Body**

Hi {first_name},

Two things we hear, and the honest answer to both.

**"Can't I just ask ChatGPT to jailbreak-test my own bot?"**
You can — and you'll get an anecdote, not evidence. Ad-hoc prompts are unstructured and un-repeatable. You can't show them to a customer, an investor, or an auditor, and you can't prove what you did or didn't test. AI Sec Tester runs the same failure modes as a structured battery, graded, with the receipt captured per finding. The output is a document, not a hunch.

**"It's just a support bot — this isn't high-risk."**
Support bots are the highest-value target precisely because they're customer-facing, unmonitored, and usually wired to a knowledge base or backend tools. That's where sensitive data (LLM02) and excessive tool access (LLM06) actually leak. This is a narrow, fast first pass — the filter between "did nothing" and a five-figure red-team engagement. Not a replacement for either. A place to start.

If you're shipping a customer-facing chatbot or AI agent, this is worth an afternoon.

**Request a scan → https://scan.thesoulsofai.com**

— AI Sec Tester

*You're getting this because you follow The Souls of AI. [Unsubscribe]({{unsub}}) anytime.*

---

# SEQUENCE B — Lead Nurture (requested a scan, didn't pay)

**Audience:** submitted the request form; either awaiting review, or approved with a payment link but not yet paid. This is a warm, in-progress lead — write like their case is open on our desk, because it is.
**Goal:** complete payment on the approved tier (or answer whatever stalled them).
**Cadence (suggested):** B1 at ~Day 2 after payment link sent · B2 at ~Day 5 · B3 at ~Day 10 (final).
**Guardrails:** Do not claim automated timing that isn't wired. Do not imply the scan has started — it hasn't; nothing runs before payment. Reference the case plainly (CASE-xxxx). `[NEEDS: confirm 48h reminder / 14d auto-close cron before hardcoding exact days]`
**Sender:** `AI Sec Tester <no-reply@thesoulsofai.com>` (match transactional).

---

## B1 — Gentle reminder + reduce friction

**Subject line options**
1. Your scan is approved and waiting on payment ({case_ref})
2. Ready when you are — {case_ref}
3. One step left on your AI security test

**Preview text:** No charge until you activate. Here's your link.

**Body**

Hi {first_name},

Your AI chatbot security test for {company} ({target_url}) is approved and ready to run. The only thing left is to activate it.

Plan: {tier}
Activate the scan: {payment_link}
Reference: {case_ref}

Once payment is confirmed, we run the scan and email your report — the Pass/Fail scorecard, your A–F grade, and a PDF with evidence and remediation for each finding.

If something's holding you up — a question about scope, the tier, or the authorization we verified — just reply. A real person reads these.

— AI Sec Tester

---

## B2 — Reframe the value + answer the silent objection

**Subject line options**
1. What you'll actually get back ({case_ref})
2. The report, not just a score
3. Still holding your slot — {case_ref}

**Preview text:** A document you can hand to a developer or an auditor.

**Body**

Hi {first_name},

Following up on your approved scan for {target_url} ({case_ref}) — still ready to run whenever you activate it.

In case it helps to see what lands in your inbox afterward: this isn't a number and a shrug. The report gives you, per finding:

- the exact probe we sent and how your bot responded (the evidence),
- a Pass/Fail against each OWASP-LLM check — prompt injection, system-prompt leakage, sensitive-data exposure, excessive agency, jailbreak resistance,
- plain-language remediation a developer can act on without a security background,
- an overall A–F / 0–100 grade you can point to.

It's the difference between "we think the bot's fine" and a document that shows what you tested and what you fixed.

Activate the scan: {payment_link}
Reference: {case_ref}

Reply if anything's unclear.

— AI Sec Tester

---

## B3 — Final note, no pressure

**Subject line options**
1. Closing this out unless we hear from you ({case_ref})
2. Last note on your scan request
3. Should we keep your slot open?

**Preview text:** No hard sell. Just tell us if you want to keep going.

**Body**

Hi {first_name},

Last note on your approved scan for {target_url} ({case_ref}).

If now isn't the time, that's completely fine — no pressure, and the authorization review you passed doesn't expire the moment we stop emailing. If you'd like to run it, the link's still good:

Activate the scan: {payment_link}
Reference: {case_ref}

And if something about the offer didn't fit — price, tier, scope — reply and tell me. That's genuinely useful, whether or not you go ahead.

Either way, thanks for taking your bot's security seriously enough to ask.

— AI Sec Tester

---

# SEQUENCE C — Post-Report Upsell (re-scan / higher tier)

**Audience:** received a report. One email, sent a few days after delivery — enough time to have started fixing, not so long they've forgotten.
**Goal:** two paths, pick per **tier + verdict** — (1) Enterprise with findings → the free re-scan (C1); (2) everyone else, or a clean pass → a deeper tier (C2). Never manufacture urgency.
**Guardrails:**
- The free 30-day re-scan is **Enterprise-only** (`landing.tsx:111` — "Full report + 1 free re-scan after fixes"). It is **not** included at Normal ($47) or Advanced ($197). C1 goes to Enterprise customers only.
- **The re-scan invite flow is not built** (`marketing/automation/02-fulfillment-ops-automation.md`). No automated invite, no re-scan link, no customer-triggered re-scan. The only mechanism that exists: the customer **replies with `{rescan_ref}`** and an operator queues it. Copy must say that and nothing more.
- Reference `{rescan_ref}` exactly as the report email does.
**Sender:** `AI Sec Tester <reports@thesoulsofai.com>` (match the report email).

---

## C1 — variant for a FAIL / findings present, **ENTERPRISE customers only** (lead with the free re-scan)

> **Eligibility lock:** the free 30-day re-scan is **Enterprise-only** (`landing.tsx:111`). Do NOT send C1 to a Normal ($47) or Advanced ($197) customer — for those tiers, send the C2 shape and offer a paid re-scan or a tier-up instead. There is also **no re-scan invite flow built** (`marketing/automation/02-fulfillment-ops-automation.md`): this email is the only invite, and the only mechanism is reply-with-reference → operator queues it manually.

**Subject line options**
1. Fixed the findings? Verify with your free re-scan ({rescan_ref})
2. Close the loop on {target_url}
3. Your free re-scan is waiting

**Preview text:** Naming the problem is half of it. Prove the fix.

**Body**

Hi {first_name},

Your report for {target_url} came back {verdict} — {passed} of {total} checks passed ({grade}). The remediation steps for each finding are in the PDF.

Here's the part people skip: fixing a finding and *verifying* the fix are two different things. A patch that looks right can still leave the door open, and you won't know until you probe it again.

That's what the re-scan is for. Once you've worked through the findings, we run it again — same battery, same grading, so you can see the checks flip to PASS.

Your Enterprise plan includes one free re-scan, available for 30 days:

Re-scan reference: {rescan_ref}
To claim it: reply to this email with that reference and tell us you're ready. We'll queue the re-scan and email the new report.

There's nothing for you to run or log into — we operate the scan on our side, same as the first one.

If you want a deeper look at a different bot while you're at it, Advanced ($197 per scan) covers the full OWASP LLM Top-10 rather than the five core checks. Reply and I'll point you to the right tier.

— AI Sec Tester

---

## C2 — variant for a PASS / clean result (offer depth, not a redo)

**Subject line options**
1. Your bot passed. Here's what a deeper pass would add.
2. Clean report on {target_url} — what's next
3. Passed today. What about the next release?

**Preview text:** A pass is a snapshot. Your bot keeps changing.

**Body**

Hi {first_name},

Good result — your report for {target_url} came back {verdict}, {passed} of {total} checks passed ({grade}). Worth saying plainly: that's the report you want to be able to show.

Two honest notes on what a pass does and doesn't mean:

- It's a snapshot. Every prompt change, new tool, or model swap is a fresh chance to reopen a finding. Bots that pass in March fail in June because the bot changed, not the test.
- The core battery is a fast first pass. If this bot is high-stakes — handling customer data, wired to backend tools, or about to scale — **Advanced ($197 per scan)** probes harder, and **Enterprise ($497 per chatbot)** adds identity verification, human review before the scan runs, and a free 30-day re-scan after fixes.

No urgency here. When your bot changes meaningfully, or when you want the deeper pass, request it and reference this one:

Reference: {case_ref}
Request the next scan: https://scan.thesoulsofai.com

— AI Sec Tester

---

## Open items before these go live (hand to Creator)

- **GATED — sending:** none of these may be scheduled or sent. Nurture/upsell touch the live customer lifecycle; wiring them to Resend or n8n is a launch-gated action requiring Creator approval.
- `[NEEDS: verified marketing from-address]` on a Resend-verified domain for Sequence A (transactional uses no-reply@ / reports@ / alerts@).
- `[NEEDS: confirm review SLA]` before printing "within one business day" (A2).
- `[NEEDS: confirm 48h reminder / 14d auto-close cron in prod]` before hardcoding nurture timing (Sequence B currently uses soft language to stay true regardless).
- **RESOLVED (was `[NEEDS: confirm re-scan tier eligibility]`):** the free re-scan is **Enterprise-only** (`landing.tsx:111`). C1 is now Enterprise-gated. Do not offer it at $47/$197.
- **RESOLVED / BLOCKER:** there is **no built re-scan invite flow** — C1's reply-with-reference instruction is the flow. If an operator does not watch that inbox, the entitlement is unfulfillable. `[NEEDS: an operator owner for re-scan replies before C1 is ever sent]`
- `[NEEDS: real social proof]` — every sequence deliberately ships with zero testimonials/metrics. Add only when real ones exist.
- **Suppression:** Sequence A must respect unsubscribe; B and C are transactional-adjacent (open case / delivered report) — keep them operational, not marketing blasts, and stop on reply or completion.
