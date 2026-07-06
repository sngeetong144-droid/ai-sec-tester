/**
 * probe.ts — shared HTTP probe infrastructure for all scan tiers.
 *
 * Extracted from scan-engine.ts so Basic/Pro/Enterprise engines can share
 * the same SSRF guard, hash, and target-signal logic without diverging.
 */

import { promises as dns } from "dns";
import { isIP } from "net";
import { assertJurisdictionAllowed } from "@/lib/jurisdiction-policy";

export interface ProbeOptions {
  allowPrivateTarget?: boolean;
}

// ── SSRF guard ────────────────────────────────────────────────────────────────

function isPrivateIpv4(a: number, b: number, c: number, d: number): boolean {
  return (
    a === 127 ||
    a === 0 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function isPrivateIp(ip: string): boolean {
  const addr = ip.replace(/^\[|\]$/g, "");
  const v = isIP(addr);

  if (v === 4) {
    const p = addr.split(".").map(Number);
    return isPrivateIpv4(p[0], p[1], p[2], p[3]);
  }

  if (v === 6) {
    const lo = addr.toLowerCase();
    if (lo === "::1" || lo === "::") return true;
    if (lo.startsWith("fc") || lo.startsWith("fd")) return true;
    if (lo.startsWith("fe80")) return true;
    if (lo.startsWith("::ffff:")) {
      const inner = lo.slice(7);
      if (isIP(inner) === 4) {
        const p = inner.split(".").map(Number);
        return isPrivateIpv4(p[0], p[1], p[2], p[3]);
      }
      return true;
    }
  }

  return false;
}

async function lookupCountryCode(ip: string): Promise<string | null> {
  if (process.env.DISABLE_TARGET_GEOLOOKUP === "true") return null;

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

export async function assertPublicTarget(
  rawUrl: string,
  options: ProbeOptions = {},
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`URL scheme not permitted: ${parsed.protocol}`);
  }

  const rawHostname = parsed.hostname.toLowerCase();
  const hostname = rawHostname.replace(/^\[|\]$/g, "");

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    if (options.allowPrivateTarget) return;
    throw new Error("Scanning localhost is not permitted.");
  }

  await assertJurisdictionAllowed(hostname, [], lookupCountryCode);

  if (isIP(hostname) !== 0) {
    if (isPrivateIp(hostname)) {
      if (options.allowPrivateTarget) return;
      throw new Error("Scanning private or internal IP addresses is not permitted.");
    }
    await assertJurisdictionAllowed(hostname, [hostname], lookupCountryCode);
    return;
  }

  try {
    const records = await dns.lookup(hostname, { family: 0, all: true });
    const addresses = records.map((r) => r.address);
    if (addresses.some(isPrivateIp)) {
      if (options.allowPrivateTarget) return;
      throw new Error("Target hostname resolves to a private or internal IP address.");
    }
    await assertJurisdictionAllowed(hostname, addresses, lookupCountryCode);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.startsWith("Target hostname") ||
        err.message.startsWith("Scanning") ||
        err.message.startsWith("Target jurisdiction"))
    ) {
      throw err;
    }
  }
}

// ── deterministic hash ───────────────────────────────────────────────────────

