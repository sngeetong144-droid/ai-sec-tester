import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyApprovalToken, makeReportToken, makeReScanToken } from "@/lib/hmac";
import { sendReportEmail } from "@/lib/email";
import { executeScan } from "@/app/actions/scans";

function html(title: string, color: string, body: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:560px;margin:0 auto">
      <h2 style="color:${color};margin-top:0">${title}</h2>${body}
    </body></html>`,
    { headers: { "content-type": "text/html" } },
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");

  if (!id || !token) {
    return html("Invalid Link", "#ef4444", "<p>Missing id or token parameter.</p>");
  }

  if (!verifyApprovalToken(id, token)) {
    return html("Invalid Token", "#ef4444", "<p>This approval link is invalid or has been tampered with.</p>");
  }

  const supabase = await createClient();

  const { data: rows } = await supabase.rpc(
    "get_enterprise_request_by_approval_token",
    { p_token: token },
  );
  const req = Array.isArray(rows) ? rows[0] : rows;

  if (!req) {
    return html("Not Found", "#ef4444", "<p>No matching request found.</p>");
  }

  if (req.approval_status !== "pending") {
    return html(
      "Already Processed",
      "#f59e0b",
      `<p>This request was already <strong>${req.approval_status}</strong>.</p>`,
    );
  }

  // Approve in DB
  await supabase.rpc("approve_enterprise_request", {
    p_id: id,
    p_token: token,
  });

  // Run the scan (sessionId=null — Enterprise scans don't need session cookies)
  let scanId: string | null = null;
  let verdict = "fail";
  let score = 0;
  try {
    scanId = await executeScan({
      target: req.chatbot_url,
      email: req.email,
      sessionId: null,
    });

    const { data: scan } = await supabase
      .from("scans")
      .select("verdict, score")
      .eq("id", scanId)
      .single();
    verdict = scan?.verdict ?? "fail";
    score = scan?.score ?? 0;

    await supabase.rpc("link_scan_to_enterprise_request", {
      p_id: id,
      p_scan_id: scanId,
    });
  } catch (err) {
    console.error("[enterprise:approve] scan failed:", err);
  }

  // Send report email
  if (req.report_token && req.re_scan_token) {
    await sendReportEmail({
      toEmail: req.email,
      toName: req.full_name,
      chatbotUrl: req.chatbot_url,
      reportToken: req.report_token,
      reScanToken: req.re_scan_token,
      verdict,
      score,
    });
  }

  const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://scan.thesoulsofai.com"}/enterprise/report/${req.report_token}`;

  return html(
    "Request Approved",
    "#22c55e",
    `<p>The scan has been triggered and the report is being sent to <strong>${req.email}</strong>.</p>
     <p style="margin-top:16px"><a href="${reportUrl}" style="color:#38bdf8">View report directly</a></p>
     <p style="color:#64748b;font-size:12px;margin-top:24px">Request ID: ${id}</p>`,
  );
}
