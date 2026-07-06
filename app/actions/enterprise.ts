"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { runTriage } from "@/lib/triage";
import { sendOwnerAlert } from "@/lib/email";
import { makeApprovalToken, makeReportToken, makeReScanToken } from "@/lib/hmac";
import { assertPublicTarget } from "@/lib/scan-engine";

export interface EnterpriseFormState {
  error?: string;
}

const AGREEMENT_TEXT = `By submitting this form, you confirm that:
1. You are the owner of, or have explicit written authorization from the owner of, the chatbot at the URL specified.
2. You consent to automated security testing of that chatbot by AI Sec Tester.
3. You understand findings are for informational and defensive purposes only.
4. You will not use these findings to attack, harm, or disrupt the target system.
5. You understand that misrepresenting ownership or authorization is illegal in most jurisdictions and you accept full legal responsibility.`;

export async function submitEnterpriseRequest(
  _prev: EnterpriseFormState,
  formData: FormData,
): Promise<EnterpriseFormState> {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const company = (formData.get("company") as string)?.trim() || null;
  const roleTitle = (formData.get("role_title") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const chatbotUrl = (formData.get("chatbot_url") as string)?.trim();
  const targetDescription =
    (formData.get("target_description") as string)?.trim() || null;
  const ownershipMethod = formData.get("ownership_method") as string;
  const ownershipDetail =
    (formData.get("ownership_detail") as string)?.trim() || null;
  const agreedToTos = formData.get("agreed_to_tos") === "true";

  if (!fullName || !email || !chatbotUrl || !ownershipMethod) {
    return { error: "All required fields must be completed." };
  }
  if (!agreedToTos) {
    return { error: "You must sign the authorization agreement to proceed." };
  }

  try {
    new URL(chatbotUrl);
  } catch {
    return { error: "Target URL must be a valid http:// or https:// address." };
  }
  try {
    await assertPublicTarget(chatbotUrl);
  } catch (err) {
    return { error: String(err).replace(/^Error:\s*/, "") };
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const ua = headersList.get("user-agent") || "";

  const triage = await runTriage({
    chatbot_url: chatbotUrl,
    email,
    ip_address: ip,
  });

  const supabase = await createClient();

  const { data: req, error: insErr } = await supabase
    .from("enterprise_requests")
    .insert({
      full_name: fullName,
      email,
      company,
      role_title: roleTitle,
      phone,
      chatbot_url: chatbotUrl,
      target_description: targetDescription,
      ownership_method: ownershipMethod,
      ownership_detail: ownershipDetail,
      agreed_to_tos: agreedToTos,
      agreement_text: AGREEMENT_TEXT,
      agreement_signed_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: ua,
      triage_score: triage.score,
      triage_verdict: triage.verdict,
      triage_flags: triage.flags,
      triage_recommendation: triage.recommendation,
    })
    .select("id")
    .single();

  if (insErr || !req) {
    console.error("[enterprise] insert error:", insErr);
    return { error: "Failed to save your request. Please try again." };
  }

  const approvalToken = makeApprovalToken(req.id);
  const reportToken = makeReportToken(req.id);
  const reScanToken = makeReScanToken(req.id);

  await supabase
    .from("enterprise_requests")
    .update({
      approval_token: approvalToken,
      report_token: reportToken,
      re_scan_token: reScanToken,
    })
    .eq("id", req.id);

  await sendOwnerAlert({
    requestId: req.id,
    requesterName: fullName,
    requesterEmail: email,
    company,
    chatbotUrl,
    triageScore: triage.score,
    triageVerdict: triage.verdict,
    triageSummary: triage.summary,
    triageFlags: triage.flags,
    approvalToken,
  });

  redirect(`/enterprise/success?id=${req.id}`);
}
