import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { activateCase, completeCase } from "@/lib/command-center/queries";
import { loadCase } from "@/app/command-center/_data";
import { composeEmail, queueEmail } from "@/app/command-center/_email";
import { executeScan } from "@/app/actions/scans";
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
// Scans run synchronously inside this request; give headroom. ponytail: bounded per
// run (BATCH), and the 5-min cron drains any backlog — no queue/worker infra.
export const maxDuration = 60;

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

  for (const req of (paid as Row[]) ?? []) {
    try {
      const outcome = await dispatchOne(supabase, req, secret);
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

  return NextResponse.json(result);
}

interface DispatchOutcome {
  status: "dispatched" | "reconciled" | "in_flight" | "skipped";
  reason?: string;
}

async function dispatchOne(
  supabase: Supa,
  req: Row,
  secret: string,
): Promise<DispatchOutcome> {
  // Bridge to the cc_case that carries the guarded engine gate.
  const { data: cc } = await supabase
    .from("cc_cases")
    .select("*")
    .eq("scan_request_id", req.id)
    .maybeSingle();
  if (!cc) return { status: "skipped", reason: "no cc_case (request not ingested to console)" };

  const ccCase = cc as { id: string; status: string; scan_id: string | null };

  if (ccCase.status === "complete") {
    await supabase.from("scan_requests").update({ status: "complete" }).eq("id", req.id);
    return { status: "reconciled" };
  }

  // Inspect the linked scan to avoid double-running one already in progress/done.
  let scanStatus: string | null = null;
  if (ccCase.scan_id) {
    const { data: sc } = await supabase
      .from("scans")
      .select("status")
      .eq("id", ccCase.scan_id)
      .maybeSingle();
    scanStatus = (sc as { status: string } | null)?.status ?? null;
  }
  // ponytail: no distributed lock — relies on 5-min cron spacing + this status check.
  // Upgrade path: a SELECT ... FOR UPDATE claim if scans ever run concurrently.
  if (scanStatus === "running") return { status: "in_flight" };
  if (scanStatus === "failed") {
    return { status: "skipped", reason: "linked scan failed — manual review, no auto-retry" };
  }

  if (ccCase.status === "approved") {
    // Mint the pending scan row and activate (approved → scanning, paid=true).
    const { data: scan, error } = await supabase
      .from("scans")
      .insert({
        target_url: req.target_url,
        target_label: req.company ?? null,
        email: req.email ?? null,
        authorized: true,
        status: "pending",
        tests_total: 5,
      })
      .select("id")
      .maybeSingle();
    if (error || !scan) {
      return { status: "skipped", reason: `scan insert failed: ${error?.message ?? "no row"}` };
    }
    const activated = await activateCase(ccCase.id, (scan as { id: string }).id);
    if (!activated) return { status: "skipped", reason: "activateCase denied" };
  } else if (ccCase.status !== "scanning") {
    return { status: "skipped", reason: `cc_case not runnable (status ${ccCase.status})` };
  }

  // THE single authorized engine path. cronSecret substitutes for the admin session;
  // the gate still requires the case be scanning + paid (both true after activate).
  await executeScan({
    caseId: ccCase.id,
    target: req.target_url,
    label: req.company ?? null,
    email: req.email ?? null,
    sessionId: null,
    cronSecret: secret,
  });

  // Finalize: cc_case scanning → complete, queue report email, close the request.
  await completeCase(ccCase.id);
  const view = await loadCase(ccCase.id);
  if (view) await queueEmail(ccCase.id, composeEmail("report", view));
  // report_url intentionally left null — signed-URL upload infra MISSING (flagged).
  await supabase.from("scan_requests").update({ status: "complete" }).eq("id", req.id);
  return { status: "dispatched" };
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
    await queueEmail(caseId, {
      kind: "approval", // cc_email_log CHECK allows approval|reject|report|disclosure
      toEmail: req.email ?? "",
      subject: `Reminder: your AI security test payment is pending (${ref})`,
      body:
        `Hi ${req.full_name ?? "there"},\n\n` +
        `Your approved AI security test is still awaiting payment.\n\n` +
        `Pay to activate the scan: ${url}\n\n` +
        `Reference: ${ref}\n\n` +
        `This request auto-closes if payment isn't received within 14 days of approval.\n\n` +
        `— AI Sec Tester`,
    });
    return "reminded";
  }

  return null;
}
