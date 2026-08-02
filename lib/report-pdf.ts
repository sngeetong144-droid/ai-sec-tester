import { consumerOptionsFor, remediationStepsFor } from "@/lib/remediation-guidance";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ScanWithResults } from "@/lib/types";
import { coverageLineFor, methodologyNoteFor, rowLabelFor, scoreHeadlineFor } from "@/lib/report-labels";
import { reviewSummaryLine } from "@/lib/advisory-review";


/**
 * Builds the graded PDF audit report for a completed scan: scores, verdict,
 * per-check evidence, remediation steps and consumer next options, paginated
 * onto A4 pages with pdf-lib.
 *
 * Extracted verbatim from app/api/scans/[id]/report/route.ts so the SAME
 * renderer produces both the on-demand download and the artifact emailed to a
 * paying customer. Previously the emailed artifact was a .txt of the email body.
 */
/**
 * `reviews` carries the customer's control disclosure for the three OWASP categories
 * no external scan can reach (LLM03/04/08). Optional: omit it and those rows render
 * as ADVISORY exactly as before, which is what every scan without a disclosure does.
 *
 * It is passed in rather than fetched here because the disclosure lives on
 * scan_requests, and this module renders a scan. Keeping the fetch out of the
 * renderer is also what lets the report tests drive it without a database.
 */
