import { type NextRequest, NextResponse } from "next/server";

/**
 * RETIRED — this emailed-HMAC-token endpoint used to approve an enterprise
 * request and run the scan engine directly, with no admin session and no
 * console activation. The scan engine is now private: it executes ONLY when an
 * admin activates a paid case in the Command Center (see app/actions/scans.ts
 * executeScan + lib/command-center/admin.ts). This route no longer reaches the
 * engine. Fails closed with 410 Gone.
 *
 * ponytail: kept as an explicit 410 so old approval links resolve to a clear
 * message instead of 404-noise. Delete once no live emails carry the old link.
 */
export function GET(_request: NextRequest) {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:560px;margin:0 auto">
      <h2 style="color:#f59e0b;margin-top:0">Approval moved to the Command Center</h2>
      <p>Enterprise requests are now reviewed and activated by an operator in the
      private Command Center. This one-click email approval link has been retired.</p>
    </body></html>`,
    { status: 410, headers: { "content-type": "text/html" } },
  );
}
