import type { MetadataRoute } from "next";

// Allow everything, and explicitly welcome AI answer-engine crawlers (AEO/GEO).
// ponytail: one rule set covers all named bots + wildcard — no per-bot duplication.
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];

// Private/authed surfaces disallowed for every crawler, AI bots included —
// the command center must never be indexed by anyone.
const DISALLOW = ["/api/", "/scans/", "/command-center/"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: DISALLOW })),
    ],
    sitemap: "https://scan.thesoulsofai.com/sitemap.xml",
    host: "https://scan.thesoulsofai.com",
  };
}
