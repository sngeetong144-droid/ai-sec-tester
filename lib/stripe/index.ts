import Stripe from "stripe";

/**
 * Stripe client — settlement/webhook only.
 *
 * Checkout is Scalendo payment links (lib/payment-links.ts); Stripe sits behind
 * Scalendo as the settlement backend. This app therefore does NOT create its own
 * Stripe Checkout/Portal sessions. The only Stripe SDK surface kept here is
 * webhook signature verification, used by app/api/stripe/webhooks to turn a
 * settled payment into a command-center case activation.
 *
 * STRIPE_SECRET_KEY is still required at runtime for webhook verification.
 */
// Fall back to a placeholder so `new Stripe()` doesn't throw at build time when
// STRIPE_SECRET_KEY isn't configured. Real webhook verification still requires a
// valid key at runtime — this only keeps `next build` from crashing while
// collecting page data. Use || (not ??) so a defined-but-empty env var still
// falls back to the placeholder instead of crashing `new Stripe("")`.
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_build_only",
  {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  },
);

// ─── Webhook ──────────────────────────────────────────────────────────────────

export function constructWebhookEvent(payload: string, signature: string) {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );
}
