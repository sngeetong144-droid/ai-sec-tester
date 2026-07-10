import Link from "next/link";
import "./landing.css";
import { createClient } from "@/lib/supabase/server";
import { getScans } from "@/lib/queries";
import { deleteScan } from "@/app/actions/scans";
import { VerdictBadge } from "@/app/_components/badges";
import { PricingTiers } from "@/app/_components/pricing-tiers";
import { Landing, LandingFooter } from "@/app/_components/landing";
import { SeoJsonLd } from "@/app/_components/faq";
import { JURISDICTION_NOTICE } from "@/lib/jurisdiction-policy";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const scans = user ? await getScans() : [];

  // Anonymous visitors get the faithful emerald marketing landing (ported from
  // the static design). Every tier CTA routes to /enterprise (the scan
  // authorization request flow) — NO payment/checkout links on the public page.
  if (!user) {
    return (
      <main className="grid-bg min-h-screen">
        <SeoJsonLd />
        <Landing />

        <div className="aist-landing">
          <div className="wrap" style={{ paddingBottom: 40 }}>
            <p className="muted" style={{ fontSize: 13.5, textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
              AI Sec Tester is for defensive chatbot assessments on systems you own or
              are explicitly authorized to test. {JURISDICTION_NOTICE}
            </p>
          </div>
        </div>

        <LandingFooter />
      </main>
    );
  }

  // Authenticated users get the working scanner + history + pricing.
  return (
    <main className="grid-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">

        {/* Hero */}
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/60 px-3 py-1 text-xs text-brand-600">
            <span className="size-1.5 rounded-full bg-brand-500" />
            AI Chatbot Security Scanner
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800 sm:text-4xl">
            Is your AI chatbot{" "}
            <span className="text-brand-600">easy to jailbreak?</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-500">
            Run OWASP-aligned prompt-injection and jailbreak checks against your
            chatbot. Get a Pass/Fail security scorecard with remediation guidance
            in seconds.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-amber-900">
          <p className="font-semibold">Compliance guardrail</p>
          <p className="mt-1">
            AI Sec Tester is for defensive chatbot assessments on systems you own
            or are explicitly authorized to test. {JURISDICTION_NOTICE}
          </p>
        </section>

        {/* Self-serve scanning has been removed — the scan engine runs only when
            an admin activates a paid case in the Command Center. */}

        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">Recent scans</h2>
            <span className="text-sm text-slate-400">{scans.length} total</span>
          </div>

          {scans.length === 0 ? (
            <p className="rounded-xl border border-dashed border-violet-200 bg-white/40 px-4 py-10 text-center text-slate-400">
              No scans yet. Run your first security scan above.
            </p>
          ) : (
            <ul className="space-y-2">
              {scans.map((scan) => (
                <li
                  key={scan.id}
                  className="group flex items-center gap-3 rounded-xl border border-violet-100 bg-white/60 px-4 py-3 transition hover:border-violet-200"
                >
                  <Link
                    href={`/scans/${scan.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-700">
                        {scan.target_label || scan.target_url}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {scan.target_url} · {timeAgo(scan.created_at)} ·{" "}
                        {scan.tests_passed}/{scan.tests_total} passed
                      </p>
                    </div>
                    {scan.status === "complete" ? (
                      <VerdictBadge verdict={scan.verdict} />
                    ) : (
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {scan.status}
                      </span>
                    )}
                  </Link>
                  <form action={deleteScan}>
                    <input type="hidden" name="id" value={scan.id} />
                    <button
                      type="submit"
                      title="Delete scan"
                      className="rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M8 6V4h8v2m-9 0v14h10V6" />
                      </svg>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pricing */}
        <div id="pricing">
          <PricingTiers />
        </div>

      </div>
    </main>
  );
}
