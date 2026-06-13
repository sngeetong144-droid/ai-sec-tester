import Link from "next/link";
import { getScans } from "@/lib/queries";
import { deleteScan } from "@/app/actions/scans";
import { ScanRunner } from "@/app/_components/scan-runner";
import { VerdictBadge } from "@/app/_components/badges";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function Home() {
  const scans = await getScans();

  return (
    <main className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        {/* Hero */}
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-brand-400">
            <span className="size-1.5 rounded-full bg-brand-400" />
            AI Chatbot Security Scanner
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Is your AI chatbot{" "}
            <span className="text-brand-400">easy to jailbreak?</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Paste your chatbot&apos;s URL and run 5 standard prompt-injection &amp;
            jailbreak checks. Get a Pass/Fail security scorecard in seconds — no
            signup required.
          </p>
        </header>

        <ScanRunner />

        {/* History */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-200">
              Recent scans
            </h2>
            <span className="text-sm text-slate-500">{scans.length} total</span>
          </div>

          {scans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 px-4 py-10 text-center text-slate-500">
              No scans yet. Run your first security scan above.
            </p>
          ) : (
            <ul className="space-y-2">
              {scans.map((scan) => (
                <li
                  key={scan.id}
                  className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 transition hover:border-slate-700"
                >
                  <Link
                    href={`/scans/${scan.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-200">
                        {scan.target_label || scan.target_url}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {scan.target_url} · {timeAgo(scan.created_at)} ·{" "}
                        {scan.tests_passed}/{scan.tests_total} passed
                      </p>
                    </div>
                    {scan.status === "complete" ? (
                      <VerdictBadge verdict={scan.verdict} />
                    ) : (
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {scan.status}
                      </span>
                    )}
                  </Link>
                  <form action={deleteScan}>
                    <input type="hidden" name="id" value={scan.id} />
                    <button
                      type="submit"
                      title="Delete scan"
                      className="rounded-md p-1.5 text-slate-600 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-400 group-hover:opacity-100"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6" />
                      </svg>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-16 text-center text-xs text-slate-600">
          Checks are aligned with the OWASP Top-10 for LLM Applications. Only
          scan chatbots you own or are authorized to test.
        </footer>
      </div>
    </main>
  );
}
