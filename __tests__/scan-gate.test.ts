/**
 * scan-gate.test.ts — abuse-case coverage for the deterministic activation gate
 * (lib/scan-gate.ts). Pure functions only; no network, no DB. Proves:
 *
 *   1. A third-party target is rejected until ownership is proven.
 *   2. SSRF payloads (127.0.0.1, 169.254.169.254 metadata, RFC1918) are rejected.
 *   3. Activation is false unless ALL of ownershipVerified + ssrfSafe +
 *      sanctionsOk + paid are true.
 *   4. Injection strings / non-boolean inputs cannot flip the decision open.
 *   5. The sanctions sub-check denies deny-listed countries and safely skips
 *      missing/garbage signals without crashing the gate.
 *
 * Run: bun test __tests__/scan-gate.test.ts
 */
import { test, expect } from "bun:test";
import {
  decideActivation,
  sanctionsCheck,
  ssrfSafeTarget,
  type ActivationInput,
} from "../lib/scan-gate";

// Keep the SSRF guard fully offline/deterministic (no geo-IP HTTP calls).
process.env.DISABLE_TARGET_GEOLOOKUP = "true";

// ── 1. Third-party target rejected until ownership proven ──────────────────────
test("third-party target is not activated until ownership is verified", () => {
  // Attacker submits a victim endpoint they do NOT control: ssrf-safe, paid,
  // not sanctioned — but ownership unproven. Must NOT activate.
  const unproven = decideActivation({
    ownershipVerified: false,
    ssrfSafe: true,
    sanctionsOk: true,
    paid: true,
  });
  expect(unproven.activate).toBe(false);
  expect(unproven.reason).toContain("ownership");

  // Same request once ownership is proven → activates.
  const proven = decideActivation({
    ownershipVerified: true,
    ssrfSafe: true,
    sanctionsOk: true,
    paid: true,
  });
  expect(proven.activate).toBe(true);
});

// ── 2. SSRF payloads rejected ──────────────────────────────────────────────────
test("SSRF payloads (loopback, metadata, RFC1918) are rejected by the guard", async () => {
  const loopback = await ssrfSafeTarget("http://127.0.0.1/");
  const metadata = await ssrfSafeTarget("http://169.254.169.254/latest/meta-data/");
  const rfc1918 = await ssrfSafeTarget("http://10.0.0.5/");
  const linkLocalV6 = await ssrfSafeTarget("http://[fe80::1]/");

  expect(loopback.ok).toBe(false);
  expect(metadata.ok).toBe(false);
  expect(rfc1918.ok).toBe(false);
  expect(linkLocalV6.ok).toBe(false);

  // And an SSRF-unsafe target cannot activate even with everything else true.
  expect(
    decideActivation({
      ownershipVerified: true,
      ssrfSafe: metadata.ok, // false
      sanctionsOk: true,
      paid: true,
    }).activate,
  ).toBe(false);
});

// ── 3. Activation requires ALL four conditions ─────────────────────────────────
test("activation is false unless all four conditions are true", () => {
  const allTrue: ActivationInput = {
    ownershipVerified: true,
    ssrfSafe: true,
    sanctionsOk: true,
    paid: true,
  };
  expect(decideActivation(allTrue).activate).toBe(true);

  // Flip each single condition to false → must not activate.
  for (const key of Object.keys(allTrue) as (keyof ActivationInput)[]) {
    const oneFalse = { ...allTrue, [key]: false };
    expect(decideActivation(oneFalse).activate).toBe(false);
  }
});

// ── 4. Injection / non-boolean inputs cannot flip the decision ─────────────────
test("injection strings and non-boolean truthy values cannot open the gate", () => {
  const payloads: unknown[] = [
    "true",
    "1",
    1,
    "'; DROP TABLE scans;--",
    { valueOf: () => true },
    [true],
    "yes",
  ];

  for (const p of payloads) {
    const decision = decideActivation({
      ownershipVerified: p,
      ssrfSafe: p,
      sanctionsOk: p,
      paid: p,
    } as unknown as ActivationInput);
    expect(decision.activate).toBe(false);
  }

  // Malformed / missing input object also fails closed.
  expect(decideActivation(undefined as unknown as ActivationInput).activate).toBe(false);
  expect(decideActivation({} as ActivationInput).activate).toBe(false);
});

// ── P2 wiring: deep-scan activation is denied on any missing input ─────────────
test("deep-scan gate denies when ownershipVerified / paid / ssrfSafe is false", () => {
  const base: ActivationInput = {
    ownershipVerified: true,
    ssrfSafe: true,
    sanctionsOk: true,
    paid: true,
  };
  expect(decideActivation({ ...base, ownershipVerified: false }).activate).toBe(false);
  expect(decideActivation({ ...base, ssrfSafe: false }).activate).toBe(false);
  expect(decideActivation({ ...base, paid: false }).activate).toBe(false);
  // All present → the deep-scan route proceeds to create the checkout.
  expect(decideActivation(base).activate).toBe(true);
});

// ── 5. Sanctions sub-check ─────────────────────────────────────────────────────
test("sanctions sub-check denies deny-listed countries, skips unknown signals safely", () => {
  expect(sanctionsCheck("IR").ok).toBe(false);
  expect(sanctionsCheck("kp").ok).toBe(false); // case-insensitive
  expect(sanctionsCheck("US").ok).toBe(true);
  expect(sanctionsCheck(null).ok).toBe(true); // no signal → skip, not deny
  expect(sanctionsCheck("'; DROP TABLE").ok).toBe(true); // garbage → skip, no crash
  expect(sanctionsCheck("").ok).toBe(true);
});
