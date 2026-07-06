/**
 * payment-links.ts — canonical tier → FastPayDirect payment-link map.
 *
 * These are PUBLIC checkout URLs (shareable by design, like Stripe payment
 * links) — NOT secret keys. They are the single source of truth for the
 * "Products & links" console surface and the {{payLink}} merge token in the
 * approval email. Provided by Creator 2026-07-06.
 *
 * GATE REMINDER: storing/serving these is LOCAL config. Actually emailing a
 * link to a customer (outbound send) and taking payment are gated live actions
 * — do not auto-send. The approval flow must stay behind the human/MFA gate and
 * the AI Sec Tester launch-block (T-07) until Creator lifts it.
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
    url: "https://link.fastpaydirect.com/payment-link/6a2d547c03b17c94f57161ea",
  },
  advanced: {
    tier: "advanced",
    label: "Advanced — $197",
    priceUsd: 197,
    url: "https://link.fastpaydirect.com/payment-link/6a2d578503b17c94f57161ee",
  },
  enterprise: {
    tier: "enterprise",
    label: "Enterprise — $497",
    priceUsd: 497,
    url: "https://link.fastpaydirect.com/payment-link/6a2d57be71a0aa761e464949",
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
