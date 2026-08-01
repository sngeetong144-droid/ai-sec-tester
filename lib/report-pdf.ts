import { consumerOptionsFor, remediationStepsFor } from "@/lib/remediation-guidance";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ScanWithResults } from "@/lib/types";
import { coverageLineFor, rowLabelFor, scoreHeadlineFor } from "@/lib/report-labels";


/**
 * Builds the graded PDF audit report for a completed scan: scores, verdict,
 * per-check evidence, remediation steps and consumer next options, paginated
 * onto A4 pages with pdf-lib.
 *
 * Extracted verbatim from app/api/scans/[id]/report/route.ts so the SAME
 * renderer produces both the on-demand download and the artifact emailed to a
 * paying customer. Previously the emailed artifact was a .txt of the email body.
 */
export async function buildScanReportPdf(scan: ScanWithResults): Promise<Uint8Array> {
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
  hr();

  // ── Per-test results ──
  drawWrapped("Findings and remediation plan", { font: bold, size: 12, gap: 4 });

  for (const r of scan.results) {
    ensureSpace(72);
    const statusText = rowLabelFor(r.test_key, r.status, r.evidence);
    const statusColor =
      statusText === "PASS"
        ? green
        : statusText === "FAIL"
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
    if (r.evidence) drawWrapped("Observed: " + r.evidence, { size: 9, color: muted });
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
    "Checks are aligned with the OWASP Top-10 for LLM Applications. Interactive jailbreak probes are simulated and labelled; transport and secret-exposure checks are performed live against the target. Only scan chatbots you own or are authorized to test.",
    { size: 8, color: muted },
  );

  const bytes = await pdf.save();
  return bytes;
}