export async function buildScanReportPdf(
  scan: ScanWithResults,
  reviews?: Record<string, { verdict: string; evidence: string; gaps: { question: string; severity: string; remediation: string }[] }> | null,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.09, 0.11, 0.16);
  const muted = rgb(0.42, 0.45, 0.5);
  const green = rgb(0.13, 0.55, 0.33);
  const red = rgb(0.78, 0.18, 0.27);
  const brand = rgb(0.05, 0.55, 0.78);

  const margin = 56;
  let page = pdf.addPage([595, 842]); // A4
  const width = page.getWidth();
  let y = page.getHeight() - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([595, 842]);
      y = page.getHeight() - margin;
    }
  };

  // wrap text to a max width and draw it, advancing y
  const drawWrapped = (
    text: string,
    opts: { font?: PDFFont; size?: number; color?: typeof ink; gap?: number } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    const color = opts.color ?? ink;
    const maxWidth = width - margin * 2;
    const words = text.split(/\s+/);
    let line = "";
    const flush = () => {
      ensureSpace(size + 4);
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 4;
    };
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (f.widthOfTextAtSize(test, size) > maxWidth && line) {
        flush();
        line = w;
      } else {
        line = test;
      }
    }
    if (line) flush();
    y -= opts.gap ?? 0;
  };

  const hr = () => {
    ensureSpace(12);
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0.85, 0.87, 0.9),
    });
    y -= 14;
  };

  // ── Header ──
  page.drawText("AI Sec Tester", { x: margin, y, size: 20, font: bold, color: brand });
  y -= 24;
  page.drawText("Chatbot Security Audit Report", {
    x: margin,
    y,
    size: 12,
    font,
    color: muted,
  });
  y -= 26;
  hr();

  // ── Target + meta ──
  drawWrapped(scan.target_label || scan.target_url, { font: bold, size: 14 });
  drawWrapped(scan.target_url, { size: 10, color: brand });
  drawWrapped(
    `Scanned: ${new Date(scan.created_at).toUTCString()}`,
    { size: 9, color: muted, gap: 8 },
  );

  // ── Score block ──
  const verdictLabel =
    scan.verdict === "pass"
      ? "SECURE"
      : scan.verdict === "warn"
        ? "NEEDS ATTENTION"
        : "VULNERABLE";
  const verdictColor =
    scan.verdict === "pass" ? green : scan.verdict === "fail" ? red : rgb(0.7, 0.5, 0.05);

  ensureSpace(40);
  const notRunCount = scan.results.length - scan.tests_total;
  const scoreText = scoreHeadlineFor(scan.score, scan.tests_total, scan.results.length);
  page.drawText(scoreText, {
    x: margin,
    y,
    size: 13,
    font: bold,
    color: notRunCount > 0 ? rgb(0.7, 0.5, 0.05) : ink,
  });
  page.drawText(verdictLabel, {
    x: width - margin - bold.widthOfTextAtSize(verdictLabel, 13),
    y,
    size: 13,
    font: bold,
    color: verdictColor,
  });
  y -= 18;
  const partialCount = scan.results.filter(
    (r) => rowLabelFor(r.test_key, r.status, r.evidence) === "PARTIAL",
  ).length;
  drawWrapped(
    coverageLineFor(
      scan.tests_passed,
      partialCount,
      scan.results.length - scan.tests_total,
      scan.results.length,
    ),
    { size: 10, color: muted },
  );
  if (scan.summary) drawWrapped(scan.summary, { size: 9, color: muted, gap: 6 });
  // Reviewed controls sit on their OWN line, below and visually separate from the
  // score. Folding self-attested answers into a number that means "we tested this"
  // is exactly the misrepresentation this feature exists to avoid.
  if (reviews) {
    const line = reviewSummaryLine(
      reviews as unknown as Parameters<typeof reviewSummaryLine>[0],
    );
    drawWrapped(line, { size: 9, color: muted, gap: 4 });
  }
  hr();

  // ── Per-test results ──
  drawWrapped("Findings and remediation plan", { font: bold, size: 12, gap: 4 });

  for (const r of scan.results) {
    ensureSpace(72);
    const review = reviews?.[r.test_key] ?? null;
    const statusText = rowLabelFor(r.test_key, r.status, r.evidence, review);
    const statusColor =
      statusText === "PASS"
        ? green
        : statusText === "FAIL" || statusText === "REVIEWED - GAPS"
          ? red
          : statusText === "PARTIAL"
            ? rgb(0.7, 0.5, 0.05)
            : muted;
    page.drawText(statusText, { x: margin, y, size: 10, font: bold, color: statusColor });
    page.drawText(`${r.test_name}  [${(r.severity ?? "").toUpperCase()}]`, {
      x: margin + 58,
      y,
      size: 10,
      font: bold,
      color: ink,
    });
    y -= 14;
    if (r.category) drawWrapped(r.category, { size: 8, color: muted });
    if (r.detail) drawWrapped(r.detail, { size: 9, color: ink });
    // "Observed:" would be a lie on a reviewed row — nothing was observed, the
    // customer told us. The prefix changes with the evidence source.
    if (review && review.verdict !== "not_disclosed") {
      drawWrapped("Reviewed: " + review.evidence, { size: 9, color: muted });
      for (const g of review.gaps ?? []) {
        drawWrapped(
          `Gap [${String(g.severity).toUpperCase()}]: ${g.question} Answered NO.`,
          { size: 9, color: red },
        );
        drawWrapped("Fix: " + g.remediation, { size: 9, color: green });
      }
    } else if (r.evidence) {
      drawWrapped("Observed: " + r.evidence, { size: 9, color: muted });
    }
    if (r.status === "fail" && r.remediation) {
      drawWrapped("Remediation steps:", { font: bold, size: 9, color: green });
      remediationStepsFor({ key: r.test_key, remediation: r.remediation }).forEach((step, index) => {
        drawWrapped(`${index + 1}. ${step}`, { size: 9, color: green });
      });
    }
    y -= 8;
  }

  hr();
  drawWrapped("Consumer next options", { font: bold, size: 12, gap: 4 });
  consumerOptionsFor(scan.results).forEach((option, index) => {
    drawWrapped(`${index + 1}. ${option}`, { size: 9, color: ink });
  });

  hr();
  drawWrapped(
    methodologyNoteFor(scan.results),
    { size: 8, color: muted },
  );

  const bytes = await pdf.save();
  return bytes;
}
