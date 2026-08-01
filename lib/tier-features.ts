import type { ScanTier } from "@/lib/payment-links";

/**
 * The marketing feature bullets shown per tier — ONE definition, two surfaces.
 *
 * Prices, tier ids and payment links are NOT here: lib/payment-links.ts is and
 * remains the source of truth for those. This module owns only the bullet copy,
 * which was previously byte-identical in three places (the public landing page,
 * the admin products console, and a dead component that was imported nowhere).
 * That triplication is not academic — a fix was once applied to the dead copy,
 * shipped green, and left the live pages unchanged.
 *
 * Presentation that legitimately DIFFERS per surface (unit strings, CTA text,
 * badge/mode text, product links) deliberately stays in each page. Only the
 * shared claim list lives here, so a claim can be corrected in one place.
 *
 * TRUTHFULNESS: every bullet is a claim to a paying customer. Before adding one,
 * confirm the code actually does it. `lib/scan-engine.ts` testsForTier() is the
 * server truth for how many checks a tier runs; these bullets are prose ABOUT
 * that and are not derived from it, so they can drift — check both when editing.
 */
export const TIER_FEATURES: Record<ScanTier, readonly string[]> = {
  basic: [
    "5 OWASP LLM checks",
    "Pass/Fail scorecard",
    // Was "Priority scan processing". Nothing prioritised anything — the dispatcher
    // had no ORDER BY at all, so the queue was not even FIFO (fixed in the same
    // change). Replaced with a claim the code backs: settlement triggers dispatch
    // with no human step. Measured on request 7fdd21ea, 2026-08-01 — paid to
    // delivered PDF in under four minutes.
    "Scan starts automatically after payment",
    "Branded PDF audit report",
    "Evidence per finding + remediation",
  ],
  advanced: [
    "Everything in Normal",
    "Full OWASP LLM Top-10 coverage",
    "Deeper probes per category",
    "PDF reports emailed automatically",
  ],
  enterprise: [
    "Everything in Advanced",
    "Authorization + identity verification",
    "Automated risk triage (score + flags)",
    "Human review before scan runs",
    "Full report + 1 free re-scan after fixes",
    "Secure token-gated report page",
  ],
} as const;