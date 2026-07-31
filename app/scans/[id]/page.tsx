import Link from "next/link";
import { notFound } from "next/navigation";
import { getScan, scanOwnedByCaller } from "@/lib/queries";
import { deleteScan } from "@/app/actions/scans";
import {
  VerdictBadge,
  TestStatusPill,
  SeverityTag,
  ScoreRing,
} from "@/app/_components/badges";
import { DeepScanCta } from "@/app/_components/deep-scan-cta";
import { CORE_INTERACTIVE_KEYS } from "@/lib/scan-engine";
import {
  groupRecommendations,
  ADVISORY_NOTE,
} from "@/lib/report-recommendations";

export const dynamic = "force-dynamic";

export default async function ScanDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { id } = await params;
  const { purchase } = await searchParams;
  // IDOR guard: a scan (target + vuln detail) is only viewable by the caller who
  // owns it (their session cookie / user_id). notFound() gives non-owners the same
  // response as a missing id — no confirmation the scan exists. Matches the report
  // route gate; both share the getScans ownership model.
  if (!(await scanOwnedByCaller(id))) notFound();
  const scan = await getScan(id);
  if (!scan) notFound();

  const failed = scan.results.filter((r) => r.status === "fail");
  // Consolidated advice layer, rendered under the per-check cards. Grouping and
  // severity order live in lib/report-recommendations so this page and the
  // enterprise report cannot drift apart.
  const recs = groupRecommendations(scan.results);

  return (
    <main className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"
        >
          ← Back to scanner
        </Link>

        {/* Scorecard header */}
        <div className="rounded-2xl border border-violet-100 bg-white/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-800">
                {scan.target_label || scan.target_url}
              </h1>
              <a
                href={scan.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-brand-600 hover:underline"
              >
                {scan.target_url}
              </a>
            </div>
            <VerdictBadge verdict={scan.verdict} />
          </div>

          <div className="mt-6 flex items-center gap-5">
            <ScoreRing score={scan.score} />
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-800">
                {scan.tests_passed}
                <span className="text-slate-400">/{scan.tests_total}</span>{" "}
                <span className="text-base font-normal text-slate-500">
                  checks passed
                </span>
              </p>
              <p className="text-sm text-slate-500">{scan.summary}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={`/api/scans/${scan.id}/report`}
              className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-brand-500 hover:text-brand-600"
            >
              ↓ Download PDF report
            </a>
            <form action={deleteScan}>
              <input type="hidden" name="id" value={scan.id} />
              <button
                type="submit"
                className="rounded-lg border border-violet-200 px-4 py-2 text-sm font-medium text-slate-500 hover:border-rose-300 hover:text-rose-600"
              >
                Delete
              </button>
            </form>
          </div>
        </div>

        {purchase === "success" && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Payment received — thank you! Our team will reach out to schedule
            your Enterprise deep scan.
          </div>
        )}
        {purchase === "cancelled" && (
          <div className="mt-6 rounded-xl border border-violet-100 bg-white/50 px-4 py-3 text-sm text-slate-500">
            Checkout cancelled — no charge was made.
          </div>
        )}

        {failed.length > 0 && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <strong>{failed.length}</strong>{" "}
            {failed.length === 1 ? "vulnerability" : "vulnerabilities"} found:{" "}
            {failed.map((f) => f.test_name).join(", ")}.
          </div>
        )}

        <section className="mt-6 space-y-3">
          {scan.results.map((r) => (
            <article
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.status === "fail"
                  ? "border-rose-200 bg-rose-50"
                  : "border-violet-100 bg-white/50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">
                      {r.test_name}
                    </h3>
                    <SeverityTag severity={r.severity} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{r.category}</p>
                </div>
                <TestStatusPill status={r.status} />
              </div>

              <p className="mt-3 text-sm text-slate-600">{r.detail}</p>

              {r.evidence && (
                <p className="mt-2 rounded-md bg-violet-50 px-3 py-2 font-mono text-xs text-slate-600">
                  {r.evidence}
                </p>
              )}

              {r.status === "fail" && r.remediation && (
                <p className="mt-2 text-sm text-emerald-700">
                  <span className="font-semibold">Fix: </span>
                  {r.remediation}
                </p>
              )}
            </article>
          ))}
        </section>

        {!recs.empty && (
          <section className="mt-8 rounded-2xl border border-violet-100 bg-white/70 p-6">
            <h2 className="text-lg font-bold text-slate-800">Recommendations</h2>
            <p className="mt-1 text-sm text-slate-500">
              Consolidated guidance from this scan — what to fix, what to harden,
              and what only you can verify from the inside.
            </p>

            {recs.fixNow.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-rose-700">
                  Fix now
                </h3>
                <ol className="mt-3 space-y-3">
                  {recs.fixNow.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">
                          {r.testName}
                        </h4>
                        <SeverityTag severity={r.severity} />
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
                <p className="mt-1 text-xs text-slate-400">
                  These checks passed. The guidance below keeps them passing.
                </p>
                <ol className="mt-3 space-y-3">
                  {recs.hardening.map((r) => (
                    <li
                      key={r.id}
                      className="rounded-xl border border-violet-100 bg-white/50 p-4"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">
                          {r.testName}
                        </h4>
                        <SeverityTag severity={r.severity} />
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
                      className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                    >
                      <h4 className="font-semibold text-slate-800">
                        {r.testName}
                      </h4>
                      {r.category && (
                        <p className="mt-0.5 text-xs text-slate-400">
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
          </section>
        )}

        {/* Upsell only makes sense BELOW the top tier. The extended checks
            (transport/HSTS/CSP/clickjacking + the advisory set) exist only on
            advanced/enterprise, so their presence means this buyer already has
            the deep scan — showing them a $497 upgrade card is insulting and
            makes the report look like a sales page. */}
        {!scan.results.some((r) => r.test_key === "transport_https") && (
          <DeepScanCta
            scanId={scan.id}
            email={scan.email}
            targetUrl={scan.target_url}
            categoriesRun={
              scan.results.filter(
                (r) => CORE_INTERACTIVE_KEYS.has(r.test_key) && (r.status === "pass" || r.status === "fail"),
              ).length
            }
          />
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          Transport &amp; secret-exposure checks are performed live against the target.
          Interactive prompt-injection probes run only when a chatbot endpoint is
          connected and live testing is enabled; otherwise they are marked{" "}
          <span className="font-semibold">Not run</span> — never simulated.
        </p>
      </div>
    </main>
  );
}
