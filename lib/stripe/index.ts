import Stripe from "stripe";

/**
 * Stripe client — settlement/webhook only.
 *
 * Checkout is NATIVE Stripe payment links (lib/payment-links.ts). The earlier
 * Scalendo/FastPayDirect links were retired 2026-07-13 because they settled via
 * PaymentIntents and never emitted checkout.session.completed. This app does NOT
 * create its own Checkout/Portal sessions; the only Stripe SDK surface kept here
 * is webhook signature verification, used by app/api/stripe/webhooks to turn a
 * settled payment into a scan dispatch.
 *
 * STRIPE_SECRET_KEY is NOT required for webhook verification. The previous
 * comment here claimed it was, which is wrong and would send someone hunting a
 * phantom blocker: `constructEvent` is a SYNCHRONOUS HMAC-SHA256 comparison over
 * the raw payload using STRIPE_WEBHOOK_SECRET. It performs no network call — it
 * cannot, being synchronous — so it never authenticates with the secret key.
 * Confirmed live 2026-08-01: production reports stripeKeyPresent=false and
 * webhookSecretPresent=true via /api/health, and the settlement path is intact.
 *
 * The secret key WOULD be needed the moment anything here calls the Stripe API
 * (creating sessions, refunds, retrieving objects). Nothing does today. If that
 * changes, the placeholder below becomes a live failure, so set the real key
 * before adding the first API call.
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
