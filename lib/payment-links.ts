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

export type ScanTier = "basic" | "advanced" | "enterprise";

export interface TierPaymentLink {
  tier: ScanTier;
  label: string;
  priceUsd: number;
  url: string;
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
  enterprise: {
    tier: "enterprise",
    label: "Enterprise — $497",
    priceUsd: 497,
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
