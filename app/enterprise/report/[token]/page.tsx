import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { makeReportToken } from "@/lib/hmac";
import { getScan } from "@/lib/queries";
import {
  VerdictBadge,
  ScoreRing,
  SeverityTag,
  TestStatusPill,
} from "@/app/_components/badges";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: rows } = await supabase.rpc(
    "get_enterprise_request_by_report_token",
    { p_token: token },
  );
  const req = Array.isArray(rows) ? rows[0] : rows;

  if (!req) return notFound();
  if (makeReportToken(req.id) !== token) return notFound();

  if (!req.scan_id) {
    return (
      <main className="grid-bg min-h-screen flex items-center justify-center">
        <div className="mx-auto max-w-xl px-5 py-16 text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-3">
            Scan in Progress
          </h1>
          <p className="text-slate-500">
            Your scan is still running. Check back in a moment or wait for the
            report email.
          </p>
        </div>
      </main>
    );
  }

  const scan = await getScan(req.scan_id);
  if (!scan) return notFound();

  const failCount = scan.results.filter((r) => r.status === "fail").length;

  return (
    <main className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-12">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-brand-600">
            AI Sec Tester
          </Link>
          <span>/</span>
          <span>Enterprise Report</span>
        </div>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Authorized Enterprise Scan
            </p>
            <h1 className="text-2xl font-bold text-slate-800 break-all">
              {scan.target_url}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Prepared for {req.full_name}
              {req.company ? ` · ${req.company}` : ""}
            </p>
          </div>
          <a
            href={`/api/scans/${scan.id}/report?token=${token}`}
            className="shrink-0 rounded-lg border border-violet-200 bg-white/60 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-500 hover:text-brand-600"
          >
            Download PDF
          </a>
        </div>

        {/* Score summary */}
        <div className="mb-8 flex items-center gap-5 rounded-2xl border border-violet-100 bg-white/70 px-6 py-5">
          <ScoreRing score={scan.score} />
          <div className="flex-1">
            <VerdictBadge verdict={scan.verdict} />
            <p className="mt-2 text-sm text-slate-500">{scan.summary}</p>
          </div>
        </div>

        {/* Failure banner */}
        {failCount > 0 && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-semibold">{failCount} issue{failCount > 1 ? "s" : ""} found.</span>{" "}
            Review each FAIL card below for remediation guidance.
          </div>
        )}

        {/* Test results */}
        <div className="space-y-3">
          {scan.results.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-violet-100 bg-white/60 p-5"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TestStatusPill status={r.status} />
                  <h3 className="font-semibold text-slate-800">{r.test_name}</h3>
                </div>
                {r.severity && <SeverityTag severity={r.severity} />}
              </div>
              {r.category && (
                <p className="mb-2 text-xs text-slate-500">{r.category}</p>
              )}
              {r.evidence && (
                <p className="text-sm text-slate-600">{r.evidence}</p>
              )}
              {r.status === "fail" && r.remediation && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold text-emerald-700">
                    Remediation
                  </p>
                  <p className="text-sm text-slate-600">{r.remediation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Re-scan CTA */}
        {!req.re_scan_used && (
          <div className="mt-8 rounded-2xl border border-violet-200 bg-brand-50 p-6">
            <h3 className="mb-2 font-semibold text-brand-600">
              Free Re-Scan Available
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Once you&apos;ve addressed the findings above, use your
              complimentary re-scan to verify the fixes.
            </p>
            <a
              href={`/enterprise/rescan?token=${req.re_scan_token}`}
              className="inline-block rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Run Free Re-Scan
            </a>
          </div>
        )}

        {req.re_scan_used && (
          <div className="mt-8 rounded-2xl border border-violet-100 bg-white/60 px-5 py-4 text-center text-sm text-slate-500">
            Complimentary re-scan used.{" "}
            <a href="/enterprise" className="text-brand-600 hover:underline">
              Submit a new Enterprise request
            </a>{" "}
            to run additional scans.
          </div>
        )}
      </div>
    </main>
  );
}
