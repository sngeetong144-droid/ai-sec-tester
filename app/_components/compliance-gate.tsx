"use client";

import { useState, useEffect } from "react";
import {
  LICENSE_RESTRICTED_JURISDICTIONS,
  RESTRICTED_JURISDICTION_CODES,
  getRestrictedTargetMessage,
  isSanctionedCountry,
  COUNTRIES,
  type RestrictedJurisdictionCode,
} from "@/lib/jurisdiction-policy";

// Kept for reference / any local iteration; the canonical list now lives in
// lib/jurisdiction-policy.ts and is shared with the server scan-request route.

interface ComplianceGateProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function ComplianceGate({ href, children, className }: ComplianceGateProps) {
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState("");
  const [ip, setIp] = useState<string | null>(null);
  const [checks, setChecks] = useState({ ofac: false, authorized: false, understood: false });

  // Fetch IP for display only — no server storage
  useEffect(() => {
    if (!open) return;
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => setIp(d.ip))
      .catch(() => setIp("unavailable"));
  }, [open]);

  const isBlocked = country !== "" && isSanctionedCountry(country);
  const restrictedJurisdiction =
    country !== "" && RESTRICTED_JURISDICTION_CODES.has(country as RestrictedJurisdictionCode)
      ? LICENSE_RESTRICTED_JURISDICTIONS.find((j) => j.code === country)
      : null;
  const allChecked = checks.ofac && checks.authorized && checks.understood;
  const canProceed = allChecked && country !== "" && !isBlocked && !restrictedJurisdiction;

  function handleOpen(e: React.MouseEvent) {
    e.preventDefault();
    // Reset state each time modal opens
    setCountry("");
    setIp(null);
    setChecks({ ofac: false, authorized: false, understood: false });
    setOpen(true);
  }

  function handleProceed() {
    if (!canProceed) return;
    setOpen(false);
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function handleCancel() {
    setOpen(false);
  }

  return (
    <>
      {/* Trigger — renders whatever button/link the caller passes */}
      <a href={href} onClick={handleOpen} className={className}>
        {children}
      </a>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-[#F0EEFF] p-6 shadow-xl">

            {/* Header */}
            <div className="mb-5">
              <h2 className="text-base font-bold text-slate-800">
                Compliance Verification Required
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                This tool is for authorized security testing only. Please confirm the
                following before proceeding to checkout.
              </p>
            </div>

            {/* IP display */}
            <div className="mb-4 rounded-lg border border-violet-100 bg-white/60 px-3 py-2">
              <p className="text-xs text-slate-400">
                Detected IP:{" "}
                <span className="font-mono text-slate-600">
                  {ip === null ? "detecting…" : ip}
                </span>
                <span className="ml-2 text-slate-400">(displayed only, not stored)</span>
              </p>
            </div>

            {/* Country selector */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Your country of residence <span className="text-rose-500">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
              >
                <option value="">— Select country —</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* OFAC hard block */}
            {isBlocked && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm font-semibold text-rose-700">
                  Access Restricted
                </p>
                <p className="mt-1 text-xs text-rose-600">
                  This service is not available in your selected country due to U.S.
                  Office of Foreign Assets Control (OFAC) sanctions regulations.
                  We are unable to process this transaction.
                </p>
              </div>
            )}

            {restrictedJurisdiction && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-800">
                  Licensed Provider Required
                </p>
                <p className="mt-1 text-xs leading-relaxed text-amber-700">
                  {getRestrictedTargetMessage(restrictedJurisdiction)}
                </p>
              </div>
            )}

            {/* Attestation checkboxes */}
            <div className="mb-5 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.ofac}
                  onChange={(e) => setChecks((p) => ({ ...p, ofac: e.target.checked }))}
                  className="mt-0.5 size-4 shrink-0 accent-brand-600"
                />
                <span className="text-xs text-slate-600">
                  I confirm I am not located in a sanctioned country (OFAC list)
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.authorized}
                  onChange={(e) => setChecks((p) => ({ ...p, authorized: e.target.checked }))}
                  className="mt-0.5 size-4 shrink-0 accent-brand-600"
                />
                <span className="text-xs text-slate-600">
                  I am purchasing for legitimate security testing of systems I own or have
                  authorization to test
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks.understood}
                  onChange={(e) => setChecks((p) => ({ ...p, understood: e.target.checked }))}
                  className="mt-0.5 size-4 shrink-0 accent-brand-600"
                />
                <span className="text-xs text-slate-600">
                  I understand this tool is for authorized security testing only
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-violet-200 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                disabled={!canProceed}
                className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to checkout
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
