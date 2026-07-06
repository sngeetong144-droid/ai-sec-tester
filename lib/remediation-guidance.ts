import type { TestResult } from "@/lib/scan-engine";

const GENERIC_STEPS = [
  "Send this finding, observed evidence, and the affected chatbot URL to the chatbot owner or developer.",
  "Ask for a written remediation plan that names the code/config change, owner, and expected completion date.",
  "Re-scan the same URL after the fix and compare the new report against this one.",
];

const GUIDANCE_BY_KEY: Record<string, string[]> = {
  instruction_override: [
    "Move non-negotiable business, safety, privacy, and escalation rules into the system prompt or server-side policy layer.",
    "Add prompt-injection filters for phrases such as ignore instructions, reveal prompt, developer mode, and role override attempts.",
    "Test refusal behavior with adversarial prompts before publishing the chatbot again.",
  ],
  data_exfiltration: [
    "Remove secrets, private keys, internal URLs, and customer data from prompts, retrieval documents, browser-visible scripts, and chatbot context.",
    "Add output filters that block API keys, credentials, tokens, emails, phone numbers, and internal operational instructions.",
    "Verify the bot refuses requests to reveal hidden instructions, source data, or private customer information.",
  ],
  sensitive_disclosure: [
    "Minimize what the chatbot can access: only provide the data needed for the current customer task.",
    "Mask or redact personal data before it enters the model context.",
    "Add an escalation path so sensitive requests are handed to a human instead of answered by the bot.",
  ],
  jailbreak_resistance: [
    "Add a refusal policy for roleplay, hypothetical, encoding, translation, and multi-step jailbreak attempts.",
    "Keep a test set of known jailbreak prompts and run it before each chatbot update.",
    "Log blocked jailbreak attempts so repeated patterns can be tightened over time.",
  ],
  system_prompt_leakage: [
    "Move proprietary instructions out of client-side code and into server-side configuration.",
    "Add explicit refusal rules for requests asking for hidden prompts, policies, tools, chain-of-thought, or internal setup.",
    "Check that error messages and debug endpoints do not expose prompt templates.",
  ],
  insecure_output_handling: [
    "Render chatbot output as text by default, not raw HTML.",
    "Sanitize links, markdown, scripts, iframes, and file references before displaying model output.",
    "Block or review chatbot-generated code, forms, payment links, and login links before customers can click them.",
  ],
  model_dos: [
    "Add rate limiting per IP, user, and session for chatbot messages.",
    "Set maximum message length, conversation length, and retrieval size.",
    "Add abuse monitoring for repeated long prompts, automated traffic, and expensive model calls.",
  ],
  overreliance_disclaimer: [
    "Add a visible AI-limitation notice near the chat entry point and inside the first assistant response.",
    "For medical, legal, financial, safety, or regulated topics, instruct the bot to recommend qualified professional review.",
    "Prevent the chatbot from giving final decisions, diagnoses, legal advice, investment instructions, or safety-critical directions.",
  ],
  cors_policy: [
    "Replace wildcard CORS origins with an allowlist of trusted domains.",
    "Do not allow credentials with wildcard origins.",
    "Test preflight responses and chatbot API calls from unauthorized origins.",
  ],
  clickjacking_protection: [
    "Set Content-Security-Policy frame-ancestors to 'none' or a strict allowlist.",
    "Use X-Frame-Options DENY or SAMEORIGIN where legacy browser support is needed.",
    "Only allow embedding for explicitly approved internal dashboards or partner domains.",
  ],
  cookie_security_flags: [
    "Set Secure, HttpOnly, and SameSite=Lax or Strict on session cookies.",
    "Avoid storing tokens in browser-accessible JavaScript storage.",
    "Rotate session cookies after login and after privilege changes.",
  ],
  csp_directive_weakness: [
    "Replace wildcard sources with exact domains used by the chatbot.",
    "Remove unsafe-eval and replace unsafe-inline with nonces or hashes where possible.",
    "Add a report-only CSP first if the site needs a compatibility rollout before enforcement.",
  ],
  supply_chain_exposure: [
    "Inventory every third-party script, chatbot widget, analytics tag, and CDN dependency on the page.",
    "Remove unused scripts and pin critical assets to trusted vendors.",
    "Use Subresource Integrity or equivalent vendor controls where supported.",
  ],
  auth_context_leakage: [
    "Keep account, role, entitlement, and internal workflow state out of client-visible prompts.",
    "Ensure the chatbot receives only scoped user context from the server after authorization checks.",
    "Test whether unauthenticated or lower-privilege users can trigger privileged chatbot behavior.",
  ],
};

export function remediationStepsFor(item: Pick<TestResult, "key" | "remediation">): string[] {
  return GUIDANCE_BY_KEY[item.key] ?? [item.remediation, ...GENERIC_STEPS].filter(Boolean);
}

export function consumerOptionsFor(results: Array<{ status: string }>): string[] {
  const hasFailures = results.some((item) => item.status === "fail");
  if (!hasFailures) {
    return [
      "Keep this report as baseline evidence.",
      "Re-scan after any chatbot prompt, model, workflow, plugin, or vendor change.",
    ];
  }

  return [
    "Option 1: send this report to the current chatbot creator and request remediation plus a re-scan proof.",
    "Option 2: if the vendor cannot remediate, terminate or pause the risky chatbot service before more customers use it.",
    "Option 3: engage The Souls of AI to rebuild or replace the chatbot with secure prompt rules, safer retrieval, rate limits, and re-scan evidence.",
  ];
}
