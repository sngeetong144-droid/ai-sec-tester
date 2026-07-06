/**
 * scan-gate.ts — deterministic request-authorization gate for active scans.
 *
 * Pure functions, no I/O, no LLM in the decision path. The gate is
 * OWNERSHIP-FIRST: a request is authorized on proof the requestor controls the
 * target (see lib/ownership-verification.ts), NOT on the requestor's country.
 * Country is demoted to a minor OFAC/sanctions sub-check here — one input to
 * the gate, never the basis for it.
 *
 * The fatal flaw this closes: without ownership proof, a malicious actor can
 * point our scanner at a third party's endpoint and weaponize it against a
 * victim. `decideActivation` will not activate unless ownership is proven.
 */

import { assertPublicTarget, type ProbeOptions } from "@/lib/probe";

// ── OFAC-style sanctions sub-check (stub) ──────────────────────────────────────
//
// ponytail: static deny-list stub, not a live OFAC/SDN feed. Swap the set for a
// real sanctions data source when compliance wires one. This is a SUB-CHECK —
// it can only deny; it is never sufficient to authorize on its own.
export const SANCTIONED_COUNTRY_CODES: ReadonlySet<string> = new Set([
  "CU", // Cuba
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
  "RU", // Russia
  "BY", // Belarus
]);

export interface SubCheckResult {
  ok: boolean;
  reason: string;
}

/**
 * OFAC-style deny-list sub-check. A missing or uninterpretable country signal
 * is NOT a denial (fail-open by design — this is a minor sub-check, and the
 * gate never activates on it alone). Only a positive deny-list hit fails.
 */
export function sanctionsCheck(countryCode: string | null | undefined): SubCheckResult {
  if (countryCode == null) {
    return { ok: true, reason: "no country signal; sanctions sub-check skipped" };
  }
  const code = String(countryCode).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return { ok: true, reason: "uninterpretable country code; sanctions sub-check skipped" };
  }
  if (SANCTIONED_COUNTRY_CODES.has(code)) {
    return { ok: false, reason: `target country ${code} is on the sanctions deny-list` };
  }
  return { ok: true, reason: `country ${code} not on sanctions deny-list` };
}

// ── SSRF / target allowlist guard (boolean wrapper) ────────────────────────────
//
// The real guard is assertPublicTarget (lib/probe.ts): rejects loopback,
// RFC1918 private ranges, link-local incl. 169.254.169.254 metadata, CGNAT,
// IPv6 ULA/link-local, and hosts that resolve to any of the above. This wraps
// it into the boolean the gate consumes, so callers don't re-implement the
// try/catch. Async because DNS resolution of a hostname is inherently async.
export async function ssrfSafeTarget(
  rawUrl: string,
  options: ProbeOptions = {},
): Promise<SubCheckResult> {
  try {
    await assertPublicTarget(rawUrl, options);
    return { ok: true, reason: "target resolved to a public address" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "target rejected by SSRF guard" };
  }
}

// ── Deterministic activation decision ──────────────────────────────────────────

export interface ActivationInput {
  ownershipVerified: boolean;
  ssrfSafe: boolean;
  sanctionsOk: boolean;
  paid: boolean;
}

export interface ActivationDecision {
  activate: boolean;
  reason: string;
}

/**
 * The gate. Activates an active scan only when ALL conditions hold:
 *   ownershipVerified AND ssrfSafe AND sanctionsOk AND paid.
 *
 * Strict boolean identity (`=== true`) is deliberate: a string ("true"), a
 * number (1), an object, or any injection payload is NOT `true`, so untrusted
 * input can never flip an unmet condition open. There is no bypass parameter.
 * Ownership is checked first — it is the authorization basis, not country.
 */
export function decideActivation(input: ActivationInput): ActivationDecision {
  const ownershipVerified = input?.ownershipVerified === true;
  const ssrfSafe = input?.ssrfSafe === true;
  const sanctionsOk = input?.sanctionsOk === true;
  const paid = input?.paid === true;

  if (!ownershipVerified) {
    return { activate: false, reason: "ownership of target not verified" };
  }
  if (!ssrfSafe) {
    return { activate: false, reason: "target failed SSRF/allowlist guard" };
  }
  if (!sanctionsOk) {
    return { activate: false, reason: "target failed sanctions sub-check" };
  }
  if (!paid) {
    return { activate: false, reason: "payment not confirmed" };
  }
  return { activate: true, reason: "all gate conditions met" };
}
