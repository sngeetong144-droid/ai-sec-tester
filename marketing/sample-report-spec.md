# AI Sec Tester — Sample Report Spec (Draft)

**Status:** DRAFT spec, not the artifact itself. LOCAL_ONLY. Building the actual
sample PDF requires running a real scan against a target Creator selects, which is a
CREATOR-GATED action (see §4) — this document specifies what to build and how, so that
step can happen fast once approved.

**Why this asset:** `2026-08-08_REVENUE-GAP.md` ranks this the #2 missing piece —
"buyer asked to pay $47–$197 before seeing real output... no demo PDF, case study, or
testimonial anywhere." A $197 purchase decision currently has zero proof artifact to
evaluate. This is buildable now with no code change to the live app.

---

## 1. What the real report actually contains (ground truth, so the sample doesn't drift)

Per `lib/report-labels.ts`, `lib/scan-engine.ts`, `lib/tier-features.ts`:

- A grade/scorecard header.
- One row per checked category, each labeled with one of: `PASS`, `FAIL`, `NOT RUN`,
  `PARTIAL` (some probes in that category delivered, some not — explicitly marked
  `PARTIAL COVERAGE`, never silently dropped), and for the 3 advisory-only categories:
  `ADVISORY` (no customer disclosure provided), `REVIEWED`, `REVIEWED - GAPS`, or
  `NOT ASSESSED` (a control-review questionnaire was submitted with those verdicts).
- Evidence per finding: the probe sent and the response received.
- Plain-language remediation per finding.
- On Advanced: all 10 OWASP LLM categories represented (7 with a probe result, 3 with
  an advisory/reviewed label) — never a flat PASS/FAIL on the 3 advisory rows, by
  design (a customer-disclosed control is not a tested control, and mislabeling this
  has already caused one real false "FAIL" incident on request c25b2cfc, 2026-08-01 —
  do not repeat that mistake in the sample).

**Rule for the sample:** the sample report must show these exact states and this exact
honesty — including at least one `ADVISORY`/`REVIEWED` row, not just PASS/FAIL rows —
or it misrepresents what a buyer actually receives. A sample that looks "cleaner" than
the real product is a false-advertising risk, not a marketing win.

## 2. What the sample must contain

1. **Cover / header:** product name, tier tested (recommend Advanced, since it's the
   $197 tier that most needs a proof artifact), scan date, target field explicitly
   labeled as redacted/sample (see §3).
2. **Scorecard summary:** the grade format actually used in production (A–F / 0–100
   per the positioning doc — confirm exact format against the live PDF generator
   before finalizing copy, do not guess a format that doesn't match production).
3. **Full category table:** all categories the tested tier covers, each with its real
   label state (`PASS`/`FAIL`/`ADVISORY`/`REVIEWED`/etc.) — a mix, not all-PASS. An
   all-PASS sample looks fake and hides how the advisory rows actually render, which is
   exactly the honesty a technical buyer will check for.
4. **2-3 full evidence blocks:** the probe and response text for a representative
   FAIL or PARTIAL finding, plus one advisory-row example, so a buyer can see exactly
   what "evidence per finding" means before paying.
5. **Remediation text** for each shown finding, verbatim as the report would generate
   it.
6. **A visible "SAMPLE — REDACTED" watermark or banner** on every page (see §3).
7. **A short footer/notice** stating this is a redacted sample from a real scan run
   for demonstration purposes, not a live customer's report, and that a purchased
   report is unwatermarked and target-specific.

## 3. What must be redacted, and how

The report must come from a **real scan run**, per §4 — no hand-written fake findings.
Real output, then redact:

- **Target identity:** replace any real domain, company name, or bot name with a
  clearly fictional placeholder (e.g., `demo-chat.example.com`, "Example Corp"). Do
  this at the source-data level before PDF generation, not by painting over text —
  a redacted PDF with the real string still present underneath (selectable/copyable
  text, or in the file's metadata) is not actually redacted.
- **System prompt contents, if leaked during the demo scan:** truncate or replace with
  `[REDACTED — full text withheld]` rather than showing a real internal prompt, even
  from a target Creator owns and approves showing. Showing methodology and format
  matters more than showing a full raw leak.
- **Any URL, internal endpoint, IP address, or email address** surfaced in evidence
  text: replace with placeholder values (`https://demo.example.com/api/...`).
- **Timestamps/request IDs:** either keep generic or replace with placeholders — no
  need to expose real scan-request UUIDs or internal IDs.
- **No real customer data, ever.** The target used for this sample MUST be one Creator
  owns or explicitly controls (e.g., a demo bot built specifically for this purpose, or
  an existing owned property) — never a past paying customer's target, even redacted.
  Reusing a real customer's scan, even with names removed, risks re-identification and
  breaches the trust the authorization gate is built to protect.

## 4. How to produce it — recommended path

1. **Creator selects or stands up a target** Creator owns (a throwaway demo chatbot is
   ideal — cheap to build, guarantees no real-customer data risk, and lets Creator
   control which findings appear, e.g. deliberately leaving one prompt-leak
   vulnerability in for a demonstrative FAIL). `[CREATOR DECISION: which target]`
2. **Run a real scan** against that target through the actual product pipeline (Advanced
   tier, to get full category coverage) — either via the normal paid flow on an
   internal/test payment, or via whatever internal admin scan-trigger path already
   exists in Command Center. `[CREATOR DECISION / builder task: confirm the least-risk
   way to trigger a real scan without touching live customer-facing state]`
3. **Take the generated PDF** and redact per §3 — this is a content-editing pass, not
   a code change, and can be done by a designer/writer once the raw PDF exists.
4. **Add the SAMPLE/REDACTED banner and footer notice** (§2.6-2.7).
5. **Place the finished PDF as a downloadable link on the landing page**, near the
   Advanced tier description, with a caption: "See a redacted sample report before you
   buy." This is a landing-page content change and needs the same sign-off as any
   other live-copy change (hard gate: live offer copy).
6. **Keep the source (unredacted) PDF and the target identity** in a Creator-only
   location, not in this marketing folder, in case redaction needs revisiting.

## 5. What NOT to do

- Do not hand-author fake findings, fake evidence text, or a fake grade "for
  illustration" — the existing landing page already has one static illustrative
  mock scorecard, and `01-positioning-messaging.md` explicitly flags that anything
  reusing it must be captioned "illustrative example," never presented as a real
  result. A sample REPORT (not the small on-page mock) should be the real thing,
  redacted — that is what actually proves the product works, and is the whole point
  of building it.
- Do not use any past scan_requests row, even one Creator's own test traffic
  generated, without first confirming no real third-party target or data is embedded
  in it. Building fresh from a Creator-owned demo target avoids this question
  entirely and is the safer, cheaper path.
- Do not publish the sample to the live landing page without a redaction review pass —
  that step is what turns this from a risk into an asset.

## 6. Gate summary

| Step | Gate |
|---|---|
| Selecting/building a demo target | `[CREATOR DECISION]` — no gate to draft, but needs a decision |
| Triggering a real scan | LOCAL/PROJECT, likely auto if done via existing admin tooling — confirm before assuming |
| Redacting and formatting the PDF | LOCAL_ONLY, no gate |
| Publishing the sample link on the live landing page | HARD GATE — live offer/copy change, needs Creator sign-off |
