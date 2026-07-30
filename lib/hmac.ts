import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signing key for approval / report / re-scan links.
 *
 * There is deliberately NO production fallback. The previous default was a literal
 * string in this file — and this repository is PUBLIC, so anyone could mint a valid
 * report token and read another customer's scan findings, or self-approve an
 * enterprise request. A missing secret must fail loudly at first use, never sign
 * with a value the whole internet knows.
 *
 * Development keeps a fallback so local work needs no setup.
 */
function secret(): string {
  const configured = process.env.APPROVAL_HMAC_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APPROVAL_HMAC_SECRET is not set. Report and approval links cannot be signed " +
        "or verified safely without it — set it in the server environment.",
    );
  }
  return "dev-hmac-secret-change-in-production";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expected, "hex"),
    );
  } catch {
    return false;
  }
}

export function makeApprovalToken(requestId: string): string {
  return sign(`approve:${requestId}`);
}

export function verifyApprovalToken(requestId: string, token: string): boolean {
  return verify(`approve:${requestId}`, token);
}

export function makeReportToken(requestId: string): string {
  return sign(`report:${requestId}`);
}

export function verifyReportToken(requestId: string, token: string): boolean {
  return verify(`report:${requestId}`, token);
}

export function makeReScanToken(requestId: string): string {
  return sign(`rescan:${requestId}`);
}
