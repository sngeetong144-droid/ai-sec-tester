/**
 * chatbot-discovery.ts — find a chatbot MESSAGE endpoint on a website.
 *
 * Website-URL scan mode: the operator gives a page that hosts a chatbot, not the
 * chatbot's API. We fetch the page (SSRF-guarded, via probeTarget) and mine the
 * HTML + inline JS for the URL the widget posts messages to — n8n/webhook URLs,
 * fetch/axios call targets, /api/chat-style routes, and data-* endpoint hints.
 *
 * ponytail: regex mining of the served HTML, not a JS engine. It cannot follow a
 * URL assembled at runtime or hidden inside a bundled vendor SDK — those return
 * "nothing found", which the caller turns into a LOUD failure (never a fake
 * clean report). True per-vendor endpoint resolution is a separate, larger job.
 */

import { probeTarget, type ProbeOptions } from "@/lib/probe";

// Endpoint must look chatbot-ish to be a candidate (keeps CSS/analytics URLs out).
const CHAT_HINT =
  /webhook|\bchat\b|message|converse|assistant|\bbot\b|completion|\bagent\b/i;

// A URL literal sitting inside a fetch/axios/XHR call, a config field, or a data-* attr.
const PATTERNS: RegExp[] = [
  /(?:fetch|axios(?:\.post)?|\$\.(?:post|ajax)|\.open)\s*\(\s*[`'"]([^`'"]+)[`'"]/gi,
  /(?:url|endpoint|api[_-]?url|webhook(?:[_-]?url)?|chat[_-]?url|action|src)\s*[:=]\s*[`'"]([^`'"]+)[`'"]/gi,
  /data-(?:chat|webhook|bot|endpoint|api|widget)(?:-url)?\s*=\s*["']([^"']+)["']/gi,
  // bare webhook/api paths or absolute URLs quoted anywhere in the source
  /[`'"]((?:https?:\/\/[^\s`'"<>]+|\/(?:webhook|webhook-test|api)\/[^\s`'"<>]+))[`'"]/gi,
];

function score(url: string): number {
  const u = url.toLowerCase();
  let s = 0;
  if (/\/webhook(?:-test)?\//.test(u)) s += 100;
  if (/(chat|converse|message|assistant|completion)/.test(u)) s += 50;
  if (/(\bbot\b|\bagent\b|\bai\b)/.test(u)) s += 20;
  if (/\/api\//.test(u)) s += 10;
  return s;
}

/**
 * Extract ranked, absolute chatbot-endpoint candidates from page source.
 * Pure + deterministic — the unit-tested core. Relative URLs are resolved
 * against `baseUrl`; only http/https survive; best guess is first.
 */
export function extractChatEndpoints(html: string, baseUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const raw = m[1];
      if (!raw || !CHAT_HINT.test(raw)) continue;
      let abs: string;
      try {
        abs = new URL(raw, baseUrl).toString();
      } catch {
        continue;
      }
      if (!/^https?:/i.test(abs) || seen.has(abs)) continue;
      seen.add(abs);
      out.push(abs);
    }
  }

  return out.sort((a, b) => score(b) - score(a));
}

export interface DiscoveryResult {
  /** Best chatbot message endpoint, or null when none could be mined. */
  endpoint: string | null;
  /** Vendor signature detected on the page (Intercom/Drift/…), if any. */
  vendor: string | null;
  /** Whether the page itself was reachable. */
  reachable: boolean;
  /** All ranked candidates (endpoint === candidates[0]). */
  candidates: string[];
}

/**
 * Fetch `websiteUrl` (SSRF-guarded) and discover its chatbot endpoint. Never
 * throws for "not found" — returns endpoint:null so the caller can fail loudly
 * with context. Honors allowRestrictedJurisdiction for the admin path.
 */
export async function discoverChatbotEndpoint(
  websiteUrl: string,
  options: ProbeOptions = {},
): Promise<DiscoveryResult> {
  const signals = await probeTarget(websiteUrl, options);
  const candidates = signals.reachable
    ? extractChatEndpoints(signals.rawBody, websiteUrl)
    : [];
  return {
    endpoint: candidates[0] ?? null,
    vendor: signals.detectedWidget,
    reachable: signals.reachable,
    candidates,
  };
}
