# AI Sec Tester — Video / Social Scripts (Draft)

Grounded in actual product (read `app/_components/landing.tsx`, `lib/tier-features.ts`): scanner runs OWASP LLM Top-10-aligned checks (prompt injection LLM01, sensitive info disclosure LLM02, system prompt leakage LLM07, excessive agency LLM06, jailbreak/guardrail bypass, insecure output handling) against a customer's chatbot; returns a Pass/Fail scorecard with a letter grade, evidence per finding, and remediation guidance as a branded PDF. Flow is NOT self-serve: Request → human/automated review of authorization (usually within 1 business day) → approved requests get an emailed Stripe payment link → scan runs → report emailed. Tiers: Normal $47 (5 checks, 1 scan), Advanced $197 (full OWASP LLM Top-10 coverage, deeper probes), Enterprise $497 (identity verification, human review, 1 free re-scan). Brand: The Souls of AI, site scan.thesoulsofai.com. No invented stats/testimonials used below — social-proof slots are marked TBD.

---

## SHORT-FORM SCRIPTS (30–60s, TikTok/Reels/Shorts/LinkedIn native cuts)

### Script 1 — "The Jailbreak Test" (fear/problem angle)
Platform: TikTok/Reels primary, Shorts crop
Length: 32s

| Time | Visual (shot list) | On-screen text | VO |
|---|---|---|---|
| 0:00–0:03 | Screen recording: typing into a company chatbot widget | "Would YOUR chatbot fall for this?" | "Watch what happens when I try this on a live support bot." |
| 0:03–0:10 | Type a jailbreak-style prompt into the widget (generic, non-working example — do not demo a real exploit against a real target) | "Prompt injection: LLM01" | "This is called prompt injection — it's #1 on the OWASP LLM Top 10." |
| 0:10–0:18 | Cut to AI Sec Tester scorecard mock (from landing page) — grade "A-", rows PASS/REVIEW | "Pass/Fail scorecard. Evidence per finding." | "AI Sec Tester runs checks like this against your chatbot automatically — prompt injection, jailbreaks, system prompt leaks, data disclosure." |
| 0:18–0:25 | Scroll through the 6 check cards (LLM01, LLM02, LLM07, LLM06, jailbreak, insecure output) | "5–10 OWASP-aligned checks" | "You get a graded report with exactly what failed and how to fix it." |
| 0:25–0:30 | Pricing tiers on screen, $47 highlighted | "Scans start at $47" | "Request a scan — we verify you're authorized to test the bot, then send you a report." |
| 0:30–0:32 | Logo card | "scan.thesoulsofai.com" | "Link in bio." |

Notes: hook must show a REAL widget interaction, not a fabricated exploit claim — do not assert the demo bot "was jailbroken" unless that's an actual reproducible finding from a real scan; otherwise caption it as a category explainer, not a live break.

---

### Script 2 — "Report Reveal" (proof/product angle)
Platform: Reels/Shorts
Length: 30s

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 0:00–0:04 | Close-up: PDF report opening, grade badge zooms in | "The report your chatbot doesn't want you to see" | "Here's what an AI security scan actually looks like." |
| 0:04–0:12 | Scroll the scorecard: each row flips PASS → check icon, one flips to "REVIEW" in amber | "1 medium issue found · 5 checks run" | "Pass/fail, per category — prompt injection, data leaks, system prompt exposure, excessive agency." |
| 0:12–0:20 | Cut to a finding detail (evidence text block, remediation note) | "Evidence + fix, per finding" | "Every finding comes with evidence and a plain-language fix your dev can act on same day." |
| 0:20–0:27 | Zoom out to full report, PDF download icon | "Branded PDF · yours to keep" | "It's a real audit report — not a screenshot, not a promise." |
| 0:27–0:30 | Logo + CTA card | "Request a scan → scan.thesoulsofai.com" | "Request a scan today." |

---

