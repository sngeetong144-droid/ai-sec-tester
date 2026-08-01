import { describe, expect, it, afterEach, mock } from "bun:test";

// `server-only` is a Next build-time marker with no npm package; stub it (repo pattern).
mock.module("server-only", () => ({}));

/**
 * The paid path dies silently without STRIPE_WEBHOOK_SECRET: signature
 * verification fails, the route returns 400, and Stripe does NOT retry a 400 -
 * the sale is lost with no error anywhere. /api/health must therefore report
 * whether the secret is present.
 *
 * A test that only asserts `payment.webhookSecretPresent === true` would pass
 * against a hardcoded `true`. So each case is proven in BOTH directions: unset
 * must report false. That is what makes the green reading mean something.
 */
async function readHealth() {
  const mod = await import("../app/api/health/route");
  const res = mod.GET();
  return (await res.json()) as {
    payment?: { webhookSecretPresent?: unknown; stripeKeyPresent?: unknown };
  };
}

const ORIGINAL = {
  hook: process.env.STRIPE_WEBHOOK_SECRET,
  key: process.env.STRIPE_SECRET_KEY,
};

afterEach(() => {
  if (ORIGINAL.hook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL.hook;
  if (ORIGINAL.key === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = ORIGINAL.key;
});

describe("/api/health payment block", () => {
  it("exposes the payment block at all", async () => {
    const body = await readHealth();
    expect(body.payment).toBeDefined();
    expect(typeof body.payment?.webhookSecretPresent).toBe("boolean");
    expect(typeof body.payment?.stripeKeyPresent).toBe("boolean");
  });

  it("reports FALSE when the webhook secret is absent", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const body = await readHealth();
    expect(body.payment?.webhookSecretPresent).toBe(false);
  });

  it("reports TRUE when the webhook secret is present", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_probe_value_not_a_real_secret";
    const body = await readHealth();
    expect(body.payment?.webhookSecretPresent).toBe(true);
  });

  it("reports FALSE when the stripe key is absent", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const body = await readHealth();
    expect(body.payment?.stripeKeyPresent).toBe(false);
  });

  it("never leaks the secret VALUE, only the boolean", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_probe_value_not_a_real_secret";
    const mod = await import("../app/api/health/route");
    const raw = await mod.GET().text();
    expect(raw).not.toContain("whsec_probe_value_not_a_real_secret");
    expect(raw).toContain("webhookSecretPresent");
  });
});