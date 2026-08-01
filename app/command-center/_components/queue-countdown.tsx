"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to the next scan dispatch. The cron only runs DAILY on this
 * plan (0 0 * * *), so when nothing is draining the wait really is up to 24h —
 * showing that is the point. While the dispatcher is self-chaining the daily
 * clock is irrelevant, so it says so rather than counting to a moot trigger.
 */
/** hh:mm:ss, clamped at zero so a passed deadline never renders negatives. */
export function formatCountdown(msLeft: number): string {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** The whole sentence, as a pure function so it is testable without a DOM. */
export function countdownLabel(queued: number, draining: boolean, msLeft: number): string {
  const head = `${queued} paid scan${queued === 1 ? "" : "s"} queued`;
  if (queued === 0) return `${head} — queue empty.`;
  if (draining) return `${head} — draining now, ~100–170s each; the dispatcher re-triggers itself.`;
  return `${head} — next dispatch in ${formatCountdown(msLeft)} (daily cron, 00:00 UTC).`;
}

export function QueueCountdown({
  queued,
  draining,
  nextRunIso,
}: {
  queued: number;
  draining: boolean;
  nextRunIso: string;
}) {
  const [left, setLeft] = useState(() => Date.parse(nextRunIso) - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(Date.parse(nextRunIso) - Date.now()), 1000);
    return () => clearInterval(t);
  }, [nextRunIso]);

  return (
    <p className="text-sm text-slate-500" suppressHydrationWarning>
      {countdownLabel(queued, draining, left)}
    </p>
  );
}
