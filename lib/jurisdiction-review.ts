/**
 * jurisdiction-review.ts — scan-request due-diligence review.
 *
 * `reviewJurisdiction` is PURE (no I/O) so it is fully unit-testable offline.
 * The route (app/api/scan-request/route.ts) resolves the live signals
 * (IP country, network type) with the async helpers at the bottom, then hands
 * them to the pure reviewer.
 *
 * Policy, in order of precedence:
 *   1. SANCTIONED (declared OR resolved IP country on the OFAC deny-list) → reject.
 *      Never trust the declared country alone, and never the IP alone — a
 *      sanctioned user can tunnel through an allowed-country VPN, so we take the
 *      STRICTER of the two.
 *   2. LICENSE-RESTRICTED residence (SG/MY) → hold for the licensed-provider path.
 *   3. Any soft conflict (declared≠IP country, datacenter/VPN/proxy ASN, or
 *      browser timezone/locale that disagrees with the declared country) → hold,
 *      never auto-approve.
 *   4. Otherwise → pending intake.
 */

import type { TriageFlag } from "@/lib/triage";
import { geoFlag } from "@/lib/triage";
import {
  isSanctionedCountry,
  RESTRICTED_JURISDICTION_CODES,
  type RestrictedJurisdictionCode,
} from "@/lib/jurisdiction-policy";

export type RequestStatus = "pending" | "due_diligence_hold" | "rejected";

/** Network classifications that are NOT a residential/mobile last-mile. */
export type NetworkType =
  | "residential"
  | "hosting"
  | "vpn"
  | "proxy"
  | "datacenter"
  | "unknown"
  | null;

const NON_RESIDENTIAL: ReadonlySet<string> = new Set([
  "hosting",
  "vpn",
  "proxy",
  "datacenter",
]);

export interface JurisdictionSignals {
  /** ISO-3166 alpha-2 the user selected (required upstream). */
  declaredCountry: string;
  /** ISO-3166 alpha-2 resolved from the requester IP, or null if unavailable. */
  ipCountry: string | null;
  /** Classification of the requester IP's network, or null if unavailable. */
  networkType: NetworkType;
  /** `Intl.DateTimeFormat().resolvedOptions().timeZone` from the browser. */
  browserTimezone: string | null;
  /** `navigator.language` from the browser. */
  browserLocale: string | null;
}

export interface JurisdictionReview {
  status: RequestStatus;
  flags: TriageFlag[];
  /** Machine reason for the strongest signal, for the reviewer/audit row. */
  reason: string;
}

function norm(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}

function isRestricted(code: string | null): boolean {
  return code != null && RESTRICTED_JURISDICTION_CODES.has(code as RestrictedJurisdictionCode);
}

/** Region subtag of a BCP-47 locale, e.g. "en-US" → "US". null if absent/invalid. */
function localeRegion(locale: string | null): string | null {
  if (!locale) return null;
  try {
    return new Intl.Locale(locale).region?.toUpperCase() ?? null;
  } catch {
    return null;
  }
}

// ponytail: partial IANA-zone → country map. Covers the sanctioned/high-signal
// regions we most care about plus a few common ones; an unmapped zone yields no
// conflict (fail-open) rather than a false hold. Extend as needed.
const TZ_COUNTRY: Readonly<Record<string, string>> = {
  "Asia/Pyongyang": "KP",
  "Asia/Tehran": "IR",
  "Asia/Damascus": "SY",
  "Asia/Havana": "CU",
  "Europe/Moscow": "RU",
  "Europe/Minsk": "BY",
  "Asia/Yangon": "MM",
  "America/Caracas": "VE",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
  "America/New_York": "US",
  "America/Los_Angeles": "US",
  "America/Chicago": "US",
  "Europe/London": "GB",
  "Australia/Sydney": "AU",
  "Asia/Tokyo": "JP",
};

function tzCountry(tz: string | null): string | null {
  if (!tz) return null;
  return TZ_COUNTRY[tz] ?? null;
}

