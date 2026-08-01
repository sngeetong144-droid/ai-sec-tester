import { buildScanReportPdf } from "@/lib/report-pdf";
import type { ScanWithResults } from "@/lib/types";

/**
 * Render the scan's graded PDF, upload it to Storage and return a signed URL.
 * Extracted from run-scan.ts (which imports "server-only" and so is unreachable
 * from bun tests) because this is a paid deliverable: it needs regression cover.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Supa = { storage: { from(bucket: string): any } };

const REPORT_BUCKET = process.env.SCAN_REPORT_BUCKET ?? "reports";
const REPORT_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30d — matches the free-rescan window.

/**
 * Fail-soft by contract: EVERY failure path returns null and never throws, so a
 * missing bucket or a bad render can never destroy an otherwise completed scan.
 * The email still goes out with its inline verdict summary.
 */
export async function storeReportArtifact(
  supabase: Supa,
  requestId: string,
  scan: ScanWithResults,
): Promise<string | null> {
  try {
    const pdf = await buildScanReportPdf(scan);
    const path = `${requestId}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(REPORT_BUCKET)
      // Buffer copy: the Supabase JS client needs a concrete body, and
      // Buffer.from keeps the byte range explicit.
      .upload(path, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
    if (upErr) {
      console.warn(`report artifact upload skipped: ${upErr.message}`);
      return null;
    }
    const { data, error: signErr } = await supabase.storage
      .from(REPORT_BUCKET)
      .createSignedUrl(path, REPORT_URL_TTL_SECONDS);
    if (signErr || !data?.signedUrl) {
      console.warn(`report signed-url skipped: ${signErr?.message ?? "no url"}`);
      return null;
    }
    return data.signedUrl;
  } catch (e) {
    console.warn(`report artifact delivery failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
