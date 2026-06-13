export interface TriageFlag {
  code: string;
  severity: "info" | "warn" | "critical";
  message: string;
}

export interface TriageResult {
  score: number;
  verdict: "low" | "medium" | "high";
  recommendation: "approve" | "review" | "reject";
  flags: TriageFlag[];
  summary: string;
}

const BLOCKED_DOMAINS = [
  /\.gov(\.|\b)/i,
  /\.mil(\.|\b)/i,
  /\.gov\.uk(\.|\b)/i,
  /\.gov\.au(\.|\b)/i,
  /whitehouse\.gov/i,
  /fbi\.gov/i,
  /cia\.gov/i,
  /dhs\.gov/i,
  /pentagon\.mil/i,
];

const PRIVATE_IP = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\.0\.0\.0/,
  /^localhost$/i,
];

const FREE_EMAIL = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "protonmail.com",
  "icloud.com",
  "live.com",
  "me.com",
];

export async function runTriage(input: {
  chatbot_url: string;
  email: string;
  ip_address: string;
}): Promise<TriageResult> {
  const flags: TriageFlag[] = [];
  let score = 0;

  let parsed: URL;
  try {
    parsed = new URL(input.chatbot_url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    flags.push({
      code: "INVALID_URL",
      severity: "critical",
      message: "Target URL is not a valid http/https address.",
    });
    return finalize(100, flags);
  }

  const hostname = parsed.hostname;

  if (PRIVATE_IP.some((r) => r.test(hostname))) {
    flags.push({
      code: "PRIVATE_IP",
      severity: "critical",
      message: `Target '${hostname}' is a private/internal address — SSRF risk.`,
    });
    score += 70;
  }

  if (BLOCKED_DOMAINS.some((r) => r.test(hostname))) {
    flags.push({
      code: "BLOCKLIST_HIT",
      severity: "critical",
      message: `Target '${hostname}' matches a restricted category (gov/mil).`,
    });
    score += 50;
  }

  if (parsed.protocol !== "https:") {
    flags.push({
      code: "NO_HTTPS",
      severity: "warn",
      message: "Target is not served over HTTPS.",
    });
    score += 10;
  }

  const emailDomain = (input.email.split("@")[1] ?? "").toLowerCase();
  const targetDomain = hostname.toLowerCase().replace(/^www\./, "");
  const targetBase = targetDomain.split(".").slice(-2).join(".");

  if (FREE_EMAIL.includes(emailDomain)) {
    flags.push({
      code: "FREE_EMAIL",
      severity: "warn",
      message: `Free email provider '${emailDomain}' — cannot verify organizational link to target.`,
    });
    score += 20;
  } else if (
    !targetDomain.includes(emailDomain) &&
    !emailDomain.includes(targetBase)
  ) {
    flags.push({
      code: "DOMAIN_MISMATCH",
      severity: "warn",
      message: `Email domain '${emailDomain}' does not match target domain '${targetDomain}'.`,
    });
    score += 15;
  } else {
    flags.push({
      code: "DOMAIN_MATCH",
      severity: "info",
      message: `Email domain matches target domain — strong ownership signal.`,
    });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(parsed.origin, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "ai-sec-tester-triage/1.0" },
    });
    clearTimeout(t);
    if (!res.ok && res.status >= 500) {
      flags.push({
        code: "TARGET_ERROR",
        severity: "warn",
        message: `Target returned HTTP ${res.status}.`,
      });
      score += 10;
    } else {
      flags.push({
        code: "TARGET_REACHABLE",
        severity: "info",
        message: `Target responded HTTP ${res.status}.`,
      });
    }
  } catch {
    flags.push({
      code: "TARGET_UNREACHABLE",
      severity: "warn",
      message: "Target could not be reached (timeout or blocked).",
    });
    score += 10;
  }

  return finalize(score, flags);
}

function finalize(rawScore: number, flags: TriageFlag[]): TriageResult {
  const score = Math.min(100, rawScore);
  const verdict: TriageResult["verdict"] =
    score <= 25 ? "low" : score <= 55 ? "medium" : "high";
  const recommendation: TriageResult["recommendation"] =
    score <= 25 ? "approve" : score <= 55 ? "review" : "reject";

  const criticals = flags.filter((f) => f.severity === "critical");
  const warns = flags.filter((f) => f.severity === "warn");

  const summary =
    criticals.length > 0
      ? `HIGH RISK — ${criticals.map((f) => f.message).join("; ")}`
      : warns.length > 0
        ? `MEDIUM RISK — ${warns.map((f) => f.message).join("; ")}`
        : "LOW RISK — No significant flags. Domain alignment and reachability look good.";

  return { score, verdict, recommendation, flags, summary };
}
