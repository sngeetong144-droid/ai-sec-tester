import { getScan, scanOwnedByCaller, enterpriseRequestForReportToken } from "@/lib/queries";
import { buildScanReportPdf } from "@/lib/report-pdf";

export const dynamic = "force-dynamic";

/**
 * GET /api/scans/[id]/report
 * Streams a real PDF audit report (Content-Disposition: attachment) so the
 * "Download PDF report" link produces an actual .pdf file.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  // Authorization — two paths, both 404 (not 403) on failure so a non-owner can't
  // even confirm the id exists (this endpoint is keyed only on the scan UUID = IDOR):
  //   1. HMAC report token (?token=...): the enterprise customer is NOT logged in,
  //      so the report email's signed token authorizes their own scan's PDF. Valid
  //      only when the token resolves to a request whose scan_id === this id.
  //   2. Session ownership: an in-app caller (session cookie / user_id) who owns it.
  const token = new URL(req.url).searchParams.get("token");
  let authorized = false;
  if (token) {
    const owner = await enterpriseRequestForReportToken(token);
    authorized = owner?.scan_id === id;
  }
  if (!authorized && !(await scanOwnedByCaller(id))) {
    return new Response("Scan not found", { status: 404 });
  }

  const scan = await getScan(id);
  if (!scan) {
    return new Response("Scan not found", { status: 404 });
  }

  const bytes = await buildScanReportPdf(scan);

  const safe = (scan.target_label || scan.target_url)
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .toLowerCase();

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="ai-sec-report-${safe || "scan"}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
