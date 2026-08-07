# AI Sec Tester — Landing Page Copy (Draft, replacement/upgrade)

**Status:** DRAFT. LOCAL_ONLY. Not deployed, not live-edited. Every claim below is grounded
in code/config read on 2026-08-08 — see citations. Anything without a citation is marked
`[CREATOR DECISION]`. This is copy for Creator/builder review before it touches
`app/_components/landing.tsx`.

**Grounded in:** `lib/payment-links.ts`, `lib/tier-features.ts`, `lib/scan-engine.ts`
(`TEST_DEFINITIONS`, `EXTENDED_TEST_DEFINITIONS`, `testsForTier`, `ADVISORY_KEYS`),
`marketing/launch/01-positioning-messaging.md` (existing approved positioning — this
copy inherits its Do/Don't list and does not contradict it), ruling R-15 (Enterprise
retired).

---

## 1. Headline options (pick one; do not run more than one live at a time)

1. **"Find out if your chatbot leaks its system prompt — before someone else does."**
2. **"A security scorecard for your AI chatbot. Pass/Fail, with the evidence."**
3. **"The prompt-injection and data-leak checks a normal pentest never runs."**
4. **"OWASP LLM Top-10 checks for chatbots — from $47."**
5. **"The chatbot scanner that won't run until you prove you're allowed to test the target."**

Recommendation: #1 for cold/organic traffic (concrete failure mode, curiosity-driven);
#2 for anyone already searching for "AI security testing" (category-clear, converts
intent). `[CREATOR DECISION: which headline ships]`.

## 2. Subhead

> Real interactive probes against your live chatbot, graded against the OWASP LLM
> Top-10 — prompt injection, system-prompt leakage, sensitive data exposure, excessive
> tool access, and more. You get a Pass/Fail scorecard and a PDF report with evidence
> per finding and plain-language remediation. Two tiers, one-time price, no
> subscription. Nothing runs until a human confirms you're authorized to test the
> target.

## 3. The problem (short block, above the fold or immediately below hero)

> Your app-sec stack tests SQL injection, TLS config, and auth headers. None of it
> knows what a system prompt is. If you shipped a chatbot on top of an LLM API, it has
> a whole category of failure modes — prompt injection, jailbreak bypass, system-prompt
> disclosure, tool misuse — that a generic scanner (Burp, ZAP, Nessus) will not catch,
> and that "I asked ChatGPT to jailbreak it myself" doesn't document or repeat. AI Sec
> Tester is the structured, evidence-producing check for that specific layer.

## 4. How it works — 3 steps

1. **Request a scan.** Submit your target, your plan choice, and proof of authorization
   to test it (ownership or written permission). This is a request, not a checkout —
   there is no self-serve "run it now" button. [VERIFIED: `app/_components/landing.tsx`
   request form routes to `#request`, no Stripe link on the page — code read]
2. **We review and send a payment link.** A person checks the authorization,
   jurisdiction, and sanctions screen before anything is approved. If it clears,
   you get an emailed Stripe payment link — you are not charged before approval.
   [VERIFIED: `app/actions/scan-request-lifecycle.ts` — manual approval step, no
   auto-approve path]
3. **Pay and the scan runs automatically.** Payment settles through Stripe, the webhook
   fires on `checkout.session.completed`, the scan dispatches, and the PDF report is
   emailed when it finishes — no second request, no manual step on your side.
   [VERIFIED: `app/api/stripe/webhooks/route.ts:120-121`; prod `/api/health` shows
   `autoDispatchArmed:true`, `emailSendEnabled:true`, `realScanEnabled:true`, curl
   2026-08-07; live proof: request 7fdd21ea, paid to delivered PDF in under 4 minutes,
   2026-08-01]

`[CREATOR DECISION: publish the "1 business day" review-time promise or omit it]` — no
code enforces an SLA on step 2; it depends on someone watching the review queue. Do not
state a turnaround time as a guarantee until that is either automated or a Creator
commitment.

## 5. What's in each tier — the honest difference

**Normal — $47**
- 5 OWASP LLM checks: prompt injection / instruction override (LLM01), jailbreak &
  persona bypass (LLM01), system-prompt disclosure (LLM07), sensitive data exposure
  (LLM02), unsafe content generation (LLM05).
- Pass/Fail scorecard.
- Scan starts automatically after payment — no manual step once approved and paid.
- Branded PDF report with evidence per finding and remediation.

**Advanced — $197**
- Everything in Normal.
- All 10 OWASP LLM Top-10 categories — 7 tested live against your running app
  (the 5 above, plus excessive agency/LLM06, misinformation & overreliance/LLM09, and
  unbounded consumption/LLM10), and 3 assessed by a control-review questionnaire you
  complete (supply chain/LLM03, training-data/model poisoning/LLM04, vector &
  embedding weaknesses/LLM08 — these three touch server-side infrastructure a
  black-box scan cannot reach from outside).
