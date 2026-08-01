/**
 * report-artifact.test.ts — the paid deliverable. Pins the two production
 * regressions: the upload MUST be application/pdf (it was the plain-text email
 * body), and failure paths MUST return null rather than throw. NOT covered:
 * the signed-url-error branch (upload ok, signing fails).
 */
import { test, expect, mock, beforeEach } from "bun:test";

let uploaded: { contentType?: string; upsert?: boolean; bytes: number } | null = null;
let upErr: { message: string } | null = null, pdfThrows = false;

mock.module("@/lib/report-pdf", () => ({
  buildScanReportPdf: async () => {
    if (pdfThrows) throw new Error("render exploded");
    return new Uint8Array([37, 80, 68, 70]); // %PDF
  },
}));
const { storeReportArtifact } = await import("../lib/command-center/report-artifact");

const supa = {
  storage: {
    from: () => ({
      upload: async (_p: string, body: Buffer, o: Record<string, unknown>) => {
        uploaded = { ...o, bytes: body.length };
        return { error: upErr };
      },
      createSignedUrl: async () => ({ data: { signedUrl: "https://signed/r.pdf" }, error: null }),
    }),
  },
};
const scan = { id: "s1", results: [] } as never;
beforeEach(() => { uploaded = null; upErr = null; pdfThrows = false; });

test("uploads application/pdf and returns the signed URL", async () => {
  const url = await storeReportArtifact(supa, "req-1", scan);
  expect(uploaded?.contentType).toBe("application/pdf");
  expect(uploaded?.upsert).toBe(true);
  expect(url).toBe("https://signed/r.pdf");
});

test("upload error returns null, never throws", async () => {
  upErr = { message: "bucket missing" };
  expect(await storeReportArtifact(supa, "req-1", scan)).toBe(null);
});

test("a thrown renderer returns null instead of killing the scan", async () => {
  pdfThrows = true;
  expect(await storeReportArtifact(supa, "req-1", scan)).toBe(null);
});
