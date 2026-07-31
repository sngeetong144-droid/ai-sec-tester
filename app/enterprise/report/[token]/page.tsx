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
import {
  groupRecommendations,
  ADVISORY_NOTE,
} from "@/lib/report-recommendations";

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
  // Consolidated advice layer under the per-check cards. Same grouping + severity
  // order as /scans/[id] — one rule in lib/report-recommendations, two surfaces.
  const recs = groupRecommendations(scan.results);
  // A check that never ran is stored as "pending". The score is computed only from
  // checks that DID run, so a page showing a bare "100 / SECURE" while the five
  // interactive OWASP categories were skipped reads as an all-clear the scan never
  // earned. Name the gap next to the score, not in a footnote.
  const CORE_INTERACTIVE = [
    "system_prompt_leak",
    "instruction_override",
    "jailbreak_persona",
    "data_exfiltration",
    "unsafe_content",
  ];
  const notRun = scan.results.filter((r) => r.status === "pending");
  const coreSkipped = CORE_INTERACTIVE.filter((k) =>
    notRun.some((r) => r.test_key === k),
  ).length;

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

        {/* Incomplete banner — must sit ABOVE the failure banner: "we could not
            test this" outranks "we found N issues" when deciding what the score means. */}
        {coreSkipped > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">
              Incomplete scan — {coreSkipped} of 5 interactive checks did not run.
            </span>{" "}
            The score above covers only the {scan.results.length - notRun.length} checks that
            completed, so it is not an all-clear for prompt-injection resistance. The usual cause
            is that the scan was pointed at a web page rather than the chatbot&rsquo;s message
            endpoint — re-run against the URL the chat widget posts to.
          </div>
        )}

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

        {/* Consolidated recommendations */}
        {!recs.empty && (
          <div className="mt-8 rounded-2xl border border-violet-100 bg-white/60 p-6">
            <h2 className="text-lg font-bold text-slate-800">Recommendations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Consolidated guidance from this scan — what to fix, what to harden,
              and what only you can verify from the inside.
            </p>

            {recs.fixNow.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-rose-700">Fix now</h3>
                <ol className="mt-3 space-y-3">
                  {recs.fixNow.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-800">
                          {r.testName}
                        </h4>
                        {r.severity && <SeverityTag severity={r.severity} />}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {r.remediation}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {recs.hardening.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-emerald-700">
                  Hardening
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  These checks passed. The guidance below keeps them passing.
                </p>
                <ol className="mt-3 space-y-3">
                  {recs.hardening.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-violet-100 bg-white/60 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-slate-800">
                          {r.testName}
                        </h4>
                        {r.severity && <SeverityTag severity={r.severity} />}
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {r.remediation}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {recs.advisory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-amber-700">
                  Advisory — cannot be tested from outside
                </h3>
                <p className="mt-1 text-sm text-slate-500">{ADVISORY_NOTE}</p>
                <ol className="mt-3 space-y-3">
                  {recs.advisory.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                    >
                      <h4 className="font-semibold text-slate-800">
                        {r.testName}
                      </h4>
                      {r.category && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {r.category}
                        </p>
                      )}
                      {r.remediation ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {r.remediation}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500">
                          No stored guidance for this check on this scan — re-run
                          the scan to capture it.
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

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
