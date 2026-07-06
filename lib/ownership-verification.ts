/**
 * ownership-verification.ts — prove the requester controls a target domain
 * before an active scan runs (Sprint 2 SAFE guardrail).
 *
 * Two challenge types, checked synchronously (no async polling job):
 *   - dns_txt:    a TXT record on the domain contains the token
 *   - well_known: GET https://<domain>/.well-known/ai-sec-tester.txt contains it
 */

import { promises as dns } from "dns";
import { createHash, randomBytes } from "crypto";
import { assertPublicTarget } from "@/lib/probe";

export const WELL_KNOWN_PATH = "/.well-known/ai-sec-tester.txt";

export interface Challenge {
  token: string;
  dns_txt_record: string; // TXT record name to set (value = token)
  well_known_path: string; // or host this path returning the token
}

export interface VerifyResult {
  verified: boolean;
  proof_hash: string | null;
}

/** Parse a URL or bare host into a lowercase hostname, or null if invalid. */
export function extractDomain(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : "https://" + raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function generateChallenge(domain: string): Challenge {
  const token = "aist-verify=" + randomBytes(16).toString("hex");
  return { token, dns_txt_record: domain, well_known_path: WELL_KNOWN_PATH };
}

function hashProof(method: string, domain: string, token: string): string {
  return createHash("sha256").update(`${method}:${domain}:${token}`).digest("hex");
}

export async function verifyChallengeSync(
  domain: string,
  token: string,
): Promise<VerifyResult> {
  // 1) DNS TXT — a DNS query, not an HTTP fetch, so no SSRF surface.
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.map((chunks) => chunks.join("")).join(" ");
    if (flat.includes(token)) {
      return { verified: true, proof_hash: hashProof("dns_txt", domain, token) };
    }
  } catch {
    /* no TXT record / NXDOMAIN → try well-known */
  }

  // 2) .well-known fallback — reuse the scan SSRF guard before fetching.
  // ponytail: MEDIUM #6 (TOCTOU) — assertPublicTarget resolves+checks the
  // domain, then fetch() resolves again; DNS could rebind in between. Not
  // fixed here (dev-gated path today). Upgrade: resolve once, fetch by
  // pinned IP with a Host header, or re-assert on the resolved address.
  try {
    const url = "https://" + domain + WELL_KNOWN_PATH;
    await assertPublicTarget(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "ai-sec-tester/1.0 (+ownership-verify)" },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const body = (await res.text()).slice(0, 1000);
      if (body.includes(token)) {
        return { verified: true, proof_hash: hashProof("well_known", domain, token) };
      }
    }
  } catch {
    /* unreachable / private / token absent → not verified */
  }

  return { verified: false, proof_hash: null };
}
