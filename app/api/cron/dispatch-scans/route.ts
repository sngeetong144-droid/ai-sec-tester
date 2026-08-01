import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { queueEmail } from "@/app/command-center/_email";
import { deliverComposedEmail } from "@/lib/email-templates";
import { runScanForRequest } from "@/lib/command-center/run-scan";
import { resolvePaymentLink } from "@/lib/payment-links";
import { buildPaymentUrl, paymentCountdown } from "@/app/actions/scan-request-lifecycle";

/**
 * GET /api/cron/dispatch-scans — the scan dispatcher (Vercel Cron, every 5 min).
 *
 * Protected by CRON_SECRET (Authorization: Bearer). It does two jobs on scan_requests:
 *
 *  (B) DISPATCH: for each `paid_scanning` request, bridge to its cc_case (the guarded
 *      engine is keyed on cc_cases, not scan_requests), activate it, and run the ONE
 *      authorized scan path (executeScan, presenting CRON_SECRET as the trusted-server
 *      credential). On completion: mark the case complete, queue the report email, and
 *      flip the request to `complete`.
 *
 *  (C) STALE: for each `approved_awaiting_payment` request, queue ONE reminder at 48h
 *      (guarded against re-send via the email log) and auto-close (reject) at 14d.
 *
 * REPORT UPLOAD IS MISSING: the repo renders PDFs on demand (app/api/scans/[id]/report)
 * but has no storage-upload + signed-URL infra. Rather than fake a permanent public
 * report_url (reports contain vuln detail), report_url is left null and FLAGGED.
 */

export const dynamic = "force-dynamic";
/**
 * Scans run SYNCHRONOUSLY inside this request, so this budget is the hard limit
 * on a paid scan.
 *
 * It was 60s, and no paid scan could ever finish. Measured real runs of the same
 * engine against the same targets took 68s, 118s, 127s and 175s (scan-matrix,
 * 2026-07-31), so every customer scan was killed mid-probe: the scans row stayed
 * "running" forever, zero results were persisted, and the case looked merely slow
 * rather than dead. Confirmed live on 2026-08-01 — the first real paid scan was
 * activated at 02:06:51 and never completed.
 *
 * 300 matches /api/dev/scan-matrix, which demonstrably completes these same scans
 * on this account, so the plan supports it. A batch of 5 can still exceed it; the
 * stale-run recovery in run-scan.ts re-dispatches whatever gets cut off.
 */
export const maxDuration = 300;

const DISPATCH_BATCH = 5;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

type Row = Record<string, unknown> & {
  id: string;
  target_url: string;
  company: string | null;
  email: string | null;
  plan: string | null;
  full_name: string | null;
  payment_link_sent_at: string | null;
};