export function reviewJurisdiction(signals: JurisdictionSignals): JurisdictionReview {
  const declared = norm(signals.declaredCountry);
  const ip = norm(signals.ipCountry);
  const flags: TriageFlag[] = [];

  // 1. Sanctions — stricter of declared vs IP. Hard reject.
  if (isSanctionedCountry(declared) || isSanctionedCountry(ip)) {
    const which = isSanctionedCountry(declared) ? declared : ip;
    flags.push({
      code: "SANCTIONED_JURISDICTION",
      severity: "critical",
      message: `Requester jurisdiction ${which} is on the sanctions deny-list; request auto-declined.`,
    });
    return { status: "rejected", flags, reason: `sanctioned:${which}` };
  }

  // 2. License-restricted residence → hold for the licensed-provider path.
  if (isRestricted(declared) || isRestricted(ip)) {
    const which = isRestricted(declared) ? declared : ip;
    flags.push({
      code: "LICENSE_RESTRICTED",
      severity: "warn",
      message: `Requester jurisdiction ${which} is licence-regulated; manual review / licensed-provider path required.`,
    });
  }

  // 3a. Declared vs resolved IP country mismatch.
  if (declared && ip && declared !== ip) {
    flags.push(
      geoFlag(
        "GEO_SIGNAL_CONFLICT",
        `Declared country ${declared} differs from network location ${ip}.`,
      ),
    );
  }

  // 3b. Datacenter / VPN / proxy network.
  if (signals.networkType && NON_RESIDENTIAL.has(signals.networkType)) {
    flags.push(
      geoFlag(
        "PROXY_DETECTED",
        `Requester IP resolves to a ${signals.networkType} network, not a residential connection.`,
      ),
    );
  }

  // 3c. Browser locale region disagrees with declared country.
  const lr = localeRegion(signals.browserLocale);
  if (declared && lr && lr !== declared) {
    flags.push(
      geoFlag(
        "GEO_SIGNAL_CONFLICT",
        `Browser locale region ${lr} differs from declared country ${declared}.`,
      ),
    );
  }

  // 3d. Browser timezone maps to a country that disagrees with declared.
  const tz = tzCountry(signals.browserTimezone);
  if (declared && tz && tz !== declared) {
    flags.push(
      geoFlag(
        "GEO_SIGNAL_CONFLICT",
        `Browser timezone (${signals.browserTimezone} → ${tz}) differs from declared country ${declared}.`,
      ),
    );
  }

  if (flags.length > 0) {
    return {
      status: "due_diligence_hold",
      flags,
      reason: flags.map((f) => f.code).join(","),
    };
  }

  return { status: "pending", flags, reason: "signals consistent" };
}

// ── live signal resolution (network I/O) ───────────────────────────────────────
// Gated by DISABLE_TARGET_GEOLOOKUP so tests and offline runs stay deterministic;
// both fail open (null) on any error so a lookup outage never blocks a legit user.

/** Resolve ISO-3166 alpha-2 country for an IP. Mirrors lib/probe.ts's lookup. */
export async function lookupIpCountry(ip: string): Promise<string | null> {
  if (!ip || ip === "unknown" || process.env.DISABLE_TARGET_GEOLOOKUP === "true") {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: controller.signal,
      headers: { "user-agent": "ai-sec-tester/1.0 (+compliance-guardrail)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const code = (await res.text()).trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

// ponytail: org-name keyword heuristic over ipapi.co's `org` field, NOT a real
// IP-intelligence feed. Catches obvious cloud/VPN ASNs; swap for IPQualityScore /
// MaxMind GeoIP2 Anonymous-IP when compliance funds one.
const HOSTING_ORG_HINTS: Array<[RegExp, NetworkType]> = [
  [/\b(vpn|nordvpn|expressvpn|mullvad|proton\s?vpn)\b/i, "vpn"],
  [/\b(proxy|tor\b|relay)\b/i, "proxy"],
  [
    /\b(amazon|aws|ec2|google\s?cloud|gcp|microsoft|azure|digitalocean|linode|akamai|cloudflare|ovh|hetzner|vultr|scaleway|contabo|hosting|datacenter|data\s?center|colocation|leaseweb|choopa)\b/i,
    "hosting",
  ],
];

/** Classify an IP's network from its ASN/org name. null = unknown/residential. */
export async function lookupIpNetworkType(ip: string): Promise<NetworkType> {
  if (!ip || ip === "unknown" || process.env.DISABLE_TARGET_GEOLOOKUP === "true") {
    return null;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: controller.signal,
      headers: { "user-agent": "ai-sec-tester/1.0 (+compliance-guardrail)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { org?: string; asn?: string };
    const org = `${data.org ?? ""} ${data.asn ?? ""}`;
    for (const [re, type] of HOSTING_ORG_HINTS) {
      if (re.test(org)) return type;
    }
    return "residential";
  } catch {
    return null;
  }
}
