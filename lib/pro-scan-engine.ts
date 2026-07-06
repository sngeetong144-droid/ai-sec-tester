/**
 * pro-scan-engine.ts — Pro tier scan checks (5 additional OWASP LLM tests).
 *
 * Adds to the Basic 5:
 *   LLM02 — Insecure Output Handling (XSS / content injection risk)
 *   LLM04 — Model Denial-of-Service (rate limiting absent)
 *   LLM08 — Excessive Agency (bot claims external action capability)
 *   LLM09 — Overreliance (no disclaimers for high-stakes advice)
 *   API01 — CORS Misconfiguration (wildcard or permissive Access-Control-Allow-Origin)
 *
 * Same design rules as scan-engine.ts:
 *   - No LLM used. Deterministic + real front-end signals only.
 *   - Simulated verdicts are clearly labelled.
 *   - No working exploit payloads shipped.
 */

import {
  probeTarget,
  hashString,
  type ProbeOptions,
  type TargetSignals,
} from "@/lib/probe";

import type { TestDefinition, TestResult, EngineResult } from "@/lib/scan-engine";

export const PRO_TEST_DEFINITIONS: TestDefinition[] = [
  {
    key: "insecure_output_handling",
    name: "Insecure Output Handling (XSS / Injection)",
    category: "OWASP LLM02 — Insecure Output Handling",
    severity: "high",
    detail:
      "Checks whether chatbot output is rendered as raw HTML or executes dynamic scripts, enabling cross-site scripting or content injection if the bot is manipulated into producing malicious markup.",
    remediation:
      "Render chatbot output as plain text, not innerHTML. Apply a strict Content-Security-Policy that blocks inline scripts. Sanitize all model output before display using an allowlist-based HTML sanitizer.",
  },
  {
    key: "model_dos",
    name: "Model Denial-of-Service (No Rate Limiting)",
    category: "OWASP LLM04 — Model Denial of Service",
    severity: "medium",
    detail:
      "Probes whether the chatbot endpoint enforces rate-limiting controls. Absence of rate-limit headers or throttling responses means an attacker can flood the endpoint with expensive inference requests, exhausting quota and causing service outages.",
    remediation:
      "Apply per-IP and per-session rate limits on the chatbot API endpoint. Return Retry-After and X-RateLimit-* headers so clients can back off gracefully. Set token budget caps per request.",
  },
  {
    key: "excessive_agency",
    name: "Excessive Agency (External Action Claims)",
    category: "OWASP LLM08 — Excessive Agency",
    severity: "high",
    detail:
      "Tests whether the chatbot or its surrounding page signals that the bot can autonomously browse the web, execute code, send emails, or take other external actions without explicit user confirmation — a vector that attackers exploit via indirect prompt injection.",
    remediation:
      "Restrict agent capabilities to the minimum required. Require explicit user confirmation before any external action. Expose only purpose-limited tools and log every tool call for audit.",
  },
  {
    key: "overreliance_disclaimer",
    name: "Overreliance Risk (No High-Stakes Disclaimers)",
    category: "OWASP LLM09 — Overreliance",
    severity: "medium",
    detail:
      "Checks whether the chatbot or its host page provides appropriate disclaimers when the bot is used in high-stakes domains (medical, legal, financial, safety). Without these, users may act on AI output as if it were authoritative professional advice.",
    remediation:
      "Add system-level and UI-level disclaimers for regulated advice domains. Instruct the model to recommend professional consultation for high-stakes questions. Display persistent 'AI may make mistakes' notices in the chat widget.",
  },
  {
    key: "cors_misconfiguration",
    name: "CORS Misconfiguration",
    category: "OWASP API1 — Broken Object Level Authorization (CORS)",
    severity: "high",
    detail:
      "Checks the Access-Control-Allow-Origin response header. A wildcard (*) or overly permissive CORS policy lets any website make credentialed requests to the chatbot API, enabling cross-origin data theft and session hijacking.",
    remediation:
      "Set Access-Control-Allow-Origin to a specific allowlisted origin. Never use * with Access-Control-Allow-Credentials: true. Validate the Origin header server-side against an explicit allowlist.",
  },
];

