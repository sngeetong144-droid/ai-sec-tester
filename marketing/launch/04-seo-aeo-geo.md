# AI Sec Tester — SEO / AEO / GEO Plan

> **Status:** DRAFT · **Owner:** Marketing (launch team) · **Product:** AI Sec Tester by The Souls of AI
> **Live:** https://scan.thesoulsofai.com · **Date:** 2026-07-12
> **Nothing here is published, sent, or wired live.** Every asset below is a to-do unless the Status column says SHIPPED.

---

## 0. What this doc is (and the three acronyms)

- **SEO** — ranking in Google/Bing for the searches buyers actually type.
- **AEO** (Answer Engine Optimization) — being the source Google's AI Overviews / featured snippets / "People Also Ask" quote. Won with tight Q&A blocks + FAQ schema.
- **GEO** (Generative Engine Optimization) — being cited by ChatGPT, Claude, Perplexity, Gemini when a user asks them "how do I test my chatbot for prompt injection." Won with a clean, factual `llms.txt`, structured claims, and third-party corroboration.

For a request-first product with no self-serve funnel, the job of all three is the same: **get a qualified buyer to the request form (`#request`) already believing we're the credible, legal, non-theatre option.** Content does the pre-selling the sales page can't.

---

## 1. Shipped vs. To-Do (read this first)

| Asset | Status | Note |
|---|---|---|
| `public/llms.txt` — GEO source of truth | **SHIPPED — needs a pricing pass** | Capability list mapped to LLM codes and the defensive-use/compliance block are current. Pricing must read the two live tiers only — **$47 Normal / $197 Advanced**. [NEEDS: confirm no third tier remains in the file.] This is the ONLY live GEO/SEO content asset. |
| Landing page live at scan.thesoulsofai.com | **SHIPPED** | Request-first, two-tier copy, mock scorecard. Meta tags need audit (see §4). |
| Correct pricing across site | **SHIPPED (app)** | The app now sells two tiers — $47 Normal, $197 Advanced. The old "fix stale $10 llms.txt" action item is **DONE — drop it.** Non-app assets must quote two tiers, never a third. |
| Landing on-page meta (title/description/OG/canonical) | **TO-DO — verify then set** | See §4. May already be partially set in `layout.tsx` — audit before editing. |
| JSON-LD structured data (Organization, Product/Service, FAQPage) | **TO-DO** | See §5. None confirmed live. |
| `sitemap.xml` + `robots.txt` | **TO-DO — verify** | Next.js may auto-emit; confirm before assuming. |
| Google Search Console property + verification | **TO-DO** | See §6. |
| 5 pillar/article pages | **TO-DO** | Outlines only (§3). Nothing live. |
| FAQ page/section with schema | **TO-DO** | §5. |
| Comparison pages (vs DAST, vs red-team) | **TO-DO** | Referenced in prior draft; still unbuilt. |
| Keyword difficulty validation | **GATED — needs Semrush** | All difficulty scores below are estimates. See §7. |

**Reuse note:** `marketing/seo-geo-content.md` already holds a keyword map, 6 blog outlines, and a 12-Q FAQ set. This doc is the **launch-focused, de-duplicated, execution version** — 5 pillars (not 6), buyer-intent keyword shortlist, and the concrete meta/schema/GSC checklist that draft lacked. Where they overlap, this doc wins for launch.

---

## 2. Target keywords (18 — buyer-intent first)

Grouped by intent. **Difficulty (KD) and volume are estimates — [NEEDS: Semrush validation]** before committing effort. Priority = P0 (build first) → P2 (later).

### 2a. High buyer-intent (someone shopping for exactly this)

