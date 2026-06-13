import { createHmac, timingSafeEqual } from "crypto";

const SECRET =
  process.env.APPROVAL_HMAC_SECRET || "dev-hmac-secret-change-in-production";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
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

export function makeReScanToken(requestId: string): string {
  return sign(`rescan:${requestId}`);
}
