# AI Sec Tester — Launch Content

> **Status:** DRAFTS ONLY. Nothing here posts, sends, or publishes. Every claim is grounded in what the product actually does: OWASP LLM Top-10 aligned prompt-injection, jailbreak, system-prompt-leak, sensitive-data and unsafe-output probes against a chatbot you own or are authorized to test, returning a Pass/Fail scorecard + branded PDF with evidence and remediation.
> **Funnel (source of truth = `lib/payment-links.ts`):** request-first. Submit → we verify authorization → approved gets an emailed payment link → scan runs → report emailed. No self-serve checkout.
> **Pricing:** Normal **$47**/scan · Advanced **$197**/scan · Enterprise **$497**/chatbot.
> **Voice reference:** `app/_components/landing.tsx`, `public/llms.txt` — plain-language, security-serious, "find out before an attacker does," no fear-mongering, no invented stats.
> **Note:** `public/llms.txt` shows stale $10 pricing — the live source of truth is `payment-links.ts` ($47/$197/$497), used throughout this file.

---

## 1. Landing hero + 4 section copy blocks

### Hero (polished variant)

**Eyebrow:** AI Chatbot Security Scanner

**Headline:** Is your AI chatbot easy to jailbreak?

**Subhead:** Run OWASP-aligned prompt-injection and jailbreak checks against your live chatbot. Get a Pass/Fail security scorecard — with evidence for every finding and plain-language fixes — in seconds.

**Primary CTA:** Request a scan
**Secondary CTA:** How it works

**Trust ticks:** OWASP-aligned · Pass/Fail scorecard · Results in seconds

---

### Section 1 — The problem (why this exists)

**Kicker:** The risk most teams ship blind

**Heading:** Your chatbot answers customers. It also answers attackers.

**Body:**
The same box that helps a customer will, with the right phrasing, leak your system prompt, ignore its own rules, or hand over data it was never meant to touch. You wrote the guardrails. The question is whether they hold when someone actually pushes on them.

AI Sec Tester pushes on them for you — the same way an attacker would — and tells you exactly where they give.

---

### Section 2 — What we check

**Kicker:** What we check

**Heading:** The risks most chatbots miss.

**Body:**
Checks aligned with the OWASP Top-10 for LLM Applications — the failure modes attackers actually use, not a generic checklist.

- **LLM01 · Prompt injection** — Can a crafted message override your instructions or hijack the bot's behavior?
- **LLM02 · Insecure output handling** — Does the bot return unsafe content that could break the page consuming it?
- **LLM06 · Sensitive info disclosure** — Will it reveal secrets, keys, or other users' data when coaxed?
- **LLM07 · System prompt leakage** — Can an attacker extract your hidden system prompt and business logic?
- **LLM08 · Excessive agency** — Does the bot take actions or call tools it shouldn't be allowed to?
- **Guardrail bypass** — Common jailbreak patterns that trick the model past its safety rules.

---

### Section 3 — How it works

**Kicker:** How it works

**Heading:** Three steps to a security scorecard.

**Body:**
1. **Point it at your bot.** Give the scanner your chatbot endpoint or widget. Only scan bots you own or are authorized to test.
2. **We run OWASP LLM checks.** Automated prompt-injection, jailbreak, and data-leak probes aligned to the OWASP Top-10 for LLM apps.
3. **Get scorecard + fixes.** A Pass/Fail report with evidence per finding and plain-language remediation you can hand straight to a developer.

**Note line:** Every scan starts with a short authorization request — we verify you own or are allowed to test the target before any payment or scan runs. No charge until approved.

---

### Section 4 — Closing CTA

**Kicker:** Find out before an attacker does

**Heading:** Scan your chatbot today.

**Body:** Get a security scorecard and fixes in seconds — starting at $47 per scan. Every request is reviewed for authorization first, so you only ever pay to test a bot you're allowed to test.

**CTA:** Request a scan

**Trustline:** Checks aligned with OWASP Top-10 for LLM Applications. Only scan chatbots you own or are authorized to test.

---

## 2. Launch email sequence (5 emails)

> Cold/warm list nurture toward a scan request. Drafts only — nothing sends. Each email ends at the request form, never a raw checkout link (approval gate first).

### Email 1 — Launch announcement

**Subject:** Your chatbot passes support tickets. Does it pass a jailbreak?

**Body:**

Hi {{first_name}},

If you've shipped an AI chatbot in the last year, you've shipped an attack surface — one that talks back.

We built AI Sec Tester to answer one question: *when someone tries to break your bot, does it hold?*

It runs OWASP LLM Top-10 aligned checks against your live chatbot — prompt injection, jailbreaks, system-prompt leakage, sensitive-data disclosure, unsafe output — and returns a Pass/Fail scorecard with evidence for every finding and plain-language fixes. In seconds.

No security background needed. You point it at your bot, we run the checks, you get a report a developer can act on.