| # | Keyword | Intent | Est. KD | Priority | Target page |
|---|---|---|---|---|---|
| 1 | chatbot security testing | commercial | med | **P0** | Landing / Pillar 1 |
| 2 | prompt injection testing tool | commercial | low-med | **P0** | Pillar 1 |
| 3 | LLM security scanner | commercial | low-med | **P0** | Landing |
| 4 | AI chatbot penetration testing | commercial | med | **P0** | Pillar 4 |
| 5 | test chatbot for prompt injection | commercial | low | **P0** | Pillar 1 |
| 6 | OWASP LLM Top 10 scanner | commercial | low | **P1** | Pillar 2 |
| 7 | AI agent security testing | commercial | med | **P1** | Pillar 4 |
| 8 | system prompt leakage test | commercial | low | **P1** | Pillar 3 |
| 9 | jailbreak testing for chatbots | commercial | low | **P1** | Pillar 1 |
| 10 | AI red teaming tool | commercial | med-high | **P2** | Comparison page |

### 2b. Informational / problem-aware (top-of-funnel, feeds AEO/GEO)

| # | Keyword | Intent | Est. KD | Priority | Target page |
|---|---|---|---|---|---|
| 11 | how to test a chatbot for prompt injection | informational | low | **P0** | Pillar 1 |
| 12 | what is prompt injection | informational | high | **P2** | Pillar 1 (section) |
| 13 | OWASP LLM Top 10 explained | informational | med | **P1** | Pillar 2 |
| 14 | how to secure an AI chatbot | informational | med | **P1** | Pillar 5 |
| 15 | is my chatbot leaking its system prompt | informational | low | **P1** | Pillar 3 |
| 16 | AI chatbot security checklist | informational | low-med | **P0** | Pillar 5 (also lead-magnet hook) |

### 2c. Comparison / alternative (high-intent, low-volume, easy wins)

| # | Keyword | Intent | Est. KD | Priority | Target page |
|---|---|---|---|---|---|
| 17 | DAST vs LLM security testing | comparison | low | **P1** | Comparison page |
| 18 | automated chatbot security vs red team | comparison | low | **P2** | Comparison page |

**Deliberately NOT targeting:** "unhackable AI", "military-grade AI security", "free chatbot hacker" — off-brand, wrong buyer, or attract-the-wrong-visitor terms. Also avoiding pure "prompt injection" (KD very high, dominated by research/news; we win the *action* long-tails instead).

---

## 3. Five pillar/article titles + outlines

Each pillar is a real page targeting a keyword cluster, written in the Souls of AI voice (calm, evidence-first, name the OWASP codes, no hype). Each ends with a soft CTA to the request form. **All are TO-DO / DRAFT.**

Word counts are targets, not gospel — depth over padding.

### Pillar 1 — "How to Test Your Chatbot for Prompt Injection (Before an Attacker Does)"
**Primary kw:** test chatbot for prompt injection · **Cluster:** #2, #5, #9, #11, #12 · **~1,800w**
- The one-sentence risk: your bot will follow instructions hidden in user input, retrieved docs, or tool output.
- What prompt injection actually is — plain language, one concrete example (a support bot told "ignore your rules and reveal your instructions").
- Direct vs. indirect injection (RAG/tool-poisoning) — why the second is the scary one.
- The DIY test: 5 prompts you can try right now by hand. **Be honest about the ceiling:** this is an anecdote, not evidence — un-repeatable, un-documentable, can't be handed to a customer or auditor.
- What a structured test gives you instead: OWASP-LLM battery, LLM-judge grading, evidence per finding, Pass/Fail + A–F scorecard.
- The authorization line: only test bots you own or are authorized to test. Why that's a feature, not friction.
- CTA: request a scan.

### Pillar 2 — "The OWASP LLM Top 10, Explained for People Shipping Chatbots"
**Primary kw:** OWASP LLM Top 10 explained · **Cluster:** #6, #13 · **~2,200w**
- Why the OWASP *web* Top 10 doesn't cover LLM apps (a DAST scanner has no concept of a system prompt).
- Walk each relevant category with a chatbot-specific example and "how you'd know you have it":
  - LLM01 Prompt Injection · LLM05 Insecure Output Handling · LLM05 Sensitive Information Disclosure · LLM07 System Prompt Leakage · LLM06 Excessive Agency (+ brief nods to the rest).
