/**
 * chatbot-discovery.ts — find a chatbot MESSAGE endpoint on a website.
 *
 * Website-URL scan mode: the operator gives a page that hosts a chatbot, not the
 * chatbot's API. We fetch the page (SSRF-guarded, via probeTarget) and mine the
 * HTML + inline JS for the URL the widget posts messages to — n8n/webhook URLs,
 * fetch/axios call targets, /api/chat-style routes, and data-* endpoint hints.
 *
 * PHASE 2 — BUNDLE MINING. Modern widgets (React/Next/Vue) do not put the fetch
 * target in the served HTML; it is compiled into a JS chunk, so phase 1 finds
 * nothing on exactly the sites this product targets. When HTML mining comes up
 * empty we follow the page's OWN <script src> tags and re-run the same miner
 * over those bundles. Budgets are hard (see constants below) so a scan can never
 * hang, and every bundle fetch goes through the same SSRF-guarded transport as
 * the page fetch.
 *
 * ponytail: still regex mining, not a JS engine. It cannot follow a URL assembled
 * at runtime from fragments. Those return "nothing found", which the caller turns
 * into a LOUD, plain-language failure (never a fake clean report).
 */

import { probeTarget, ssrfGuardedFetch, assertPublicTarget, type ProbeOptions } from "@/lib/probe";

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

// ── bundle-phase budgets (hard caps — exceeding one STOPS the phase) ─────────
/** Never fetch more than this many script bundles for one discovery run. */
export const MAX_BUNDLES = 8;
/** Read at most ~600 KB of any single bundle; the rest is truncated, not streamed. */
export const MAX_BUNDLE_BYTES = 600 * 1024;
/** Whole bundle phase (all fetches combined) must finish inside this window. */
export const BUNDLE_PHASE_BUDGET_MS = 10_000;
/** Per-bundle socket timeout, so one slow CDN cannot eat the whole phase. */
export const BUNDLE_FETCH_TIMEOUT_MS = 6_000;

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

// ── bundle discovery ─────────────────────────────────────────────────────────

const SCRIPT_SRC_RE = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;

/**
 * The registrable-ish site of a host: its last two labels ("a.b.example.com" →
 * "example.com"). Deliberately naive — it is only ever used to WIDEN the
 * same-origin rule to the page's own subdomains (cdn.example.com for
 * example.com), never to admit an unrelated domain.
 */
function siteOf(hostname: string): string {
  const parts = hostname.toLowerCase().split(".");
  return parts.length <= 2 ? parts.join(".") : parts.slice(-2).join(".");
}

/**
 * Is this script URL safe to follow?
 *
 * The candidate must already have come out of the page's own HTML (we never
 * invent a URL). On top of that it must be SAME-SITE with the page: identical
 * origin, or a host under the same registrable site. Third-party CDN bundles
 * (intercom, googletagmanager, an attacker-chosen host) are rejected — they are
 * attacker-influenced fetch targets that essentially never carry the site's own
 * chat endpoint, so following them is all risk and no yield.
 */
export function isFollowableScriptUrl(scriptUrl: string, pageUrl: string): boolean {
  let s: URL;
  let p: URL;
  try {
    s = new URL(scriptUrl);
    p = new URL(pageUrl);
  } catch {
    return false;
  }
  if (!/^https?:$/i.test(s.protocol)) return false;
  if (s.origin === p.origin) return true;
  const sh = s.hostname.toLowerCase();
  const ph = p.hostname.toLowerCase();
  return sh === ph || siteOf(sh) === siteOf(ph);
}

/**
 * Absolute, deduped, followable <script src> URLs from the page HTML, capped at
 * MAX_BUNDLES. Pure + deterministic — unit-tested without any network.
 */
export function extractScriptUrls(html: string, pageUrl: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  SCRIPT_SRC_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SCRIPT_SRC_RE.exec(html)) !== null) {
    const raw = m[1];
    if (!raw) continue;
    let abs: string;
    try {
      abs = new URL(raw, pageUrl).toString();
    } catch {
      continue;
    }
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (!isFollowableScriptUrl(abs, pageUrl)) continue;
    out.push(abs);
    if (out.length >= MAX_BUNDLES) break; // hard cap on fetches
  }
  return out;
}

/**
 * Read at most MAX_BUNDLE_BYTES of a response body. Streams chunk-by-chunk and
 * stops at the cap so a hostile "infinite JS file" cannot exhaust memory; falls
 * back to a truncated text() read when the runtime/mock exposes no stream.
 */
async function readCapped(res: Response): Promise<string> {
  const body = res.body as ReadableStream<Uint8Array> | null | undefined;
  if (!body || typeof body.getReader !== "function") {
    return (await res.text()).slice(0, MAX_BUNDLE_BYTES);
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.length >= MAX_BUNDLE_BYTES) return text.slice(0, MAX_BUNDLE_BYTES);
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }
  }
  return text.slice(0, MAX_BUNDLE_BYTES);
}