### Script 3 — "You Wouldn't Ship Code Without Testing It" (analogy/urgency angle)
Platform: LinkedIn native video, Reels crop
Length: 40s

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 0:00–0:04 | Split screen: unit test suite passing (green checks) vs. a chatbot UI with no visible security anything | "You test your code. Who tests your chatbot?" | "You wouldn't ship a feature without tests." |
| 0:04–0:12 | Zoom into chatbot UI, cursor hovers, nothing happens — empty/unaudited feel | "Most AI chatbots ship with zero security testing" | "But most teams ship a customer-facing AI chatbot with zero adversarial testing." |
| 0:12–0:22 | Cut to AI Sec Tester "What we check" grid (6 cards: LLM01, LLM06, LLM07, LLM08, jailbreak, insecure output) | "OWASP LLM Top-10 aligned" | "AI Sec Tester runs the same category of checks security teams use — prompt injection, data leakage, system prompt extraction, unsafe outputs." |
| 0:22–0:32 | Scorecard reveal + "3 steps" graphic (Point it at your bot → We run checks → Get scorecard) | "3 steps. Seconds to results." | "Point it at your bot, we run the checks, you get a graded report with fixes." |
| 0:32–0:38 | Pricing card, $47 / $197 / $497 | "$47 · $197 · $497" | "Plans start at $47 per scan." |
| 0:38–0:40 | Logo card | "scan.thesoulsofai.com" | — |

---

### Script 4 — "Why We Ask First" (trust/process angle)
Platform: LinkedIn primary (builds credibility with B2B ICP), Reels secondary
Length: 35s

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 0:00–0:05 | Text-on-screen open, no face | "We won't scan your chatbot without asking first." | "We won't scan your chatbot without asking first — and here's why that matters." |
| 0:05–0:14 | Screen recording: the "Request a scan" form on the landing page | "Scanning a system you don't own is illegal." | "Scanning a system you don't own is illegal. So every request gets reviewed before anything runs." |
| 0:14–0:24 | 4-step flow graphic from landing page (Request → Review → Approved→pay → Not approved) | "Request → Review → Approved → Pay. No charge until approved." | "You submit, we verify you're authorized to test the target — usually within a business day — then send a secure payment link. No charge if we can't verify it." |
| 0:24–0:32 | Cut to Enterprise tier card: "Authorization + identity verification" | "Enterprise adds identity verification" | "Enterprise plans add identity verification and a human review pass before the scan runs." |
| 0:32–0:35 | Logo card | "scan.thesoulsofai.com" | "Built to be safe for everyone — including you." |

---

### Script 5 — "Pick Your Depth" (direct offer/pricing angle)
Platform: Reels/Shorts, TikTok
Length: 28s

| Time | Visual | On-screen text | VO |
|---|---|---|---|
| 0:00–0:03 | Three pricing cards sliding in one at a time | "3 ways to test your chatbot" | "Three ways to test your AI chatbot's security." |
| 0:03–0:10 | Card 1: Normal $47 | "$47 · 5 OWASP checks · PDF report" | "Normal — five core OWASP checks, one scan, a full PDF report." |
| 0:10–0:17 | Card 2: Advanced $197, "Most popular" ribbon | "$197 · Full OWASP LLM Top-10 · deeper probes" | "Advanced — full OWASP LLM Top-10 coverage with deeper probes per category." |
| 0:17–0:24 | Card 3: Enterprise $497 | "$497 · ID verification · human review · free re-scan" | "Enterprise — identity verification, human review before the scan runs, and one free re-scan after you fix what we find." |
| 0:24–0:28 | Logo + CTA | "Request a scan → scan.thesoulsofai.com" | "Pick one. Request a scan." |

---

## DEMO-WALKTHROUGH CONCEPTS (longer form, 60–90s, YouTube Shorts / LinkedIn / site embed)

### Demo A — "Full Flow, Start to Finish" (~75s)
Purpose: show the entire funnel end-to-end so a skeptical B2B buyer trusts the process before requesting.