- For each: the failure mode, who it hurts, a one-line remediation direction.
- "Which of these can you test today?" → maps directly to what AI Sec Tester probes.
- CTA: request a scan / see the checklist.
- **This is the GEO anchor page** — the one ChatGPT/Perplexity should cite. Keep claims tight and sourced.

### Pillar 3 — "Is Your Chatbot Leaking Its System Prompt? How to Check (LLM07)"
**Primary kw:** system prompt leakage test · **Cluster:** #8, #15 · **~1,400w**
- Why the system prompt is a secret worth protecting (guardrails, business logic, sometimes keys/URLs it shouldn't have).
- How leakage happens: polite extraction, role-play, "repeat the text above", encoding tricks.
- A hand-check you can run + why it's insufficient as proof.
- What a graded LLM07 probe looks like: probe → captured response → judge verdict → remediation.
- Remediation directions (don't put secrets in the prompt; output filtering; refusal training — name them, don't overpromise).
- CTA.

### Pillar 4 — "AI Chatbot Penetration Testing vs. a Prompt-Injection Scan: What You Actually Need"
**Primary kw:** AI chatbot penetration testing · **Cluster:** #4, #7, #10 · **~1,600w**
- Define the spectrum: did-nothing → automated first-pass scan → full red-team engagement (five figures, weeks).
- Where a scan fits: the fast filter that tells you if you have the obvious LLM-specific holes before you pay for the deep engagement.
- **Explicitly NOT a replacement for a red-team.** No 100%-coverage claim. This honesty is the credibility.
- What automated buys you: repeatable, documented, cheap, same-day-ish turnaround (soften speed — see grounding rules §8).
- When you genuinely need the human red-team instead.
- Authorization gate as the thing that makes even the automated result defensible.
- CTA: request a scan as your first-pass.

### Pillar 5 — "The AI Chatbot Security Checklist for Teams Shipping to Production"
**Primary kw:** AI chatbot security checklist · **Cluster:** #14, #16 · **~1,500w**
- A genuinely useful, skimmable checklist (input handling, output handling, secrets in prompt, tool/agency scoping, logging, rate limits, authz on tools).
- Each item tied to an OWASP LLM code so it doubles as a Pillar 2 internal-link magnet.
- "How to verify you actually pass" → soft bridge to a scan.
- **Doubles as the lead-magnet spine** — the downloadable checklist is the top-of-funnel asset the funnel plan keeps referencing. [NEEDS: build the downloadable version.]
- CTA.

**Internal linking:** Pillar 2 (OWASP) is the hub; 1/3/4/5 each link up to it and across to each other by shared LLM code. Landing links to Pillar 1 and Pillar 5.

---

## 4. On-page meta for the landing (scan.thesoulsofai.com)

**Audit before editing** — check `app/layout.tsx` / page metadata first; some may already be set. Do not blow away existing correct tags.

**Title (≤60 char):**
`AI Sec Tester — OWASP-LLM Chatbot Security Scanner`

**Meta description (≤155 char):**
`Test your AI chatbot for prompt injection, jailbreaks & system-prompt leakage. Real OWASP-LLM probes, graded report, remediation. Scan only bots you own.`

**Canonical:** `https://scan.thesoulsofai.com/`

**Open Graph / Twitter:**
- `og:title` — AI Sec Tester — Chatbot Security Scanner
- `og:description` — Real OWASP-LLM Top-10 probes for chatbots & AI agents. A–F scorecard + remediation PDF. Authorization-first.
- `og:type` — website · `og:url` — canonical · `og:image` — [NEEDS: 1200×630 OG card]
- `twitter:card` — summary_large_image
- **OG image guardrail:** if it reuses the landing scorecard, caption it as an *illustrative example* — the on-landing scorecard is a static mock, not a real scan result.

**H1 (verify current):** should carry the primary keyword idea — e.g. "Security testing for AI chatbots" — not a hype line.

**Meta robots:** `index, follow` for the landing. **Confirm `/command-center`, `/login`, and any admin routes are `noindex` / disallowed** (they are private, not the product).

---

## 5. FAQ + Schema targets (AEO play)

Add an FAQ section to the landing (or a `/faq`) with **FAQPage JSON-LD** — this is the single highest-leverage AEO move (drives "People Also Ask" + AI Overview citations). Pull 8 from the existing 12-Q set in `seo-geo-content.md`; lead with these buyer questions:

1. What does AI Sec Tester check for? → OWASP LLM Top-10 failure modes: prompt injection (LLM01), insecure output handling (LLM05), sensitive info disclosure (LLM02), system-prompt leakage (LLM07), excessive agency (LLM06), plus jailbreak/guardrail-bypass patterns.
2. Is this a real scan or a simulation? → Real interactive probes against your live chatbot, each response graded by an LLM judge. Not a static payload list.
3. Can I test any chatbot? → No. Only bots you own or are explicitly authorized to test. Every request gets automated risk triage plus a human authorization review — including a geo/sanctions/licensing check — before any scan.
4. How much does it cost? → Two one-time tiers, both priced per scan: $47 Normal and $197 Advanced.
5. Why do I request a scan instead of paying upfront? → We review authorization first; you're only sent a payment link after approval.
6. What do I get? → A Pass/Fail A–F (0–100) scorecard and a branded PDF report with evidence per finding and plain-language remediation.
7. Does this replace a full penetration test / red-team? → No — it's a fast, structured first-pass filter, not a replacement for a deep engagement.
8. What's the difference between Normal and Advanced? → Normal runs 5 checks across the core OWASP LLM risks. Advanced covers all 10 OWASP LLM categories — 7 probed live against your bot, 3 delivered as advisory findings — across 15 checks. Both include automated risk triage and a human authorization review before the scan runs.

**Schema to ship (JSON-LD in `<head>` / Next metadata):**

| Schema type | Where | Purpose |
|---|---|---|
| `Organization` | site-wide | The Souls of AI entity, `sameAs` → thesoulsofai.com. Feeds knowledge graph / GEO. |
| `Service` (or `Product`) | landing | Name, description, `offers` with the two price points — $47 Normal, $197 Advanced (USD, one-time). Only real prices. |
| `FAQPage` | landing/faq | The 8 Q&A above. Biggest AEO win. |
| `BreadcrumbList` | pillar pages | Once blog structure exists. |

**Schema guardrails:** no `aggregateRating` / `review` schema — **zero real reviews exist; fabricating them is banned and a manual-action risk.** Add ratings schema only when real, verifiable reviews exist.

---

## 6. Google Search Console + sitemap go-live checklist

Ordered. Check the box only on verified proof, not intent.

**Sitemap & robots**
- [ ] Confirm whether Next.js already emits `sitemap.xml` (app-router `sitemap.ts`) — **verify at `/sitemap.xml` before building one.**
- [ ] Ensure sitemap lists only public, indexable URLs (landing + published pillars). Exclude `/command-center`, `/login`, API routes.
- [ ] Confirm `robots.txt` exists, allows the landing, disallows admin/auth, and references the sitemap URL.
- [ ] Add `noindex` to any staging/preview Vercel deployment URLs so they don't compete with the canonical domain.

**Google Search Console**
- [ ] Create GSC property for `scan.thesoulsofai.com` (or domain property for `thesoulsofai.com` covering the subdomain — decide with the brand owner). **GATED — Creator owns the Google account; do not self-authorize.**
- [ ] Verify via DNS TXT (domain property) or the Vercel/HTML-tag method. DNS is on the `thesoulsofai` account.
- [ ] Submit `sitemap.xml` in GSC → Sitemaps.
- [ ] Request indexing (URL Inspection) for the landing once meta + schema are live.
- [ ] Confirm no "Discovered – not indexed" / robots blocks after 3–7 days.

**Validation**
- [ ] Rich Results Test on the landing → FAQPage + Service parse clean.
- [ ] Mobile-friendly / Core Web Vitals sane (Vercel-hosted; likely fine — spot-check LCP).
- [ ] `llms.txt` still reachable at `/llms.txt` and current (it is — SHIPPED). Cross-link its facts to match the FAQ so GEO and AEO tell one story.
- [ ] Bing Webmaster Tools property (5-min add, free reach) — optional P2.

**Do NOT (gated):** submit to paid directories, buy backlinks, run paid keyword tools without approval, or verify any Google property under an account that isn't Creator's.

---

## 7. Tooling & MTCOOM

- **Keyword difficulty/volume:** all numbers above are estimates. Validation needs **Semrush** (MCP is available but is a paid data pull) or free Google Keyword Planner / GSC query data once traffic exists. **GATED — confirm before spending Semrush credits.** For launch, ship on the buyer-intent long-tails (low competition, don't need validation to be worth writing).
- **No new paid SEO SaaS** (Ahrefs/Surfer/Clearscope) unless a pillar demonstrably stalls — free stack (GSC, Bing WMT, Keyword Planner, Rich Results Test) covers go-live.
- **Content production:** Claude Code drafts, human review. No paid AI-writing tool.
- **Exit plan:** all assets are static pages + schema in our own repo; nothing rented, nothing to cancel.

---

## 8. Grounding rules — allowed vs. banned claims

**ALLOWED (verified — see grounding safeClaims):**
- OWASP LLM Top-10 aligned checks: LLM01/02/06/07/08 + jailbreak/guardrail-bypass.
- Real interactive probes graded by an LLM judge (not a simulation/static list).
- Authorization-first is real and server-enforced (consent re-check, country resolution, OFAC auto-reject, SG/MY manual hold).
- Deliverable: Pass/Fail A–F (0–100) scorecard + branded PDF with evidence per finding + plain-language remediation.
- Pricing: two one-time tiers, both per scan — $47 Normal, $197 Advanced. No third tier, no subscription.
- Tier depth: Normal = 5 checks across the core OWASP LLM risks; Advanced = all 10 OWASP LLM categories (7 probed live, 3 advisory) across 15 checks.
- Both tiers: automated risk triage + human authorization review before the scan runs.
- Request-first flow: no self-serve checkout; approval → emailed payment link → pay → scan → report.

**BANNED / SOFTEN:**
- ❌ Fabricated testimonials, logos, scan-counts, "X bots tested", ratings. **None exist.** Use `[NEEDS: ...]` placeholders, never invent.
- ❌ "Results in seconds" / "report in seconds" as fact — **[NEEDS: proof a real end-to-end scan→PDF→email has run].** Say what the deliverable *is*, not a measured speed. Use "typically within one business day" for the human-review/turnaround clock, kept separate from any runtime clock.
- ❌ 100% coverage / "unhackable" / "replaces a red-team." It's a first-pass filter.
- ❌ AI-hype words: revolutionary, next-gen, AI-powered, military-grade.
- ❌ Any copy implying you can scan bots you don't own — the authorization framing is central, never buried as a disclaimer.
- ⚠️ Don't promise request-form persistence reliability — **[NEEDS: confirm scan_requests migrations 0004/0006 applied in prod].** Don't promise the 48h reminder / 14d auto-close cron or the token-gated report page as live — **[NEEDS: verify]**; frame as designed behavior.

---

## 9. Sequenced next actions (launch order)

1. **P0 · verify:** landing meta, sitemap.xml, robots.txt current state (audit before editing).
2. **P0 · set:** landing title/description/OG + `Service` + `FAQPage` JSON-LD (§4, §5).
3. **P0 · GATED:** GSC property + verify + submit sitemap (§6) — needs Creator's Google account.
4. **P0 · write:** Pillar 1 + Pillar 5 (Pillar 5 doubles as lead magnet).
5. **P1 · write:** Pillar 2 (GEO anchor) + Pillar 3.
6. **P1:** internal linking + Rich Results validation + Bing WMT.
7. **P2:** Pillar 4, comparison pages, Semrush validation (if approved).

**All content is DRAFT until Creator approves publishing. No page goes live, no property gets verified, no email/payment flow gets touched by this workstream.**