type Supa = ReturnType<typeof createServiceClient>;

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();

  const supabase = createServiceClient();
  const result = {
    dispatched: [] as string[],
    reconciled: [] as string[],
    inFlight: [] as string[],
    reminded: [] as string[],
    autoClosed: [] as string[],
    skipped: [] as { id: string; reason: string }[],
  };

  // ── (B) run paid_scanning ────────────────────────────────────────────────────
  const { data: paid } = await supabase
    .from("scan_requests")
    .select("*")
    .eq("status", "paid_scanning")
    .limit(DISPATCH_BATCH);

  // Time budget. The platform kills this request at maxDuration, so the loop
  // must (a) never START a scan it cannot finish, and (b) hand each scan a
  // deadline it stops itself at. Without both, a scan is killed mid-probe, no
  // results are persisted, and the row is stranded at "running".
  const startedAt = Date.now();
  const HARD_MS = 300_000; // must match maxDuration above
  const PER_SCAN_MS = 200_000; // measured real scans: 68s-175s
  const SAFETY_MS = 15_000; // leave room to finalise, email, and respond

  for (const req of (paid as Row[]) ?? []) {
    const elapsed = Date.now() - startedAt;
    const remaining = HARD_MS - elapsed - SAFETY_MS;
    if (remaining < 30_000) {
      // Not enough left to do anything useful — leave it paid_scanning for the
      // next tick rather than starting a run that will be cut off.
      result.skipped.push({ id: req.id, reason: "deferred — dispatch time budget" });
      continue;
    }
    try {
      const outcome = await runScanForRequest(supabase, req, {
        cronSecret: secret,
        deadlineAtMs: Date.now() + Math.min(PER_SCAN_MS, remaining),
      });
      if (outcome.status === "dispatched") result.dispatched.push(req.id);
      else if (outcome.status === "reconciled") result.reconciled.push(req.id);
      else if (outcome.status === "in_flight") result.inFlight.push(req.id);
      else result.skipped.push({ id: req.id, reason: outcome.reason ?? "skipped" });
    } catch (err) {
      result.skipped.push({
        id: req.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── (C) stale approved_awaiting_payment ──────────────────────────────────────
  const { data: awaiting } = await supabase
    .from("scan_requests")
    .select("*")
    .eq("status", "approved_awaiting_payment")
    .limit(200);

  for (const req of (awaiting as Row[]) ?? []) {
    try {
      const outcome = await handleStale(supabase, req);
      if (outcome === "auto_closed") result.autoClosed.push(req.id);
      else if (outcome === "reminded") result.reminded.push(req.id);
    } catch (err) {
      result.skipped.push({
        id: req.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // SELF-CHAINING DRAIN. The cron can only run DAILY on this plan (a */5 schedule
  // is rejected outright — Vercel refuses the deployment with no build and no
  // error, which is how the 5-minute attempt silently shipped nothing). So the
  // queue cannot rely on cron frequency: whenever this run made progress AND work
  // remains, it kicks itself again. 100 customers paying at once are therefore
  // drained back-to-back at ~1 scan per 100-170s, instead of waiting for midnight.
  // Guarded by `dispatched.length > 0` so a permanently stuck row can never spin
  // an endless chain — no progress, no re-kick.
  if (result.dispatched.length > 0) {
    const { count } = await supabase
      .from("scan_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid_scanning");
    if ((count ?? 0) > 0) kickNext(secret);
  }

  return NextResponse.json({ ...result, queueRemaining: await countQueued(supabase) });
}

async function countQueued(supabase: Supa): Promise<number> {
  const { count } = await supabase
    .from("scan_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid_scanning");
  return count ?? 0;
}

/**
 * Fire-and-forget re-entry. Same abort-after-a-moment shape as the Stripe
 * webhook's kick: dropping our end of the socket does not stop the invocation
 * Vercel has already started.
 */
function kickNext(secret: string): void {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 1_500);
  void fetch(`${base.replace(/\/$/, "")}/api/cron/dispatch-scans`, {
    headers: { authorization: `Bearer ${secret}` },
    signal: controller.signal,
  }).catch(() => {});
}

async function handleStale(supabase: Supa, req: Row): Promise<"auto_closed" | "reminded" | null> {
  const cd = paymentCountdown(req.payment_link_sent_at);

  // 14d → auto-close. Conditional WHERE keeps it idempotent (won't re-reject).
  if (cd.autoCloseOverdue) {
    await supabase
      .from("scan_requests")
      .update({
        status: "rejected",
        rejection_reason: "Auto-closed: payment not received within 14 days.",
      })
      .eq("id", req.id)
      .eq("status", "approved_awaiting_payment");
    return "auto_closed";
  }

  // 48h → one reminder, guarded against re-send via the email log.
  if (cd.reminderOverdue) {
    const { data: cc } = await supabase
      .from("cc_cases")
      .select("id")
      .eq("scan_request_id", req.id)
      .maybeSingle();
    if (!cc) return null; // can't key the email log without a case
    const caseId = (cc as { id: string }).id;

    const { data: prior } = await supabase
      .from("cc_email_log")
      .select("id")
      .eq("case_id", caseId)
      .like("subject", "Reminder:%")
      .limit(1);
    if ((prior?.length ?? 0) > 0) return null; // already reminded

    const link = resolvePaymentLink(req.plan);
    const url = link
      ? buildPaymentUrl(link.url, req.id, req.email)
      : "(payment link unavailable)";
    const ref = `CASE-${caseId.slice(0, 8)}`;
    const composed = {
      kind: "approval" as const, // cc_email_log CHECK allows approval|reject|report|disclosure
      toEmail: req.email ?? "",
      subject: `Reminder: your AI security test payment is pending (${ref})`,
      body:
        `Hi ${req.full_name ?? "there"},\n\n` +
        `Your approved AI security test is still awaiting payment.\n\n` +
        `Pay to activate the scan: ${url}\n\n` +
        `Reference: ${ref}\n\n` +
        `This request auto-closes if payment isn't received within 14 days of approval.\n\n` +
        `— AI Sec Tester`,
    };
    await queueEmail(caseId, composed);
    await deliverComposedEmail(composed);
    return "reminded";
  }

  return null;
}
