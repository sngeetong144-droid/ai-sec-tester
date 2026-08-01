"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown to the next scan dispatch. The cron only runs DAILY on this
 * plan (0 0 * * *), so when nothing is draining the wait really is up to 24h —
 * showing that is the point. While the dispatcher is self-chaining the daily
 * clock is irrelevant, so it says so rather than counting to a moot trigger.
 */
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

  const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");
  const hh = pad(Math.floor(left / 3_600_000));
  const mm = pad(Math.floor((left % 3_600_000) / 60_000));
  const ss = pad(Math.floor((left % 60_000) / 1000));

  return (
    <p className="text-sm text-slate-500" suppressHydrationWarning>
      <span className="font-medium text-slate-800">
        {queued} paid scan{queued === 1 ? "" : "s"} queued
      </span>
      {queued === 0 ? (
        " — queue empty."
      ) : draining ? (
        " — draining now, ~100–170s each; the dispatcher re-triggers itself."
      ) : (
        <>
          {" "}
          — next dispatch in {hh}:{mm}:{ss} (daily cron, 00:00 UTC).
        </>
      )}
    </p>
  );
}
