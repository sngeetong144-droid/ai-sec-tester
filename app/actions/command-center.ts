"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/command-center/access";
import { createServiceClient } from "@/lib/supabase/service";
import { recordCaseAudit } from "@/lib/audit-log";
import {
  approveCase,
  rejectCase,
  activateCase,
  completeCase,
} from "@/lib/command-center/queries";
import { loadCase } from "@/app/command-center/_data";
import { composeEmail, queueEmail } from "@/app/command-center/_email";
import { executeScan } from "@/app/actions/scans";
import { approveScanRequestPayment } from "@/app/actions/scan-request-lifecycle";

/**
 * Command-center mutations (server actions). EVERY action calls requireAdmin()
 * first, routes the state change through the guarded queries.ts helpers (which
 * append the append-only cc_audit_log row), then QUEUES the outbound email into
 * cc_email_log with status implicit "queued" — nothing is actually sent, and no
 * payment is charged. revalidatePath refreshes the console after each change.
 */

function revalidateConsole() {
  revalidatePath("/command-center", "layout");
}

/** Ingest a raw scan_requests intake into a cc_case (the intake-form → queue wiring). */
export async function ingestIntakeAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const requestId = String(formData.get("requestId") ?? "");
  if (!requestId) return;

  const supabase = createServiceClient();
  const { data: req } = await supabase
    .from("scan_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return;

  // ponytail: subscribed/platform default false/null — the intake form has no
  // provider field yet, so the console admin sets disclosure state manually.
  const { data: created, error } = await supabase
    .from("cc_cases")
    .insert({
      scan_request_id: req.id,
      tier: req.plan ?? null,
      status: "intake",
    })
    .select("id")
    .maybeSingle();
  if (error || !created) {
    console.error("ingestIntakeAction error:", error?.message);
    return;
  }
  await recordCaseAudit({
    caseId: created.id as string,
    eventType: "REQUEST_SUBMITTED",
    detail: req.full_name ?? null,
  });
  revalidateConsole();
}

/**
 * approval → approved; stamp the linked scan_request with its payment link
 * (status approved_awaiting_payment + stripe_client_reference_id +
 * payment_link_sent_at), then queue the approval email carrying that EXACT
 * param-appended link. The customer pays → the Stripe webhook flips the request to
 * paid_scanning → the cron dispatch job runs the scan. No charge, no send here —
 * the email is QUEUED (existing repo pattern).
 */
export async function approveCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const updated = await approveCase(id);
  if (!updated) return;
  const view = await loadCase(id);
  if (!view) {
    revalidateConsole();
    return;
  }

  const composed = composeEmail("approval", view);
  const req = view.req;
  if (req) {
    const pay = await approveScanRequestPayment(
      req.id,
      view.case.tier ?? req.plan,
      req.email,
    );
    // Inject the exact param-appended checkout URL into the templated body (the
    // template renders the bare link.url; swap it for the client_reference_id one).
    if (pay) composed.body = composed.body.replace(pay.baseUrl, pay.url);
  }
  await queueEmail(id, composed);
  revalidateConsole();
}

/** intake|approval → rejected; reason required; queue rejection email. */
export async function rejectCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return;
  const updated = await rejectCase(id, reason);
  if (!updated) return;
  const view = await loadCase(id);
  if (view) await queueEmail(id, composeEmail("reject", view, { reason }));
  revalidateConsole();
}

/**
 * approved → scanning. Confirms payment (simulates the Stripe webhook), creates
 * the linked scans record in `pending`, and activates the case. No email, no
 * charge. The scan engine is a separate gated component — it is NOT run here;
 * the scans row stays `pending` until an activated case invokes the engine.
 */
export async function activateCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const view = await loadCase(id);
  if (!view) return;

  let scanId = view.case.scan_id;
  if (!scanId) {
    const supabase = createServiceClient();
    const { data: scan, error } = await supabase
      .from("scans")
      .insert({
        target_url: view.req?.target_url ?? "",
        target_label: view.req?.company ?? null,
        email: view.req?.email ?? null,
        authorized: true,
        status: "pending",
        tests_total: 5,
      })
      .select("id")
      .maybeSingle();
    if (error || !scan) {
      console.error("activateCaseAction scan insert error:", error?.message);
      return;
    }
    scanId = scan.id as string;
  }

  await activateCase(id, scanId);
  revalidateConsole();
}

/**
 * Run the security engine for an activated case (scanning state). This is the
 * production scan trigger: it hands off to executeScan (app/actions/scans.ts),
 * the SINGLE choke point that re-verifies isAdminSession() + the activated/paid
 * gate itself — so this action's requireAdmin() is defense-in-depth, not the only
 * check. executeScan reuses the case's linked `pending` scans row, advancing it to
 * running/complete; loadCase then reads real results. No engine call happens here
 * directly — the guard lives in one place. paid===true is already satisfied by the
 * prior activate step (which confirms payment); we do NOT bypass it.
 */
export async function runScanAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const view = await loadCase(id);
  if (!view) return;

  const target = view.scan?.target_url || view.req?.target_url || "";
  if (!target) {
    console.error("runScanAction: no target url for case", id);
    return;
  }

  try {
    await executeScan({
      caseId: id,
      target,
      label: view.req?.company ?? null,
      email: view.req?.email ?? null,
      sessionId: null,
    });
  } catch (err) {
    // Gate denials (ScanAuthorizationError) and engine errors surface in the
    // scans row (executeScan stamps `failed`) + server logs; the console refreshes.
    console.error(
      "runScanAction executeScan error:",
      err instanceof Error ? err.message : String(err),
    );
  }
  revalidateConsole();
}

/** scanning → complete; stamp report delivery; queue the report email. */
export async function deliverCaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const updated = await completeCase(id);
  if (!updated) return;
  const view = await loadCase(id);
  if (view) await queueEmail(id, composeEmail("report", view));
  revalidateConsole();
}

/** Set disclosure_state = requested; audit; queue the disclosure email. */
export async function requestDisclosureAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("caseId") ?? "");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("cc_cases")
    .update({ disclosure_state: "requested" })
    .eq("id", id);
  if (error) {
    console.error("requestDisclosureAction error:", error.message);
    return;
  }
  await recordCaseAudit({ caseId: id, eventType: "DISCLOSURE_REQUESTED" });
  const view = await loadCase(id);
  if (view) await queueEmail(id, composeEmail("disclosure", view));
  revalidateConsole();
}
