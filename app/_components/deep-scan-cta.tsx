"use client";

import { useState } from "react";

import { PAYMENT_LINKS } from "@/lib/payment-links";

export function DeepScanCta({
  scanId,
  email,
}: {
  scanId: string;
  email: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upgrade() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/deep-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setMessage(data.error ?? "Could not start checkout.");
    } catch {
      setMessage("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-brand-500/30 bg-gradient-to-br from-brand-50 to-violet-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-slate-800">
            Want a real-world deep pentest?
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            This scan simulates the 5 standard attacks. Our{" "}
            <span className="font-semibold text-brand-600">Enterprise Grade</span>{" "}
            deep scan runs an expert-led, manual prompt-injection &amp; jailbreak
            pentest against your live chatbot — with a full written report and
            remediation plan.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">
            ${PAYMENT_LINKS.enterprise.priceUsd}
          </div>
          <div className="text-xs text-slate-400">one-time</div>
        </div>
      </div>

      <button
        onClick={upgrade}
        disabled={loading}
        className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
      >
        {loading ? "Starting checkout…" : "Upgrade to Enterprise Deep Scan →"}
      </button>

      {message && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {message}
        </p>
      )}
    </div>
  );
}
