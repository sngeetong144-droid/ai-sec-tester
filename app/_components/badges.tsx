import type { Scan, ScanResultRow } from "@/lib/types";

export function VerdictBadge({ verdict }: { verdict: Scan["verdict"] }) {
  const map: Record<string, string> = {
    pass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    fail: "bg-rose-50 text-rose-700 ring-rose-200",
  };
  const label: Record<string, string> = {
    pass: "Secure",
    warn: "Needs attention",
    fail: "Vulnerable",
  };
  const v = verdict ?? "warn";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${map[v]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label[v]}
    </span>
  );
}

export function TestStatusPill({ status }: { status: ScanResultRow["status"] }) {
  const pass = status === "pass";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ring-1 ${
        pass
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
      }`}
    >
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: ScanResultRow["severity"] }) {
  const map: Record<string, string> = {
    low: "text-slate-500 ring-slate-300",
    medium: "text-amber-700 ring-amber-300",
    high: "text-orange-700 ring-orange-300",
    critical: "text-rose-700 ring-rose-300",
  };
  const s = severity ?? "low";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${map[s]}`}
    >
      {s}
    </span>
  );
}

export function ScoreRing({ score }: { score: number | null }) {
  const value = score ?? 0;
  const color =
    value >= 80
      ? "text-emerald-600"
      : value >= 50
        ? "text-amber-600"
        : "text-rose-600";
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative size-20 shrink-0">
      <svg viewBox="0 0 60 60" className="size-20 -rotate-90">
        <circle
          cx="30"
          cy="30"
          r="26"
          fill="none"
          strokeWidth="6"
          className="stroke-slate-200"
        />
        <circle
          cx="30"
          cy="30"
          r="26"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${color} transition-all`}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${color}`}>{value}</span>
        <span className="text-[9px] uppercase tracking-wider text-slate-400">
          score
        </span>
      </div>
    </div>
  );
}
