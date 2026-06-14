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
import { DeepScanCta } from "@/app/_components/deep-scan-cta";

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
  const scan = await getScan(id);
  if (!scan) notFound();

  const failed = scan.results.filter((r) => r.status === "fail");

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
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                ↻ Run again
              </button>
            </form>
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

        <DeepScanCta scanId={scan.id} email={scan.email} />

        <p className="mt-8 text-center text-xs text-slate-400">
          Interactive jailbreak probes are simulated for safety and labelled in
          each result. Transport &amp; secret-exposure checks are performed live
          against the target.
        </p>
      </div>
    </main>
  );
}
