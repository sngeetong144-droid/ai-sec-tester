import Link from "next/link";
import { notFound } from "next/navigation";
import { getScan } from "@/lib/queries";
import { rerunScan, deleteScan } from "@/app/actions/scans";
import {
  VerdictBadge,
  TestStatusPill,
  SeverityTag,
  ScoreRing,
} from "@/app/_components/badges";

export const dynamic = "force-dynamic";

export default async function ScanDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scan = await getScan(id);
  if (!scan) notFound();

  const failed = scan.results.filter((r) => r.status === "fail");

  return (
    <main className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400"
        >
          ← Back to scanner
        </Link>

        {/* Scorecard header */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-slate-100">
                {scan.target_label || scan.target_url}
              </h1>
              <a
                href={scan.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm text-brand-400 hover:underline"
              >
                {scan.target_url}
              </a>
            </div>
            <VerdictBadge verdict={scan.verdict} />
          </div>

          <div className="mt-6 flex items-center gap-5">
            <ScoreRing score={scan.score} />
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-100">
                {scan.tests_passed}
                <span className="text-slate-500">/{scan.tests_total}</span>{" "}
                <span className="text-base font-normal text-slate-400">
                  checks passed
                </span>
              </p>
              <p className="text-sm text-slate-400">{scan.summary}</p>
            </div>
          </div>

          {/* Actions — both persist/route, no dead buttons */}
          <div className="mt-6 flex flex-wrap gap-2">
            <form action={rerunScan}>
              <input type="hidden" name="target_url" value={scan.target_url} />
              <input
                type="hidden"
                name="target_label"
                value={scan.target_label ?? ""}
              />
              <input type="hidden" name="email" value={scan.email ?? ""} />
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brand-400"
              >
                ↻ Run again
              </button>
            </form>
            <form action={deleteScan}>
              <input type="hidden" name="id" value={scan.id} />
              <button
                type="submit"
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:border-rose-500/50 hover:text-rose-300"
              >
                Delete
              </button>
            </form>
          </div>
        </div>

        {/* Failed-first summary */}
        {failed.length > 0 && (
          <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
            <strong>{failed.length}</strong>{" "}
            {failed.length === 1 ? "vulnerability" : "vulnerabilities"} found:{" "}
            {failed.map((f) => f.test_name).join(", ")}.
          </div>
        )}

        {/* Per-test results */}
        <section className="mt-6 space-y-3">
          {scan.results.map((r) => (
            <article
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.status === "fail"
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-slate-800 bg-slate-900/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-100">
                      {r.test_name}
                    </h3>
                    <SeverityTag severity={r.severity} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{r.category}</p>
                </div>
                <TestStatusPill status={r.status} />
              </div>

              <p className="mt-3 text-sm text-slate-400">{r.detail}</p>

              {r.evidence && (
                <p className="mt-2 rounded-md bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-400">
                  {r.evidence}
                </p>
              )}

              {r.status === "fail" && r.remediation && (
                <p className="mt-2 text-sm text-emerald-300/90">
                  <span className="font-semibold">Fix: </span>
                  {r.remediation}
                </p>
              )}
            </article>
          ))}
        </section>

        <p className="mt-8 text-center text-xs text-slate-600">
          Interactive jailbreak probes are simulated for safety and labelled in
          each result. Transport &amp; secret-exposure checks are performed live
          against the target.
        </p>
      </div>
    </main>
  );
}
