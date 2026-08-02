/**
 * payment-links.ts — canonical tier → NATIVE STRIPE payment-link map.
 *
 * These are PUBLIC checkout URLs (shareable by design) — NOT secret keys. They
 * are the single source of truth for the "Products & links" console surface and
 * the {{payLink}} merge token in the approval email.
 *
 * MIGRATED 2026-07-13 off FastPayDirect/Scalendo. Those links were GoHighLevel-
 * hosted and settled through a Connect app that creates PaymentIntents directly —
 * they NEVER produced a `checkout.session.completed` event, so the settlement
 * webhook could not fire and auto-dispatch was structurally impossible. Native
 * Stripe payment links do emit that event and forward ?client_reference_id, which
 * is what app/api/stripe/webhooks matches on.
 *
 * Each link carries metadata.tier on the Stripe side, so the purchased tier is a
 * property of the payment and cannot be forged by the buyer.
 *
 * GATE REMINDER: storing/serving these is LOCAL config. Actually emailing a
 * link to a customer (outbound send) and taking payment are gated live actions
 * — do not auto-send.
 */

/**
 * Every tier the system can GRADE, including retired ones. Historical rows keep
 * their original plan string forever, so this union may only ever grow.
 */
export type ScanTier = "basic" | "advanced" | "enterprise";

/**
 * The tiers a customer can actually BUY today. Ruling R-15 (2026-08-02) retired
 * Enterprise: `testsForTier` returned an identical 15-check set for advanced and
 * enterprise, and every remaining Enterprise bullet was delivered to all tiers, so
 * $497 bought exactly what $197 bought.
 *
 * Buying surfaces SHALL iterate this, never Object.keys(PAYMENT_LINKS).
 */
export type SellableTier = "basic" | "advanced";
export const SELLABLE_TIERS: readonly SellableTier[] = ["basic", "advanced"] as const;

export function isSellable(tier: ScanTier): tier is SellableTier {
  return (SELLABLE_TIERS as readonly ScanTier[]).includes(tier);
}

export interface TierPaymentLink {
  tier: ScanTier;
  label: string;
  priceUsd: number;
  url: string;
  /**
   * Set on tiers withdrawn from sale. The entry STAYS in the map — see the
   * retirement note on PAYMENT_LINKS.enterprise for why deleting it is unsafe.
   */
  retired?: true;
}

export const PAYMENT_LINKS: Record<ScanTier, TierPaymentLink> = {
  basic: {
    tier: "basic",
    label: "Normal — $47",
    priceUsd: 47,
    // plink_1TscyqIkRttsy2y6XTKiVNm4 — metadata.tier = "normal"
    url: "https://buy.stripe.com/eVqcN58uZ7NK2XAe1A1Jm02",
  },
  advanced: {
    tier: "advanced",
    label: "Advanced — $197",
    priceUsd: 197,
    // plink_1TscytIkRttsy2y6pmGyAutb — metadata.tier = "advanced"
    url: "https://buy.stripe.com/cNi14n4eJ2tq1TwbTs1Jm03",
  },
  // RETIRED 2026-08-02 by ruling R-15. Withdrawn from every buying surface, but
  // DELIBERATELY still present here. Two reasons, both load-bearing:
  //
  //  1. UNDERPAYMENT GUARD. markRequestPaid (app/actions/scan-request-lifecycle.ts)
  //     computes `expectedCents = link ? link.priceUsd * 100 : 0` and only enforces
  //     the check `if (expectedCents > 0)`. Deleting this key makes
  //     resolvePaymentLink("Enterprise — $497") return null, expectedCents 0, and
  //     the guard FAILS OPEN — a $47 checkout would settle a $497 request. The
  //     retirement must not reopen the very hole that guard was built to close.
  //  2. DEFENCE IN DEPTH for any stale Enterprise plan string. The three rows that
  //     used to carry one were PURGED on 2026-08-02 (Creator: test traffic - own
  //     email, company "Test Inc", own target, and paid_at/paid_amount_cents/
  //     stripe_session_id all NULL, so no payment ever settled). Zero remain
  //     [VERIFIED: count query]. The key stays anyway: it costs nothing, and it is
  //     what stops reason 1 from becoming live again if any such row reappears.
  //
  // The live Stripe payment link itself is UNTOUCHED — R-11 says the three links are
  // live, and retiring a tier is not authorisation to modify Stripe.
  enterprise: {
    tier: "enterprise",
    label: "Enterprise — $497",
    priceUsd: 497,
    retired: true,
    // plink_1Tscz2IkRttsy2y6nuAluBgs — metadata.tier = "enterprise"
    url: "https://buy.stripe.com/8x26oHbHb0ligOqcXw1Jm04",
  },
};

/** Resolve a payment link from a tier code or a form plan string ("Advanced — $197"). */
export function resolvePaymentLink(planOrTier: string | null | undefined): TierPaymentLink | null {
  if (!planOrTier) return null;
  const s = planOrTier.toLowerCase();
  if (s.includes("enterprise") || s.includes("497")) return PAYMENT_LINKS.enterprise;
  if (s.includes("advanced") || s.includes("197")) return PAYMENT_LINKS.advanced;
  if (s.includes("basic") || s.includes("normal") || s.includes("47")) return PAYMENT_LINKS.basic;
  return null;
}