One rule: you can only scan a chatbot you own or are authorized to test. That's why every scan starts with a short request we review first — not a checkout page.

→ Request a scan

— The Souls of AI

---

### Email 2 — Education / the OWASP angle

**Subject:** The 6 ways your chatbot gets broken

**Body:**

Hi {{first_name}},

Most people picture "hacking a chatbot" as something exotic. It's usually just typing.

Here are the failure modes attackers actually use — the ones AI Sec Tester probes for, aligned to the OWASP Top-10 for LLM Applications:

- **Prompt injection (LLM01)** — a crafted message overrides your instructions and hijacks the bot.
- **Insecure output handling (LLM02)** — the bot returns content that breaks the page rendering it.
- **Sensitive info disclosure (LLM06)** — it reveals secrets, keys, or another user's data when coaxed.
- **System prompt leakage (LLM07)** — an attacker extracts your hidden prompt and business logic.
- **Excessive agency (LLM08)** — the bot calls tools or takes actions it should never be allowed to.
- **Guardrail bypass** — familiar jailbreak patterns that walk the model past its safety rules.

You wrote guardrails for most of these. The only way to know they hold is to push on them.

→ Request a scan and see your scorecard

— The Souls of AI

---

### Email 3 — What you actually get

**Subject:** What a scan actually gives you (not just a red/green light)

**Body:**

Hi {{first_name}},

A "your bot is unsafe" alert helps no one. So here's exactly what lands in your inbox after a scan:

- A **branded PDF scorecard** with an overall grade.
- **Every check's Pass/Fail status** across the OWASP LLM categories.
- **Evidence for each finding** — the actual prompt and the actual response, so nothing is hand-wavy.
- **Remediation guidance** in plain language you can forward straight to whoever owns the bot.

It's the difference between "something's wrong" and "here's the exact prompt that leaked your system instructions, and here's how to close it."

→ Request a scan

— The Souls of AI

---

### Email 4 — Objection handling / how the request flow works

**Subject:** Why we don't just let you check out

**Body:**

Hi {{first_name}},

A fair question we get: *why request a scan instead of just paying?*

Because scanning a system you don't own is illegal — and we're not going to hand anyone a tool to probe someone else's chatbot. So every scan starts with a short authorization request:

1. **Request** — pick a plan, tell us the target, confirm you're authorized.
2. **Review** — we verify ownership/authorization, usually within one business day.
3. **Approved → pay** — you get a secure payment link for your tier, and the scan runs.
4. **Not approved** — you get an email with the reason, and no charge.

It protects you and us. And it means the moment you're approved, you're seconds from your scorecard.

→ Start your request

— The Souls of AI

---

### Email 5 — Pricing + last call

**Subject:** Pick a plan, then request your scan

**Body:**

Hi {{first_name}},

If you've been meaning to check your chatbot, here's the whole menu:

- **Normal — $47/scan.** A full one-off scan: 5 OWASP LLM checks, Pass/Fail scorecard, branded PDF, evidence + remediation per finding.
- **Advanced — $197/scan.** Everything in Normal, plus full OWASP LLM Top-10 coverage and deeper probes per category.
- **Enterprise — $497/chatbot.** Everything in Advanced, plus authorization + identity verification, automated risk triage, human review before the scan runs, a token-gated report page, and one free re-scan after you ship fixes.

Every plan starts the same way: request → we verify authorization → approved gets a payment link → report lands in your inbox. No charge until approved.

Find out before an attacker does.

→ Request a scan

— The Souls of AI

---

## 3. LinkedIn / X launch posts (6)

> Full text, drafts only. Mix of platforms noted per post.

### Post 1 — LinkedIn (launch)

We just launched AI Sec Tester.

It answers one question about your AI chatbot: when someone tries to break it, does it hold?

It runs OWASP LLM Top-10 aligned checks — prompt injection, jailbreaks, system-prompt leakage, sensitive-data disclosure, unsafe output — against your live bot and returns a Pass/Fail scorecard with evidence and plain-language fixes. In seconds.

You wrote guardrails. This tells you whether they hold.

One rule: you can only scan a bot you own or are authorized to test — so every scan starts with a short authorization review, not a checkout page.

Request a scan → scan.thesoulsofai.com

---

### Post 2 — X/Twitter (short, punchy)

Your AI chatbot passes support tickets.

Does it pass a jailbreak?

AI Sec Tester runs OWASP LLM Top-10 checks against your live bot → Pass/Fail scorecard + evidence + fixes, in seconds.

Find out before an attacker does. 🔒
scan.thesoulsofai.com

---

### Post 3 — LinkedIn (education / thread-style)

6 ways your AI chatbot gets broken — none of them require code, just typing:

