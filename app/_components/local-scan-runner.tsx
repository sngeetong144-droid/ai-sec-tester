"use client";

import { useState } from "react";
import type { ScanTier, TieredEngineResult } from "@/lib/tiered-scan-engine";
import { JURISDICTION_NOTICE } from "@/lib/jurisdiction-policy";
import { consumerOptionsFor, remediationStepsFor } from "@/lib/remediation-guidance";

type LocalScanResult = TieredEngineResult & {
  target_url: string;
  scanned_at: string;
};

interface LocalScanRunnerProps {
  mode?: "embedded" | "console";
}

const TIERS: Array<{ id: ScanTier; label: string; detail: string }> = [
  { id: "basic", label: "Basic", detail: "5 OWASP LLM checks" },
  { id: "pro", label: "Pro", detail: "10 app + LLM checks" },
  { id: "enterprise", label: "Enterprise", detail: "15 full local checks" },
];

export function LocalScanRunner({ mode = "embedded" }: LocalScanRunnerProps) {
  const [targetUrl, setTargetUrl] = useState("");
  const [tier, setTier] = useState<ScanTier>("enterprise");
  const [allowLocal, setAllowLocal] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LocalScanResult | null>(null);
  const isConsole = mode === "console";

  async function runLocalScan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/local-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target_url: targetUrl,
          authorized,
          tier,
          allow_local: isConsole && allowLocal,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Local scan failed.");
      }
      setResult(data as LocalScanResult);
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ""));
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdfReport() {
    if (!result) return;
    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/local-scan/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Could not export PDF report.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName = result.target_url
        .replace(/^https?:\/\//i, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 44)
        .toLowerCase();
      link.href = url;
      link.download = `ai-sec-local-report-${safeName || "scan"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(String(err).replace(/^Error:\s*/, ""));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section
      className={
        isConsole
          ? "min-h-screen bg-slate-950 px-5 py-6 text-slate-100"
          : "mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm"
      }
    >
      <div className={isConsole ? "mx-auto max-w-6xl" : ""}>
      <div className="mb-4">
        <p
          className={
            isConsole
              ? "text-xs font-semibold uppercase tracking-wide text-emerald-300"
              : "text-xs font-semibold uppercase tracking-wide text-emerald-700"
          }
        >
          {isConsole ? "Command Center Scan Tool" : "Local development scanner"}
        </p>
        <h2
          className={
            isConsole
              ? "mt-1 text-2xl font-semibold text-white"
              : "mt-1 text-lg font-semibold text-slate-800"
          }
        >
          {isConsole
            ? "Full local AI security scanner"
            : "Run the scan engine locally without login"}
        </h2>
        <p
          className={
            isConsole
              ? "mt-1 max-w-3xl text-sm leading-relaxed text-slate-300"
              : "mt-1 text-sm leading-relaxed text-slate-600"
          }
        >
          {isConsole
            ? "Internal Command Center surface. Runs Basic, Pro, or Enterprise tier checks locally with no public pricing, checkout, production deploy, or Supabase write."
            : "This panel is available only in local development. It uses the real scanner engine but does not write Supabase scan history."}
        </p>
      </div>

      <form
        onSubmit={runLocalScan}
        className={
          isConsole
            ? "grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-[1fr_360px]"
            : "space-y-4"
        }
      >
        <div className="space-y-4">
        <div>
          <label
            htmlFor="local_target_url"
            className={
              isConsole
                ? "mb-1.5 block text-sm font-medium text-slate-200"
                : "mb-1.5 block text-sm font-medium text-slate-700"
            }
          >
            Chatbot URL
          </label>
          <input
            id="local_target_url"
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            type="text"
            inputMode="url"
            placeholder="scan.thesoulsofai.com"
            required
            disabled={loading}
            className={
              isConsole
                ? "w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60"
                : "w-full rounded-lg border border-emerald-200 bg-white px-4 py-3 text-slate-800 placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25 disabled:opacity-60"
            }
          />
        </div>

        <div>
          <p
            className={
              isConsole
                ? "mb-2 text-sm font-medium text-slate-200"
                : "mb-2 text-sm font-medium text-slate-700"
            }
          >
            Scan depth
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {TIERS.map((item) => (
              <label
                key={item.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-sm transition ${
                  tier === item.id
                    ? isConsole
                      ? "border-emerald-400 bg-emerald-500/15 text-emerald-100"
                      : "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : isConsole
                      ? "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  value={item.id}
                  checked={tier === item.id}
                  onChange={() => setTier(item.id)}
                  className="sr-only"
                />
                <span className="block font-semibold">{item.label}</span>
                <span className="text-xs opacity-75">{item.detail}</span>
              </label>
            ))}
          </div>
        </div>

        <label
          className={
            isConsole
              ? "flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm leading-relaxed text-amber-100"
              : "flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900"
          }
        >
          <input
            type="checkbox"
            checked={authorized}
            onChange={(event) => setAuthorized(event.target.checked)}
            required
            disabled={loading}
            className="mt-0.5 size-4 rounded border-amber-300 bg-white accent-emerald-600"
          />
          <span>
            I own this chatbot, or I am authorized to run a security test
            against it. {JURISDICTION_NOTICE}
          </span>
        </label>

        {isConsole && (
          <label className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-relaxed text-slate-300">
            <input
              type="checkbox"
              checked={allowLocal}
              onChange={(event) => setAllowLocal(event.target.checked)}
              disabled={loading}
              className="mt-0.5 size-4 rounded border-slate-500 bg-slate-900 accent-emerald-500"
            />
            <span>
              Allow localhost targets for owned local demos such as n8n webhook
              examples. Scan the chatbot webhook, not this Command Center page.
              This is only available in the internal development console.
            </span>
          </label>
        )}

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Scanning..." : `Run ${tier[0].toUpperCase() + tier.slice(1)} Scan`}
        </button>
        </div>

        {isConsole && (
          <aside className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm font-semibold text-white">Local-only guarantees</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>No production site route required.</li>
              <li>No checkout or payment link.</li>
              <li>No Supabase scan-history write.</li>
              <li>Private/internal IPs are blocked unless you explicitly allow localhost.</li>
              <li>Enterprise mode runs all 15 checks.</li>
              <li>For n8n demos, scan the webhook URL on port 5679.</li>
            </ul>
          </aside>
        )}
      </form>

      {result && (
        <div
          className={
            isConsole
              ? "mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4"
              : "mt-5 rounded-xl border border-emerald-200 bg-white/80 p-4"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={isConsole ? "text-sm font-semibold text-white" : "text-sm font-semibold text-slate-800"}>
                {result.target_url}
              </p>
              <p className={isConsole ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                {result.tier.toUpperCase()} · {result.summary}
              </p>
              <p className={isConsole ? "mt-1 text-xs text-slate-500" : "mt-1 text-xs text-slate-400"}>
                Checks: basic {result.checks_by_tier.basic}, pro{" "}
                {result.checks_by_tier.pro}, enterprise{" "}
                {result.checks_by_tier.enterprise}
              </p>
            </div>
            <div className="rounded-lg bg-slate-900 px-3 py-2 text-right text-white">
              <p className="text-xs uppercase tracking-wide text-slate-300">
                Score
              </p>
              <p className="text-lg font-bold">{result.score}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={downloadPdfReport}
              disabled={exporting}
              className={
                isConsole
                  ? "rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  : "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              }
            >
              {exporting ? "Preparing PDF..." : "Download PDF Report"}
            </button>
            <span className={isConsole ? "text-xs text-slate-500" : "text-xs text-slate-400"}>
              Includes score, findings, evidence, and fix guidance.
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {result.results.map((item) => (
              <li
                key={item.key}
                className={
                  isConsole
                    ? "rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
                    : "rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={isConsole ? "text-sm font-medium text-slate-100" : "text-sm font-medium text-slate-800"}>
                    {item.name}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      item.status === "pass"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className={isConsole ? "mt-1 text-xs leading-relaxed text-slate-400" : "mt-1 text-xs leading-relaxed text-slate-500"}>
                  {item.evidence}
                </p>
                {item.status === "fail" && (
                  <div
                    className={
                      isConsole
                        ? "mt-2 rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2"
                        : "mt-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2"
                    }
                  >
                    <p className={isConsole ? "text-xs font-semibold text-amber-100" : "text-xs font-semibold text-amber-800"}>
                      Remediation steps
                    </p>
                    <ol className={isConsole ? "mt-1 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-amber-100" : "mt-1 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-amber-800"}>
                      {remediationStepsFor(item).map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div
            className={
              isConsole
                ? "mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-3"
                : "mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3"
            }
          >
            <p className={isConsole ? "text-sm font-semibold text-emerald-100" : "text-sm font-semibold text-emerald-800"}>
              Consumer next options
            </p>
            <ol className={isConsole ? "mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-emerald-100" : "mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-emerald-800"}>
              {consumerOptionsFor(result.results).map((option) => (
                <li key={option}>{option}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