/** djb2 string hash → unsigned 32-bit int. Stable across runs and platforms. */
export function hashString(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

// ── target signals ───────────────────────────────────────────────────────────

const WIDGET_SIGNATURES: Array<[string, RegExp]> = [
  ["Intercom", /intercom/i],
  ["Drift", /drift\.com|js\.driftt/i],
  ["Tidio", /tidio/i],
  ["Crisp", /crisp\.chat/i],
  ["HubSpot", /hs-scripts|hubspot/i],
  ["Zendesk", /zendesk|zdassets/i],
  ["Tawk.to", /tawk\.to/i],
  ["LiveChat", /livechatinc/i],
  ["Voiceflow", /voiceflow/i],
  ["Landbot", /landbot/i],
];

const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ["OpenAI key", /sk-[A-Za-z0-9]{20,}/],
  ["Anthropic key", /sk-ant-[A-Za-z0-9-]{20,}/],
  ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["Bearer token", /bearer\s+[A-Za-z0-9._-]{20,}/i],
  ["Generic api_key", /api[_-]?key["'`\s:=]{1,4}[A-Za-z0-9_-]{16,}/i],
];

function redact(sample: string): string {
  const s = sample.slice(0, 48);
  if (s.length <= 8) return "****";
  return s.slice(0, 6) + "…" + "*".repeat(6);
}

export interface TargetSignals {
  reachable: boolean;
  httpStatus: number | null;
  isHttps: boolean;
  hasCSP: boolean;
  hasFrameGuard: boolean;
  hasHSTS: boolean;
  detectedWidget: string | null;
  exposedSecret: string | null;
  leakedConfig: boolean;
  note: string;
  // Extended signals populated by probeTargetExtended
  rawCsp: string | null;
  rawCookies: string[];
  corsOrigin: string | null;
  rateLimitHeaders: boolean;
  rawBody: string;
  responseHeaders: Record<string, string>;
}

export async function probeTarget(
  targetUrl: string,
  options: ProbeOptions = {},
): Promise<TargetSignals> {
  await assertPublicTarget(targetUrl, options);

  const signals: TargetSignals = {
    reachable: false,
    httpStatus: null,
    isHttps: /^https:/i.test(targetUrl),
    hasCSP: false,
    hasFrameGuard: false,
    hasHSTS: false,
    detectedWidget: null,
    exposedSecret: null,
    leakedConfig: false,
    note: "",
    rawCsp: null,
    rawCookies: [],
    corsOrigin: null,
    rateLimitHeaders: false,
    rawBody: "",
    responseHeaders: {},
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "user-agent": "ai-sec-tester/1.0 (+security-scan)" },
    });
    clearTimeout(timeout);

    signals.reachable = true;
    signals.httpStatus = res.status;

    // Collect all headers into plain object for downstream analysis
    res.headers.forEach((val, key) => {
      signals.responseHeaders[key.toLowerCase()] = val;
    });

    const cspHeader = res.headers.get("content-security-policy") ?? null;
    signals.rawCsp = cspHeader;
    signals.hasCSP = cspHeader !== null;
    signals.hasFrameGuard =
      res.headers.has("x-frame-options") ||
      (cspHeader ?? "").includes("frame-ancestors");
    signals.hasHSTS = res.headers.has("strict-transport-security");

    // CORS header
    signals.corsOrigin = res.headers.get("access-control-allow-origin");

    // Rate-limit signals
    signals.rateLimitHeaders =
      res.headers.has("x-ratelimit-limit") ||
      res.headers.has("x-ratelimit-remaining") ||
      res.headers.has("retry-after") ||
      res.status === 429;

    // Cookie headers (Set-Cookie may appear multiple times; Headers API merges them comma-separated)
    const cookieHeader = res.headers.get("set-cookie");
    signals.rawCookies = cookieHeader ? cookieHeader.split(",").map((c) => c.trim()) : [];

    const body = (await res.text()).slice(0, 200_000);
    signals.rawBody = body;

    for (const [name, re] of WIDGET_SIGNATURES) {
      if (re.test(body)) {
        signals.detectedWidget = name;
        break;
      }
    }
    for (const [name, re] of SECRET_PATTERNS) {
      const m = body.match(re);
      if (m) {
        signals.exposedSecret = `${name} (${redact(m[0])})`;
        break;
      }
    }

    signals.leakedConfig =
      /("?system_?prompt"?\s*[:=])|(you are a[n]? (helpful|virtual|ai) )|("instructions"\s*:\s*")/i.test(
        body,
      );

    signals.note = signals.detectedWidget
      ? `Reachable (${res.status}). Detected chatbot widget: ${signals.detectedWidget}.`
      : `Reachable (${res.status}). No known chatbot widget signature detected on the landing HTML.`;
  } catch (err) {
    signals.note =
      "Target could not be fetched (offline, blocked, or timed out). Interactive checks were simulated; transport checks unavailable.";
  }

  return signals;
}
