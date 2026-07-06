/**
 * scan-request.test.ts — jurisdiction due-diligence review (lib/jurisdiction-review.ts).
 * Pure function, no network/DB. Proves the four gate outcomes plus the flag codes.
 *
 * Run: bun test __tests__/scan-request.test.ts
 */
import { test, expect } from "bun:test";
import { reviewJurisdiction } from "../lib/jurisdiction-review";

// Keep the reviewer offline; the async IP lookups are gated on this too.
process.env.DISABLE_TARGET_GEOLOOKUP = "true";

const CLEAN = {
  declaredCountry: "US",
  ipCountry: "US",
  networkType: "residential" as const,
  browserTimezone: "America/New_York",
  browserLocale: "en-US",
};

// ── clean match → pending ──────────────────────────────────────────────────────
test("consistent signals → pending intake", () => {
  const r = reviewJurisdiction(CLEAN);
  expect(r.status).toBe("pending");
  expect(r.flags.length).toBe(0);
});

// ── declared ≠ IP country → hold ───────────────────────────────────────────────
test("declared vs IP-country mismatch → due_diligence_hold with GEO_SIGNAL_CONFLICT", () => {
  const r = reviewJurisdiction({ ...CLEAN, ipCountry: "DE", browserTimezone: null, browserLocale: null });
  expect(r.status).toBe("due_diligence_hold");
  expect(r.flags.some((f) => f.code === "GEO_SIGNAL_CONFLICT")).toBe(true);
});

// ── sanctioned declared country → reject ───────────────────────────────────────
test("sanctioned declared country → rejected", () => {
  const r = reviewJurisdiction({ ...CLEAN, declaredCountry: "IR", ipCountry: "IR" });
  expect(r.status).toBe("rejected");
  expect(r.flags.some((f) => f.code === "SANCTIONED_JURISDICTION")).toBe(true);
});

// ── sanctioned IP, clean declared → reject (VPN-from-sanctioned case) ───────────
test("sanctioned resolved IP with a clear declared country → rejected", () => {
  const r = reviewJurisdiction({ ...CLEAN, declaredCountry: "US", ipCountry: "KP" });
  expect(r.status).toBe("rejected");
  expect(r.reason).toContain("KP");
});

// ── datacenter/VPN network → hold with PROXY_DETECTED ──────────────────────────
test("hosting/VPN network → hold with PROXY_DETECTED", () => {
  const r = reviewJurisdiction({ ...CLEAN, networkType: "hosting" });
  expect(r.status).toBe("due_diligence_hold");
  expect(r.flags.some((f) => f.code === "PROXY_DETECTED")).toBe(true);
});

// ── declared US but Pyongyang timezone → hold (the stated example) ─────────────
test("declared US + Asia/Pyongyang timezone → hold with GEO_SIGNAL_CONFLICT", () => {
  const r = reviewJurisdiction({ ...CLEAN, browserTimezone: "Asia/Pyongyang", browserLocale: null });
  expect(r.status).toBe("due_diligence_hold");
  expect(r.flags.some((f) => f.code === "GEO_SIGNAL_CONFLICT")).toBe(true);
});

// ── sanctions beats a soft conflict (precedence) ───────────────────────────────
test("sanctioned declared outranks any soft conflict → rejected", () => {
  const r = reviewJurisdiction({ ...CLEAN, declaredCountry: "SY", ipCountry: "US", networkType: "vpn" });
  expect(r.status).toBe("rejected");
});

// ── null IP signals (lookup unavailable) do not manufacture a conflict ─────────
test("null IP country/network → still pending when locale+tz agree", () => {
  const r = reviewJurisdiction({
    declaredCountry: "GB",
    ipCountry: null,
    networkType: null,
    browserTimezone: "Europe/London",
    browserLocale: "en-GB",
  });
  expect(r.status).toBe("pending");
});