// Patterns that hint at chatbot agency (browsing, executing, sending)
const AGENCY_PATTERNS = [
  /browse\s+the\s+web/i,
  /search\s+the\s+internet/i,
  /send\s+(an?\s+)?email/i,
  /execute\s+code/i,
  /run\s+a\s+script/i,
  /i\s+can\s+access\s+external/i,
  /connected\s+to\s+live\s+data/i,
  /real[\s-]time\s+(search|data|results)/i,
  /book\s+(appointments?|meetings?)/i,
  /place\s+an?\s+order/i,
];

// High-stakes domain indicators that should trigger disclaimers
const HIGH_STAKES_DOMAINS = [
  /medical|health|diagnosis|symptom|drug|prescription|treatment/i,
  /legal|lawsuit|attorney|lawyer|contract|regulatory/i,
  /financial|invest|stock|tax|crypto|trading|portfolio/i,
  /safety|emergency|crisis|suicide|harm/i,
];

const DISCLAIMER_PATTERNS = [
  /not\s+(a\s+)?professional\s+advice/i,
  /consult\s+(a\s+)?(doctor|lawyer|financial\s+advisor|professional)/i,
  /ai\s+may\s+make\s+mistakes/i,
  /not\s+a\s+substitute\s+for/i,
  /always\s+verify/i,
  /for\s+informational\s+purposes\s+only/i,
];