export interface BundleMineResult {
  candidates: string[];
  bundlesFetched: number;
}

/**
 * Fetch the page's own script bundles (SSRF-guarded, budgeted) and run the SAME
 * endpoint miner over them. Relative endpoints resolve against the PAGE origin,
 * not the bundle's, because that is where the widget actually posts. Any budget
 * breach stops the phase and returns what was found so far — never a hang.
 */
export async function mineBundlesForEndpoints(
  scriptUrls: string[],
  pageUrl: string,
  options: ProbeOptions = {},
): Promise<BundleMineResult> {
  const deadline = Date.now() + BUNDLE_PHASE_BUDGET_MS;
  const seen = new Set<string>();
  const candidates: string[] = [];
  let bundlesFetched = 0;

  for (const url of scriptUrls.slice(0, MAX_BUNDLES)) {
    if (bundlesFetched >= MAX_BUNDLES) break; // budget: bundle count
    if (Date.now() >= deadline) break; // budget: whole-phase time

    try {
      // Re-assert the guard on the bundle URL itself (the page passing does not
      // license a subdomain that resolves somewhere private).
      await assertPublicTarget(url, options);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BUNDLE_FETCH_TIMEOUT_MS);
      let text: string;
      try {
        const res = await ssrfGuardedFetch(
          url,
          {
            signal: controller.signal,
            headers: { "user-agent": "ai-sec-tester/1.0 (+security-scan)" },
          },
          options,
        );
        bundlesFetched += 1;
        if (!res.ok) continue;
        text = await readCapped(res);
      } finally {
        clearTimeout(timer);
      }

      for (const cand of extractChatEndpoints(text, pageUrl)) {
        if (seen.has(cand)) continue;
        seen.add(cand);
        candidates.push(cand);
      }
    } catch {
      // A single unreachable/blocked bundle is never fatal — keep going.
      continue;
    }
  }

  return { candidates: candidates.sort((a, b) => score(b) - score(a)), bundlesFetched };
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
  /** Which phase produced the endpoint: page HTML, a JS bundle, or nothing. */
  phase: "html" | "bundle" | null;
  /** How many script bundles were actually fetched in the bundle phase. */
  bundlesFetched: number;
}

/**
 * Fetch `websiteUrl` (SSRF-guarded) and discover its chatbot endpoint. Never
 * throws for "not found" — returns endpoint:null so the caller can fail loudly
 * with context. Honors allowRestrictedJurisdiction for the admin path.
 *
 * Two phases: mine the served HTML; if that is empty, follow the page's own
 * same-site script bundles and mine those.
 */
export async function discoverChatbotEndpoint(
  websiteUrl: string,
  options: ProbeOptions = {},
): Promise<DiscoveryResult> {
  const signals = await probeTarget(websiteUrl, options);

  if (!signals.reachable) {
    return {
      endpoint: null,
      vendor: signals.detectedWidget,
      reachable: false,
      candidates: [],
      phase: null,
      bundlesFetched: 0,
    };
  }

  const htmlCandidates = extractChatEndpoints(signals.rawBody, websiteUrl);
  if (htmlCandidates.length > 0) {
    return {
      endpoint: htmlCandidates[0],
      vendor: signals.detectedWidget,
      reachable: true,
      candidates: htmlCandidates,
      phase: "html",
      bundlesFetched: 0,
    };
  }

  // Phase 2 — the endpoint is compiled into a chunk, not printed in the HTML.
  const scriptUrls = extractScriptUrls(signals.rawBody, websiteUrl);
  const { candidates, bundlesFetched } = await mineBundlesForEndpoints(
    scriptUrls,
    websiteUrl,
    options,
  );

  return {
    endpoint: candidates[0] ?? null,
    vendor: signals.detectedWidget,
    reachable: true,
    candidates,
    phase: candidates.length > 0 ? "bundle" : null,
    bundlesFetched,
  };
}

/**
 * The single canonical, PLAIN-LANGUAGE failure message for website mode. The
 * reader is a business owner, not an engineer: say what we saw, give the exact
 * click-path to the answer, and say what to do next. No jargon, ~4 sentences.
 */
export function describeDiscoveryFailure(result: DiscoveryResult): string {
  if (!result.reachable) {
    return "We could not open that web address, so we could not look for your chat widget. Please check the address is correct and publicly reachable (not behind a login or firewall), then try again.";
  }
  const saw = result.vendor
    ? `We found your ${result.vendor} chat widget on the page`
    : "We could see the page";
  const searched =
    result.bundlesFetched > 0
      ? `we searched the page and ${result.bundlesFetched} of its code files`
      : "we searched the page and its code files";
  return `${saw}, but the link it uses to send messages is hidden inside the site's code, so ${searched} without finding it. To get that link yourself: open your website in Chrome, press F12 (or right-click and choose Inspect), click the "Network" tab, then send your chatbot a test message — a new row will appear, and the "Request URL" shown at the top of it is the link. Copy that link, run the scan again, and choose the "I know the exact chat link" option.`;
}
