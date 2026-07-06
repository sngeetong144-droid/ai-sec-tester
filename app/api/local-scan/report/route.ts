import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { NextResponse } from "next/server";
import type { TestResult } from "@/lib/scan-engine";
import type { ScanTier } from "@/lib/tiered-scan-engine";
import { consumerOptionsFor, remediationStepsFor } from "@/lib/remediation-guidance";

export const dynamic = "force-dynamic";

// Companion to the dev-only local scanner (app/api/local-scan/route.ts). Same
// gate: the PDF export runs pdf-lib on an unauthenticated client-supplied body,
// so it must not be reachable in production.
function localScannerEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

type LocalReportBody = {
  target_url?: string;
  scanned_at?: string;
  tier?: ScanTier;
  score?: number;
  tests_total?: number;
  tests_passed?: number;
  verdict?: "pass" | "warn" | "fail";
  summary?: string;
  checks_by_tier?: { basic?: number; pro?: number; enterprise?: number };
  results?: TestResult[];
};

function safeText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function safeFilename(value: string): string {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 44)
    .toLowerCase();
}

function isLocalhostTarget(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname.endsWith(".localhost");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!localScannerEnabled()) {
    return NextResponse.json({ error: "Local scanner is disabled." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as LocalReportBody | null;

  if (!body || !body.target_url || !Array.isArray(body.results)) {
    return NextResponse.json(
      { error: "A local scan result is required to export a PDF." },
      { status: 400 },
    );
  }

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.09, 0.11, 0.16);
  const muted = rgb(0.42, 0.45, 0.5);
  const green = rgb(0.13, 0.55, 0.33);
  const red = rgb(0.78, 0.18, 0.27);
  const amber = rgb(0.7, 0.48, 0.05);
  const brand = rgb(0.04, 0.48, 0.38);

  const margin = 54;
  let page = pdf.addPage([595, 842]);
  const width = page.getWidth();
  let y = page.getHeight() - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([595, 842]);
      y = page.getHeight() - margin;
    }
  };

  const drawWrapped = (
    raw: string,
    opts: { font?: PDFFont; size?: number; color?: typeof ink; gap?: number } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    const color = opts.color ?? ink;
    const maxWidth = width - margin * 2;
    const words = safeText(raw).split(/\s+/).filter(Boolean);
    let line = "";

    const flush = () => {
      ensureSpace(size + 5);
      page.drawText(line, { x: margin, y, size, font: f, color });
      y -= size + 5;
    };

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        flush();
        line = word;
      } else {
        line = candidate;
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
      color: rgb(0.84, 0.86, 0.9),
    });
    y -= 14;
  };

  const tier = body.tier ?? "enterprise";
  const testsTotal = Number(body.tests_total ?? body.results.length);
  const testsPassed = Number(
    body.tests_passed ?? body.results.filter((item) => item.status === "pass").length,
  );
  const score = Number(body.score ?? Math.round((testsPassed / testsTotal) * 100));
  const verdict = body.verdict ?? (testsPassed === testsTotal ? "pass" : "warn");
  const verdictLabel =
    verdict === "pass" ? "PASS" : verdict === "fail" ? "FAIL" : "NEEDS ATTENTION";
  const verdictColor = verdict === "pass" ? green : verdict === "fail" ? red : amber;
  const localhostTarget = isLocalhostTarget(body.target_url);

  page.drawText("AI Sec Tester", { x: margin, y, size: 20, font: bold, color: brand });
  y -= 24;
  page.drawText("Command Center Local Scan Report", {
    x: margin,
    y,
    size: 12,
    font,
    color: muted,
  });
  y -= 26;
  hr();

  drawWrapped(body.target_url, { font: bold, size: 14 });
  drawWrapped(`Tier: ${tier.toUpperCase()}`, { size: 10, color: muted });
  drawWrapped(`Scanned: ${safeText(body.scanned_at || new Date().toISOString())}`, {
    size: 9,
    color: muted,
    gap: 8,
  });

  ensureSpace(56);
  page.drawText(`Security score: ${score}/100`, {
    x: margin,
    y,
    size: 13,
    font: bold,
    color: ink,
  });
  page.drawText(verdictLabel, {
    x: width - margin - bold.widthOfTextAtSize(verdictLabel, 13),
    y,
    size: 13,
    font: bold,
    color: verdictColor,
  });
  y -= 18;
  drawWrapped(`${testsPassed}/${testsTotal} checks passed.`, { size: 10, color: muted });

  const checks = body.checks_by_tier ?? {};
  drawWrapped(
    `Check groups: basic ${checks.basic ?? 0}, pro ${checks.pro ?? 0}, enterprise ${checks.enterprise ?? 0}.`,
    { size: 9, color: muted },
  );
  if (body.summary) drawWrapped(body.summary, { size: 9, color: muted, gap: 6 });
  if (localhostTarget) {
    drawWrapped(
      "Localhost note: this report is for an internal development target. Treat TLS, public hosting, and iframe-embedding findings as local-environment limitations when they come from the dev host. Chatbot behavior findings still require fixes.",
      { size: 9, color: amber, gap: 6 },
    );
  }
  hr();

  drawWrapped("Findings and remediation plan", { font: bold, size: 12, gap: 4 });

  for (const item of body.results) {
    ensureSpace(72);
    const statusText = item.status === "pass" ? "PASS" : "FAIL";
    const statusColor = item.status === "pass" ? green : red;
    page.drawText(statusText, { x: margin, y, size: 10, font: bold, color: statusColor });
    page.drawText(`${safeText(item.name)} [${safeText(item.severity).toUpperCase()}]`, {
      x: margin + 42,
      y,
      size: 10,
      font: bold,
      color: ink,
    });
    y -= 14;
    if (item.category) drawWrapped(item.category, { size: 8, color: muted });
    if (item.detail) drawWrapped(item.detail, { size: 9, color: ink });
    if (item.evidence) drawWrapped(`Observed: ${item.evidence}`, { size: 9, color: muted });
    if (item.status === "fail" && item.remediation) {
      drawWrapped("Remediation steps:", { font: bold, size: 9, color: green });
      remediationStepsFor(item).forEach((step, index) => {
        drawWrapped(`${index + 1}. ${step}`, { size: 9, color: green });
      });
    }
    y -= 8;
  }

  hr();
  drawWrapped("Consumer next options", { font: bold, size: 12, gap: 4 });
  consumerOptionsFor(body.results).forEach((option, index) => {
    drawWrapped(`${index + 1}. ${option}`, { size: 9, color: ink });
  });

  hr();
  drawWrapped(
    "Local Command Center report. Checks are aligned with OWASP Top-10 for LLM Applications. Use only on chatbots you own or are authorized to test. Localhost targets are allowed only through the internal development console; scan the chatbot endpoint, not the scanner console.",
    { size: 8, color: muted },
  );

  const bytes = await pdf.save();
  const filename = safeFilename(body.target_url) || "local-scan";

  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="ai-sec-local-report-${filename}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
