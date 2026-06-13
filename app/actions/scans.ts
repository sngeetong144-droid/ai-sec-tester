"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureSessionId } from "@/lib/session";
import { runScanEngine } from "@/lib/scan-engine";

export interface RunScanState {
  ok: boolean;
  scanId?: string;
  error?: string;
}

function normalizeUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Core scan routine, shared by the form runner and the "Run again" action.
 * Creates a scan row, runs the engine against the target, persists every
 * per-test result, and finalizes the rollup. Returns the new scan id.
 */
async function executeScan(input: {
  target: string;
  label: string | null;
  email: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const sessionId = await ensureSessionId();

  const { data: created, error: insErr } = await supabase
    .from("scans")
    .insert({
      target_url: input.target,
      target_label: input.label,
      email: input.email,
      session_id: sessionId,
      authorized: true,
      status: "running",
    })
    .select("id")
    .single();

  if (insErr || !created) {
    throw new Error(insErr?.message ?? "Could not create scan.");
  }
  const scanId = created.id as string;

  try {
    const engine = await runScanEngine(input.target);

    const rows = engine.results.map((r) => ({
      scan_id: scanId,
      test_key: r.key,
      test_name: r.name,
      category: r.category,
      severity: r.severity,
      status: r.status,
      detail: r.detail,
      evidence: r.evidence,
      remediation: r.status === "fail" ? r.remediation : null,
      sort_order: r.sort_order,
    }));
    const { error: resErr } = await supabase.from("scan_results").insert(rows);
    if (resErr) throw new Error(resErr.message);

    const { error: updErr } = await supabase
      .from("scans")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        score: engine.score,
        tests_total: engine.tests_total,
        tests_passed: engine.tests_passed,
        verdict: engine.verdict,
        summary: engine.summary,
      })
      .eq("id", scanId);
    if (updErr) throw new Error(updErr.message);
  } catch (err) {
    await supabase
      .from("scans")
      .update({ status: "failed", summary: String(err) })
      .eq("id", scanId);
    throw err;
  }

  return scanId;
}

/** Form runner used by <ScanRunner> via useActionState. */
export async function runScan(
  _prev: RunScanState,
  formData: FormData,
): Promise<RunScanState> {
  const target = normalizeUrl(String(formData.get("target_url") ?? ""));
  const label = String(formData.get("target_label") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const authorized = formData.get("authorized") === "on";

  if (!target) {
    return { ok: false, error: "Enter a valid chatbot URL (e.g. example.com)." };
  }
  if (!authorized) {
    return {
      ok: false,
      error:
        "Please confirm you own or are authorized to test this chatbot before scanning.",
    };
  }

  try {
    const scanId = await executeScan({ target, label, email });
    revalidatePath("/");
    revalidatePath(`/scans/${scanId}`);
    return { ok: true, scanId };
  } catch (err) {
    return { ok: false, error: "Scan failed: " + String(err) };
  }
}

/** "Run again" action on the scorecard — re-scans the same target, redirects. */
export async function rerunScan(formData: FormData): Promise<void> {
  const target = normalizeUrl(String(formData.get("target_url") ?? ""));
  const label = String(formData.get("target_label") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  if (!target) return;

  const scanId = await executeScan({ target, label, email });
  revalidatePath("/");
  redirect(`/scans/${scanId}`);
}

export async function deleteScan(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("scans").delete().eq("id", id);
  revalidatePath("/");
  redirect("/");
}