1. Prompt injection — a message overrides your instructions
2. Insecure output — it returns content that breaks your page
3. Sensitive info disclosure — it leaks keys or other users' data
4. System prompt leakage — an attacker extracts your hidden prompt
5. Excessive agency — it calls tools it shouldn't
6. Guardrail bypass — classic jailbreaks walk it past its rules

These are the OWASP Top-10 for LLM Applications — the failure modes attackers actually use.

AI Sec Tester probes all of them and hands you a Pass/Fail scorecard with the exact prompt for every finding.

Request a scan → scan.thesoulsofai.com

---

### Post 4 — X/Twitter (proof / what you get)

A "your bot is unsafe" alert helps nobody.

AI Sec Tester gives you the receipt:
→ overall grade
→ Pass/Fail per OWASP LLM check
→ the actual prompt + response for every finding
→ plain-language fixes

Not "something's wrong." The exact prompt that leaked your system instructions.

scan.thesoulsofai.com

---

### Post 5 — LinkedIn (the authorization angle / trust)

We built AI Sec Tester so you *can't* use it to probe someone else's chatbot.

Every scan starts with an authorization request we review — usually within one business day. Approved, you get a payment link and the scan runs. Not approved, you get the reason and no charge.

Scanning a system you don't own is illegal. Making that gate the first step protects our customers and everyone else's bots.

Security tooling should be responsible by default.

Request a scan → scan.thesoulsofai.com

---

### Post 6 — X/Twitter (launch-day energy / CTA)

Shipped: AI Sec Tester 🔒

OWASP LLM Top-10 checks for your AI chatbot → Pass/Fail scorecard, evidence per finding, fixes you can hand to a dev. In seconds.

From $47/scan. Authorization reviewed first — no charge until approved.

Find out before an attacker does.
scan.thesoulsofai.com

---

## 4. Ad variations (3)

> Headline + body + CTA. Drafts only. Suitable for LinkedIn/Meta/search-style paid units.

### Ad A — Fear-of-the-unknown (measured, not alarmist)

**Headline:** Is your AI chatbot easy to jailbreak?

**Body:** You wrote the guardrails. AI Sec Tester finds out if they hold. OWASP LLM Top-10 checks against your live bot → Pass/Fail scorecard with evidence and fixes, in seconds. From $47.

**CTA:** Request a scan

---

### Ad B — Outcome / deliverable-led

**Headline:** A security scorecard for your chatbot — in seconds.

**Body:** Grade, Pass/Fail per OWASP LLM check, the exact prompt behind every finding, and plain-language fixes a developer can act on. Point it at your bot, get the report. From $47/scan.

**CTA:** Scan my chatbot

---

### Ad C — For teams without AppSec

**Headline:** Shipping a chatbot with no security team?

**Body:** AI Sec Tester runs the OWASP LLM Top-10 checks attackers use — prompt injection, jailbreaks, prompt leakage, data disclosure — and hands you a report anyone can read. No security background needed. From $47.

**CTA:** Request a scan

---

## 5. Product Hunt launch-day post

**Name:** AI Sec Tester

**Tagline:** OWASP LLM Top-10 security scans for your AI chatbot — Pass/Fail scorecard in seconds

**First comment (maker post):**

Hey Product Hunt 👋

We're The Souls of AI, and we kept running into the same gap: teams are shipping customer-facing AI chatbots fast, but almost none of them have a way to check whether those bots can be jailbroken, leaked, or coaxed into misbehaving.

So we built **AI Sec Tester**.

**What it does:**
Point it at a chatbot you own or are authorized to test. It runs OWASP LLM Top-10 aligned checks — prompt injection (LLM01), insecure output (LLM02), sensitive info disclosure (LLM06), system prompt leakage (LLM07), excessive agency (LLM08), and common jailbreak/guardrail-bypass patterns. You get back a **Pass/Fail scorecard** with a grade, **evidence for every finding** (the actual prompt and response), and **plain-language remediation** you can hand straight to a developer. In seconds.

**Why the request-first flow:**
Scanning a system you don't own is illegal, so every scan starts with a short authorization review — not a checkout page. Approved requests get a secure payment link and the scan runs; unapproved ones get a reason and no charge. It keeps the whole thing responsible by default.

**Who it's for:**
Small-to-mid teams shipping customer-facing chatbots without a dedicated AppSec function — founders, product engineers, and consultants who need proof their bot is resilient before someone probes it.

**Pricing:**
- Normal — $47/scan (5 OWASP LLM checks, scorecard, branded PDF)
- Advanced — $197/scan (full OWASP LLM Top-10 coverage, deeper probes)
- Enterprise — $497/chatbot (identity verification, human review, token-gated report, 1 free re-scan after fixes)

We'd genuinely love feedback from anyone who's shipped an LLM chatbot — especially the failure modes you've seen in the wild. What did we miss?

Find out before an attacker does → scan.thesoulsofai.com

— The Souls of AI

**Suggested topics/tags:** Artificial Intelligence · Security · Developer Tools · SaaS
