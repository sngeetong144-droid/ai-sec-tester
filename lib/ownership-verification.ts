/**
 * ownership-verification.ts — prove the requester controls a target domain
 * before an active scan runs (Sprint 2 SAFE guardrail).
 *
 * Two challenge types, checked synchronously (no async polling job):
 *   - dns_txt:    a TXT record on the domain contains the token
 *   - well_known: GET https://<domain>/.well-known/ai-sec-tester.txt contains it
 */

import { promises as dns } from "dns";
import { request as httpsRequest } from "node:https";
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

  // 2) .well-known fallback — SSRF-safe and TOCTOU-closed.
  // Resolve the host ONCE, verify that exact IP is public + jurisdiction-allowed
  // via the scan SSRF guard (assertPublicTarget on the literal IP → no extra
  // DNS), then fetch PINNED to that same IP. Because the connection can only go
  // to the already-verified address, DNS cannot rebind to a private/internal IP
  // between the check and the fetch. SNI/Host/cert stay the real domain, so TLS
  // validation is unchanged — only the connect target is pinned.
  try {
    const { address, family } = await dns.lookup(domain, { family: 0 });
    const ipHost = family === 6 ? `[${address}]` : address;
    await assertPublicTarget("https://" + ipHost + WELL_KNOWN_PATH);
    const body = await pinnedWellKnownGet(domain, address, family);
    if (body !== null && body.includes(token)) {
      return { verified: true, proof_hash: hashProof("well_known", domain, token) };
    }
  } catch {
    /* unreachable / private / token absent → not verified */
  }

  return { verified: false, proof_hash: null };
}

/**
 * HTTPS GET of WELL_KNOWN_PATH on `host`, but connected to `pinnedIp` (the
 * address already validated as public by the caller). The `lookup` override
 * forces the socket to that IP while host/servername stay the real domain, so
 * cert validation, SNI, and the Host header are all correct AND the target IP
 * can't change under us (closes the DNS-rebinding TOCTOU). Returns up to 1000
 * chars of a 2xx body, or null on any non-2xx / timeout / transport error.
 * ponytail: 5s timeout + 1KB cap; enough to read a verification token, not a
 * general-purpose fetcher. Widen only if a real target needs more.
 */
function pinnedWellKnownGet(
  host: string,
  pinnedIp: string,
  family: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    const req = httpsRequest(
      {
        host,
        servername: host,
        path: WELL_KNOWN_PATH,
        method: "GET",
        timeout: 5000,
        headers: { "user-agent": "ai-sec-tester/1.0 (+ownership-verify)" },
        lookup: (_hostname, _options, cb) => cb(null, pinnedIp, family || 4),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          res.resume();
          resolve(null);
          return;
        }
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          data += chunk;
          if (data.length >= 1000) req.destroy();
        });
        res.on("end", () => resolve(data.slice(0, 1000)));
      },
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(null));
    req.end();
  });
}