Shot list:
1. (0:00–0:10) Screen recording: landing page hero scroll ("Is your AI chatbot easy to jailbreak?") → click "Request a scan."
2. (0:10–0:25) Fill the request form on camera (target URL, plan tier selection) — VO explains what's being verified (ownership/authorization).
3. (0:25–0:35) Cut to a mocked inbox: "Request received" confirmation email, then (time-lapse graphic, "usually within 1 business day") the approval email with secure payment link.
4. (0:35–0:50) Payment link click → Stripe checkout (blur/placeholder card entry) → confirmation.
5. (0:50–0:65) Scan running state → scorecard populates row by row (PASS/PASS/REVIEW/PASS/PASS), grade badge lands on "A-".
6. (0:65–0:75) PDF report download, close on logo + URL.

On-screen text beats: "Request" → "Reviewed (~1 business day)" → "Approved → Pay" → "Scan runs" → "Report emailed."
VO tone: calm, procedural, credibility-first — this is the trust-building asset, not the hook asset.

### Demo B — "Inside One Finding" (~60s)
Purpose: prove the report has real technical substance, not just a letter grade — for a more technical ICP (eng leads, security-adjacent buyers).

Shot list:
1. (0:00–0:08) Open directly on a scorecard row flipped to "REVIEW" (LLM02 — sensitive info disclosure), no landing-page preamble.
2. (0:08–0:20) Click/scroll into the finding detail: the evidence block (what was sent, what came back) — VO explains this is exactly what an attacker would see.
3. (0:20–0:35) Scroll to remediation guidance section — VO reads the plain-language fix, emphasizes it's dev-actionable, not generic advice.
4. (0:35–0:50) Zoom out to full report structure: grade, 5-6 category rows, evidence-per-finding pattern repeats.
5. (0:50–0:60) Close on pricing card for the tier that includes this depth + CTA.

On-screen text beats: "Evidence, not guesses" → "Fix, not a lecture" → "Every finding, same format."
VO tone: technical, specific, no hype language.

---

## PRODUCTION NOTE — Local (Remotion + ffmpeg) vs. Paid (Higgsfield)

**Recommendation: build these locally with Remotion + ffmpeg first. No paid tool needed for this batch.**

What these 5 scripts + 2 demos actually require: screen recordings of the real product (landing page, scorecard mock, pricing cards, request form), text overlays, simple zoom/pan/cut transitions, and a logo/CTA card. None of that needs AI video generation (Higgsfield's category) — it needs screen capture + programmatic compositing, which is exactly what Remotion (React-based video-as-code, already fits this stack) + ffmpeg (encode/format/crop for TikTok 9:16 vs LinkedIn 1:1 vs Shorts 9:16) covers at zero marginal cost beyond render time on hardware already owned.

MTCOOM path:
1. Screen-record the live product (scan.thesoulsofai.com) for each shot list above — OBS or native screen recorder, zero cost.
2. Composite in Remotion: text overlays, zoom/pan on the recordings, transitions between shots, logo/CTA end cards — reuse one Remotion template across all 5 scripts (same intro/outro pattern, swap body clips).
3. Export per-platform aspect ratios/durations with ffmpeg (9:16 crop for TikTok/Reels/Shorts, 1:1 or 16:9 for LinkedIn).
4. VO: record directly or use existing local/Claude-accessible TTS per MTCOOM policy — no new subscription needed for these scripts (no synthetic actors, no AI-generated footage required, since every visual is a real product screen recording).

When a paid tool like Higgsfield would actually be justified: if a future concept needs synthetic human presenters, stylized AI-generated b-roll, or motion-generated footage the product itself can't supply (e.g., an abstract "attacker" visualization with no real screen to record). None of the 7 assets here need that — they're all product-truth screen recordings. Gate any Higgsfield spend behind that specific need, not this batch.