- 15 checks total (5 core + 10 extended, including 4 general web-hardening checks:
  transport encryption, HSTS, CSP, clickjacking protection) versus 5 at Normal.
- PDF reports emailed automatically.

**The honest line to state plainly:** the $150 gap buys full OWASP LLM Top-10 category
coverage instead of a 5-check subset, plus the advisory review for the 3 categories no
external scanner can probe directly. It does not buy a different scan speed, a
different report design, or priority processing — the pipeline treats both tiers the
same operationally. [VERIFIED: `lib/scan-engine.ts` `testsForTier`, `lib/tier-features.ts`]

Both tiers include automated risk triage and a human authorization review before the
scan runs — this is not a paid perk, it applies to every request regardless of tier.

## 6. Who this is NOT for

- Anyone who cannot show ownership of, or written authorization to test, the target.
  The request will not be approved without it — this is enforced, not a formality.
- Anyone expecting a full manual red-team or continuous monitoring. This is a
  point-in-time scan you request, not an always-on sensor and not a substitute for a
  full engagement.
- Anyone expecting a compliance certification (SOC 2, ISO 27001, PCI, HIPAA
  attestation, etc.). This product does not issue or imply any compliance
  certification — it produces a technical scorecard and report, nothing more.
- Anyone who needs results guaranteed within a fixed number of hours. No SLA is
  currently published. `[CREATOR DECISION]`
- Anyone looking for a subscription or continuous scanning product — this is a
  one-time, per-scan purchase.

## 7. FAQ (8 questions)

**Q1: What exactly do I get for $47 vs. $197?**
$47 (Normal) runs 5 OWASP LLM checks and gives you a Pass/Fail scorecard and PDF.
$197 (Advanced) covers all 10 OWASP LLM Top-10 categories — 7 tested live, 3 by a
control review you complete — across 15 checks total. See the tier breakdown above.

**Q2: Do I need to do anything technical to request a scan?**
You submit your target URL, choose a tier, and confirm authorization to test it. The
scan itself runs against a public-facing endpoint; no code integration or SDK install
is required on your side to be scanned.

**Q3: Is this a real scan or a simulated report?**
The delivery pipeline is real: your payment triggers a live scan run and a generated
PDF, not a template. [VERIFIED: prod health check confirms `realScanEnabled:true`,
and a full paid-to-delivered run completed in under 4 minutes on 2026-08-01]

**Q4: How long until I get my report?**
`[CREATOR DECISION: state a number or say "typically same day" only once the review-
step SLA is actually staffed/automated]`. As written today: approval is a manual step,
so timing depends on someone reviewing the request queue. Once approved and paid, the
scan and report generation are automatic and fast (see Q3).

**Q5: Can you scan any chatbot, including one I don't own?**
No. Every request goes through an authorization check — ownership or written
permission, plus a jurisdiction/sanctions screen — before it is approved. Requests
without provable authorization are not approved. This exists because scanning a system
you cannot prove you're allowed to test is illegal, not as friction for its own sake.

**Q6: Is there a refund or guarantee if the report finds nothing?**
`[CREATOR DECISION: no refund or guarantee policy currently exists anywhere in the
codebase or PRD — do not publish one until Creator sets it]`. What can be said today
honestly: a clean Pass/Fail scorecard is itself a deliverable — documented due
diligence that your chatbot was checked against the OWASP LLM Top-10, not proof the
money was wasted.

**Q7: Does this replace a full penetration test?**
No. It is a fast, narrower first-pass filter for the LLM-specific failure modes a
general pentest usually does not cover, at a fraction of the cost of a manual
red-team engagement. It is not a substitute for a full assessment, and does not claim
to be.

**Q8: What does the report actually contain?**
A Pass/Fail (or, on Advanced, category-level) scorecard, and a branded PDF with
evidence captured per finding (the probe and the response) plus plain-language
remediation steps a developer can act on without a security background.
[VERIFIED: `lib/tier-features.ts` bullet list; `lib/scan-engine.ts` evidence/remediation
fields on every test definition]

## 8. CTA block

**Primary CTA button:** "Request a scan" — routes to the on-page request form. Never
"Buy now," "Checkout," or "Start scan" — there is no self-serve checkout or login on
this product, and copy must not imply one. [VERIFIED: `app/_components/landing.tsx`
comment: every CTA "routes to the #request form... does NOT route to /enterprise"]

**Secondary line under the button:**
> No charge until your request is reviewed and approved. $47 Normal or $197 Advanced,
> one-time — no subscription.

**Micro-trust line (optional, directly under CTA):**
> Nothing runs until we've confirmed you own or are authorized to test the target.

---

## Open items for Creator

- `[CREATOR DECISION]` Refund/guarantee policy — none exists; do not invent one.
- `[CREATOR DECISION]` Review-time SLA claim ("1 business day" or similar) — not
  enforced in code today; publishing it as a promise requires either automation or an
  explicit staffing commitment.
- `[CREATOR DECISION]` Which of the 5 headlines ships, and whether to A/B them.
