import { Shell } from "@/app/command-center/_components/shell";
import { ScanTool } from "@/app/command-center/_components/scan-tool";
import { QueueCountdown } from "@/app/command-center/_components/queue-countdown";
import { createServiceClient } from "@/lib/supabase/service";
import { availableClaimFilter } from "@/lib/command-center/claim";

export const dynamic = "force-dynamic";

/** Next 00:00 UTC — the cron's only scheduled trigger (vercel.json, 0 0 * * *). */
function nextDailyRunIso(): string {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

/**
 * Queue depth for the operator. `draining` = a row is claimed, so a dispatcher
 * is mid-run and will self-chain; the daily countdown is then not the real wait.
 * Fail-soft: a query error reports an empty queue, never breaks the scan tool.
 */
async function readQueue(): Promise<{ queued: number; draining: boolean }> {
  // try/catch, not just error-checking: createServiceClient THROWS when the keys
  // are absent, so an env gap would take the whole scan tool down with it.
  try {
    const supabase = createServiceClient();
    const base = () =>
      supabase.from("scan_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "paid_scanning");
    const [all, free] = await Promise.all([base(), base().or(availableClaimFilter())]);
    if (all.error) throw new Error(all.error.message);
    const queued = all.count ?? 0;
    return { queued, draining: queued > (free.count ?? queued) };
  } catch (e) {
    console.warn(`queue read failed: ${e instanceof Error ? e.message : String(e)}`);
    return { queued: 0, draining: false };
  }
}

export default async function CommandCenterScanPage() {
  const { queued, draining } = await readQueue();
  return (
    <Shell
      eyebrow="Tools"
      title="Scan tool"
      subtitle="Run the OWASP engine against a public target you own or are authorized to test."
    >
      <div className="mb-4">
        <QueueCountdown queued={queued} draining={draining} nextRunIso={nextDailyRunIso()} />
      </div>
      <ScanTool />
    </Shell>
  );
}