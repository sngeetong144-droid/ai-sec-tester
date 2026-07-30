/**
 * rate-limit.ts — in-process fixed-window rate limiter for public POST routes.
 *
 * ponytail: PER-INSTANCE, in-memory only. Ceiling: a Map lives inside ONE
 * serverless instance, so on Vercel's fan-out each cold instance keeps its own
 * counter and the effective limit is (configured cap × live instances) — this is
 * leaky under horizontal scale. Upgrade path: move the window store to Upstash
 * Redis or Vercel Firewall / WAF rate rules if serverless fan-out makes this
 * leaky. Good enough as a first-line brake on a single-instance intake route; it
 * is a deterrent, not a guarantee.
 */

const WINDOW_MS = 60_000;

// The chat assistant spends LLM tokens per request, so it gets its own, tighter
// window: 10 requests / 5 minutes per IP. Same in-process caveat as above.
const CHAT_WINDOW_MS = 300_000;
const CHAT_IP_MAX_PER_WINDOW = 10;

// Separate caps: an IP is the tightest identity; an email DOMAIN is broader
// (a whole company shares one), so it gets a looser ceiling.
const IP_MAX_PER_WINDOW = 5;
const EMAIL_DOMAIN_MAX_PER_WINDOW = 20;

// When the map grows past this, sweep expired entries so it can't grow unbounded
// across a long-lived instance. ponytail: opportunistic sweep, no timer/interval.
const SWEEP_THRESHOLD = 5_000;

interface Window {
  count: number;
  resetAt: number;
}

const ipHits = new Map<string, Window>();
const domainHits = new Map<string, Window>();
const chatIpHits = new Map<string, Window>();

function sweep(map: Map<string, Window>, now: number): void {
  if (map.size < SWEEP_THRESHOLD) return;
  for (const [key, w] of map) {
    if (now >= w.resetAt) map.delete(key);
  }
}

/** Record one hit against `map[key]`. Returns true if still under `max`. */
function allow(
  map: Map<string, Window>,
  key: string,
  max: number,
  now: number,
  windowMs: number = WINDOW_MS,
): boolean {
  sweep(map, now);
  const w = map.get(key);
  if (!w || now >= w.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (w.count >= max) return false;
  w.count += 1;
  return true;
}

export interface RateLimitResult {
  ok: boolean;
  reason: string;
}

/**
 * Rate-limit a scan-request by requester IP and (separately) email domain. Both
 * ceilings must hold. An "unknown" IP is not rate-limited by IP (no signal to key
 * on) but is still capped by email domain.
 */
export function rateLimitScanRequest(ip: string, emailDomain: string): RateLimitResult {
  const now = Date.now();

  if (ip && ip !== "unknown" && !allow(ipHits, ip, IP_MAX_PER_WINDOW, now)) {
    return { ok: false, reason: `rate limit: too many requests from IP ${ip}` };
  }
  if (emailDomain && !allow(domainHits, emailDomain, EMAIL_DOMAIN_MAX_PER_WINDOW, now)) {
    return { ok: false, reason: `rate limit: too many requests from domain ${emailDomain}` };
  }
  return { ok: true, reason: "under limit" };
}

/**
 * Rate-limit a chat-assistant turn by requester IP. Tighter than the scan-request
 * cap because every allowed request spends LLM tokens. An "unknown" IP has no
 * signal to key on and is not limited here — keep any caller's other guards.
 */
export function rateLimitChat(ip: string): RateLimitResult {
  const now = Date.now();
  if (ip && ip !== "unknown" && !allow(chatIpHits, ip, CHAT_IP_MAX_PER_WINDOW, now, CHAT_WINDOW_MS)) {
    return { ok: false, reason: `rate limit: too many chat messages from IP ${ip}` };
  }
  return { ok: true, reason: "under limit" };
}

/** Test-only: clear every window between cases. */
export function __resetRateLimit(): void {
  ipHits.clear();
  domainHits.clear();
  chatIpHits.clear();
}
