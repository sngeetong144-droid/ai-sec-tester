import type { Scan, ScanResultRow } from "@/lib/types";

export function VerdictBadge({ verdict }: { verdict: Scan["verdict"] }) {
  const map: Record<string, string> = {
    pass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    fail: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
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
          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
          : "bg-rose-500/15 text-rose-300 ring-rose-500/30"
      }`}
    >
      {pass ? "PASS" : "FAIL"}
    </span>
  );
}

export function SeverityTag({ severity }: { severity: ScanResultRow["severity"] }) {
  const map: Record<string, string> = {
    low: "text-slate-400 ring-slate-600",
    medium: "text-amber-300 ring-amber-500/40",
    high: "text-orange-300 ring-orange-500/40",
    critical: "text-rose-300 ring-rose-500/40",
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
      ? "text-emerald-400"
      : value >= 50
        ? "text-amber-400"
        : "text-rose-400";
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
          className="stroke-slate-800"
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
        <span className="text-[9px] uppercase tracking-wider text-slate-500">
          score
        </span>
      </div>
    </div>
  );
}
