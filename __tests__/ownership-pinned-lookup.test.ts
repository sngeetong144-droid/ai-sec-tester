/**
 * Regression guard for a SILENT production failure found 2026-07-31.
 *
 * verifyChallengeSync's .well-known branch pins the socket to a pre-validated
 * IP via a `lookup` override. Node >= 18.13 (Vercel runs 24.x) enables
 * autoSelectFamily, so `net` calls lookup with { all: true } and expects an
 * ARRAY of { address, family }. The original override returned the legacy
 * 3-argument form, so every connection failed with "Invalid IP address:
 * undefined" — and the caller's bare catch swallowed it. Result: the file-based
 * ownership option, which the $497 upsell UI offers as the easy path for
 * non-technical users, verified NOBODY. Live proof: the token file returned 200
 * to curl while /api/ownership/verify returned { verified: false }.
 */
import { test, expect } from "bun:test";
import { pinnedLookup } from "../lib/ownership-verification";

test("pinnedLookup answers the { all: true } form with an array (Node >= 18.13)", () => {
  let got: unknown[] = [];
  pinnedLookup("203.0.113.7", 4)("example.com", { all: true }, (...args) => {
    got = args;
  });
  expect(got[0]).toBeNull();
  expect(got[1]).toEqual([{ address: "203.0.113.7", family: 4 }]);
});

test("pinnedLookup still answers the legacy 3-argument form", () => {
  let got: unknown[] = [];
  // The legacy caller passes no `all` flag at all — Node's older net stack.
  pinnedLookup("203.0.113.7", 4)("example.com", {}, (...args) => {
    got = args;
  });
  expect(got).toEqual([null, "203.0.113.7", 4]);
});

test("pinnedLookup preserves the IPv6 family rather than defaulting to 4", () => {
  let got: unknown[] = [];
  pinnedLookup("2001:db8::1", 6)("example.com", { all: true }, (...args) => {
    got = args;
  });
  expect(got[1]).toEqual([{ address: "2001:db8::1", family: 6 }]);
});
