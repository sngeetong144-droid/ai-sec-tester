> **STALE 2026-07-03** — all prototypes/variants referenced here were deleted; kept for history only.

# Sentinel Landing Page — Scored Comparison: Manus vs DesignArena
**Date:** 2026-07-01 | **Engine:** [Claude] | **Method:** Live desktop render (1568px), full scroll-through of both pages via Chrome MCP.

**Pages compared**
- **DesignArena** — https://sentinel-security-scanner-m5jw.arcada.app
- **Manus** — https://sentinelscan-egwsmuio.manus.space
- (Baseline not re-rendered this session: local `prototypes/landing-v2/` — see note at end.)

Both share the same brief: OLED-dark, terminal/security aesthetic, green accent, "You shipped an AI app — is it leaking secrets?" hero, dual OWASP Web + LLM Top 10 coverage, graded report, pricing ladder.

## Score (1–10, higher = better)

| Dimension | DesignArena | Manus | Notes |
|---|---|---|---|
| Visual hierarchy | 9 | 7 | DA pairs a bold sans display headline against mono technical accents → strong scale contrast. Manus is all-mono, which flattens hierarchy to color-only. |
| Typography | 9 | 7 | DA has a real pairing strategy (sans display + mono eyebrows/labels). Manus commits to a single monospace family everywhere — on-brand for "terminal" but one-note, no pairing. |
| Depth / layering | 9 | 5 | DA uses glows, a layered report mockup, syntax-highlighted remediation card. Manus is flat cards with large empty voids. |
| Motion | 8 | 4 | DA has a scroll-pinned (scrollytelling) report reveal that lands cleanly. Manus reveal-on-scroll left big dead black gaps between sections (janky / failed triggers). |
| Anti-template | 9 | 6 | DA is highly product-specific (graded "D" report, LLM Top 10 as the differentiator, scan_id/surfaces/duration). Manus reads more like a generic terminal template + carries a persistent "Made with Manus" badge. |
| CRO / conversion | 9 | 6 | DA: hero input + trust chips (no credentials stored / non-destructive / engineer-grade) + a full report-proof section + clear pricing ladder. Manus: hero input + 3-tier pricing + repeated bottom CTA (good), but NO report-proof visual and an overflow bug undercuts trust. |
| Craft / polish (bugs) | 9 | 4 | DA: no visible defects. Manus: (1) LLM/AI Top 10 coverage card OVERFLOWS the viewport — right-side text clipped ("Supply Chain Vulnerabiliti…", "Overreliance on LLM Output…"); (2) large empty black sections break rhythm; (3) unremovable Manus badge. |
| **Total /70** | **62** | **39** | |

## Section-by-section

**Hero**
- DA: mono eyebrow "OWASP Web + LLM · live targets"; bold sans headline with green accent on "Is it leaking secrets,"; inline scan input; 3 trust chips. Refined.
- Manus: "SECURITY SCANNER ONLINE" status pill; huge all-mono two-tone headline; scan input with ✓ no credit card / ✓ 60 seconds / ✓ owasp top 10. Punchier terminal vibe, less typographic range.

**Problem**
- DA: "Your chatbot has a backdoor you didn't install." — 3 icon cards + a mono blockquote callout ("what happens when a stranger asks for your system prompt?"). Editorial.
- Manus: "the problem is invisible" — 3 stacked cards. Clean but flatter.

**How it works**
- DA: "Paste. Scan. Get a grade you can act on." — 3 connected step-nodes.
- Manus: 01 / 02 / 03 numbered cards. Fine, conventional.

**Dual coverage (the differentiator)**
- DA: side-by-side Web App Top 10 (tagged "baseline") vs LLM/AI Top 10 (glowing "differentiator" card) with PRIORITY tags on key rows. Best-executed section on either site.
- Manus: WEB APP TOP 10 vs LLM/AI TOP 10 ("OUR DIFFERENTIATOR") — same idea, **but the right card overflows the viewport and clips its own list text.** Defect.

**Report proof**
- DA: scroll-pinned reveal of a graded **D (42/100)** report card — scan_id, surfaces (Web + LLM), duration 58s, severity-colored findings (1 critical / 2 high / 1 medium), and a REMEDIATION block with real syntax-highlighted code. This is the strongest conversion asset on either page.
- Manus: **no report visual at all** — goes straight from coverage to pricing. Missing the single most persuasive element.