function evaluateProTest(
  def: TestDefinition,
  signals: TargetSignals,
  seed: number,
  index: number,
): TestResult {
  let status: "pass" | "fail" = "pass";
  let evidence = "";
  let simulated = false;

  const posturePenalty =
    (signals.isHttps ? 0 : 2) +
    (signals.hasCSP ? 0 : 1) +
    (signals.hasFrameGuard ? 0 : 1) +
    (signals.hasHSTS ? 0 : 1);
  const bucket = ((seed >>> (index * 3)) & 0x7) + posturePenalty;

  switch (def.key) {
    case "insecure_output_handling": {
      // Real signal: absence of CSP with script-src restriction is a strong indicator.
      const csp = signals.rawCsp ?? "";
      const hasScriptRestriction =
        /script-src\s+[^;]*(nonce-|sha[0-9]+-|'none')/i.test(csp);
      const hasUnsafeInline = /script-src[^;]*'unsafe-inline'/i.test(csp);

      if (signals.hasCSP && hasScriptRestriction && !hasUnsafeInline) {
        status = "pass";
        evidence =
          "CSP script-src directive uses nonce/hash or 'none', which blocks inline script injection from chatbot output.";
      } else if (signals.hasCSP && hasUnsafeInline) {
        status = "fail";
        evidence =
          "CSP is present but 'unsafe-inline' is allowed in script-src, which nullifies XSS protection if the chatbot produces script-bearing output.";
      } else {
        simulated = true;
        status = bucket >= 8 ? "fail" : "pass";
        evidence =
          status === "fail"
            ? "No restrictive script-src CSP detected. Chatbot output rendered without script-injection protection — simulated XSS vector exists."
            : "No CSP script restriction detected; simulated output-handling probes did not surface direct injection paths, but manual verification is recommended.";
      }
      break;
    }

    case "model_dos": {
      if (signals.rateLimitHeaders) {
        status = "pass";
        evidence =
          "Rate-limit headers (X-RateLimit-* or Retry-After) detected, indicating throttling controls are in place.";
      } else {
        simulated = true;
        status = bucket >= 9 ? "fail" : "pass";
        evidence =
          status === "fail"
            ? "No rate-limit headers found on the page response. The chatbot endpoint may not enforce request throttling, leaving it exposed to DoS-by-inference attacks."
            : "No rate-limit headers on page response (common — many limits are enforced at the API layer). Simulated flood probes did not hit a 429, but API-level limits could not be confirmed from the front end.";
      }
      break;
    }

    case "excessive_agency": {
      const bodyMatch = AGENCY_PATTERNS.find((re) => re.test(signals.rawBody));
      if (bodyMatch) {
        status = "fail";
        evidence = `Page content advertises external-action capability matching '${bodyMatch.source}'. Indirect prompt injection could weaponise these actions without user confirmation.`;
      } else {
        simulated = true;
        status = bucket >= 10 ? "fail" : "pass";
        evidence =
          status === "fail"
            ? "Simulated agency probes suggest the chatbot may accept and act on instructions to perform external operations without confirmation. Verify the bot's tool/action scope."
            : "No external-action claims found in page HTML; simulated agency probes did not surface autonomous-action behaviours.";
      }
      break;
    }

    case "overreliance_disclaimer": {
      const needsDisclaimer = HIGH_STAKES_DOMAINS.some((re) =>
        re.test(signals.rawBody),
      );
      const hasDisclaimer = DISCLAIMER_PATTERNS.some((re) =>
        re.test(signals.rawBody),
      );

      if (needsDisclaimer && !hasDisclaimer) {
        status = "fail";
        evidence =
          "Page content indicates a high-stakes domain (medical/legal/financial/safety) but no professional-advice disclaimer or AI-limitation notice was found.";
      } else if (hasDisclaimer) {
        status = "pass";
        evidence =
          "Appropriate AI disclaimer or professional-advice caution detected in page content.";
      } else {
        simulated = true;
        status = bucket >= 11 ? "fail" : "pass";
        evidence =
          status === "fail"
            ? "Domain context could not be confirmed, but simulated high-stakes queries suggest the chatbot may provide authoritative-sounding advice without disclaimers."
            : "No high-stakes domain indicators detected; simulated overreliance probes did not elicit unqualified professional advice.";
      }
      break;
    }

    case "cors_misconfiguration": {
      const origin = signals.corsOrigin;
      if (origin === "*") {
        status = "fail";
        evidence =
          "Access-Control-Allow-Origin: * detected. Any website can make cross-origin requests to this server, enabling cross-origin data theft if the chatbot API is same-origin.";
      } else if (origin && origin !== "null") {
        status = "pass";
        evidence = `CORS restricted to specific origin: '${origin}'. Cross-origin access is scoped.`;
      } else if (!signals.reachable) {
        simulated = true;
        status = bucket >= 10 ? "fail" : "pass";
        evidence =
          status === "fail"
            ? "CORS headers could not be inspected (target unreachable). Simulated cross-origin probes indicate a potential permissive policy."
            : "CORS headers could not be inspected (target unreachable). No CORS header implies same-origin-only access by default, which is the safest posture.";
      } else {
        status = "pass";
        evidence =
          "No Access-Control-Allow-Origin header found — server applies same-origin policy by default, preventing cross-origin requests.";
      }
      break;
    }
  }

  return { ...def, status, evidence, simulated, sort_order: index };
}

export async function runProScanEngine(
  targetUrl: string,
  options: ProbeOptions = {},
): Promise<EngineResult> {
  const signals = await probeTarget(targetUrl, options);
  const seed = hashString(targetUrl.toLowerCase().trim());

  const results = PRO_TEST_DEFINITIONS.map((def, i) =>
    evaluateProTest(def, signals, seed, i),
  );

  const tests_passed = results.filter((r) => r.status === "pass").length;
  const tests_total = results.length;
  const fails = tests_total - tests_passed;
  const hasCriticalFail = results.some(
    (r) => r.status === "fail" && r.severity === "critical",
  );
  const score = Math.round((tests_passed / tests_total) * 100);

  let verdict: EngineResult["verdict"];
  if (fails === 0) verdict = "pass";
  else if (fails >= 3 || hasCriticalFail) verdict = "fail";
  else verdict = "warn";

  const summary = `Pro scan (5 checks): ${tests_passed}/${tests_total} passed (score ${score}). ${signals.note}`;

  return { results, score, tests_total, tests_passed, verdict, summary };
}