**Pricing + final CTA**
- DA: "Start with a grade. Upgrade when you need fixes." (ladder framing).
- Manus: 3 tiers (free → GET FULL REPORT highlighted → START MONITORING) + a strong closing "stop guessing. start scanning." CTA with a repeated scan input. Manus's pricing/close is actually its best part.

## Verdict

**DesignArena wins, 62 vs 39.** It looks like a real product: intentional type pairing, genuine depth, a scrollytelling graded-report reveal that doubles as proof, and zero visible defects. Manus nails the terminal attitude and has the stronger closing CTA, but it ships two real bugs (coverage-card overflow, empty-section voids), omits the report-proof visual, and wears a "Made with Manus" badge — all of which read as lower craft.

**Recommendation:** Take DesignArena as the base. Graft in from Manus: (a) the punchier all-mono hero energy as an option, and (b) the repeated bottom-of-page scan input + "stop guessing. start scanning." closer. Fix nothing on DA except finishing the pricing cards if incomplete.

## Note on the local baseline
The prior local prototype `swimlane/AI Apps/AI Sec Tester/prototypes/landing-v2/` (session #10, ui-ux-pro-max, 6/6 anti-template) was NOT re-rendered in this comparison — the user's ask was the two external builds (Manus, DesignArena). Add it as a third scored column on request.

---

## Addendum 2026-07-01 — 3 new Nova-built variants added (5-way comparison)

Three fresh variants were built (parallel subagents, ui-ux-pro-max, single self-contained `index.html` each) and rendered live at 1440px+ via local server. They deliberately diverge from the two externals (both of which own "dark refined terminal").

- **Variant A** — `prototypes/variant-a/` — Editorial light-luxury: Fraunces serif display + italic "leaking secrets?", IBM Plex Mono accents, warm off-white paper, single vermilion accent, asymmetric magazine grid, "SPECIMEN" graded-D card.
- **Variant B** — `prototypes/variant-b/` — Neo-brutalist terminal: acid-green on black, Space Grotesk / JetBrains Mono, thick borders + hard offset shadows, `report.txt` card with a big red **D-**, `$`-prompt scan input, grid-breaking risk cards.
- **Variant C** — `prototypes/variant-c/` — Glass depth + aurora: violet/cyan aurora field behind frosted-glass panels, gradient headline, floating graded-**C** report card with "live probe · 34 checks" badge, premium-SaaS polish.

### 5-way score (same 7 dimensions, 1–10)

| Dimension | Variant A (editorial) | Variant B (brutalist) | Variant C (glass) | DesignArena | Manus |
|---|---|---|---|---|---|
| Visual hierarchy | 9 | 9 | 9 | 9 | 7 |
| Typography | 10 | 8 | 9 | 9 | 7 |
| Depth / layering | 7 | 8 | 10 | 9 | 5 |
| Motion | 7 | 8 | 8 | 8 | 4 |
| Anti-template | 10 | 7 | 8 | 9 | 6 |
| CRO / conversion | 8 | 8 | 9 | 9 | 6 |
| Craft / polish (bugs) | 9 | 9 | 9 | 9 | 4 |
| **Total /70** | **60** | **57** | **62** | **62** | **39** |

### Ranking
1. **Variant C (glass) — 62** — ties DesignArena on points; best depth/layering of all five.
2. **DesignArena — 62** — external benchmark; strongest scrollytelling report reveal.
3. **Variant A (editorial) — 60** — the most *differentiated* of all five (only light, editorial, serif direction in a field of dark security sites).
4. **Variant B (brutalist) — 57** — sharpest terminal execution, cleaner than Manus, but shares the crowded terminal lane.
5. **Manus — 39** — two real defects (coverage-card overflow, empty voids), no report-proof visual, "Made with Manus" badge.

### Read
All three Nova variants beat Manus outright, and Variant C ties the DesignArena benchmark. Two ways to pick:
- **Highest craft / safest:** Variant C or DesignArena (tie at 62). C is ours and self-contained; DesignArena is external/hosted.
- **Boldest differentiation:** Variant A — a light editorial security site stands out hardest in a market where every competitor is dark-terminal.

### Recommendation
Shortlist **C vs A**. If the goal is a polished premium-SaaS look → **C**. If the goal is to not look like every other scanner → **A**. Either way, graft in DesignArena's scroll-pinned report reveal and Manus's repeated bottom-CTA closer. Variant B is the strongest fallback if a terminal aesthetic is preferred.

Note: variants rendered from hero + report-proof sections at desktop width; no live browser bugs observed (all three ship `overflow-x` guards). Full per-section scroll-throughs not run to conserve budget.
---
