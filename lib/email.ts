const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://scan.thesoulsofai.com";

/**
 * Escape user-controlled values before interpolating into alert-email HTML.
 * These alerts embed public request fields (name, company, URL, triage text);
 * without escaping, a crafted value could inject markup. Mirrors the customer
 * templates in email-templates.ts.
 */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface SendResult {
  ok: boolean;
  skipped?: boolean; // no RESEND_API_KEY configured (dev / not provisioned)
  error?: string;
}

/**
 * Real outbound via Resend. Sends only when RESEND_API_KEY is set (it IS in
 * Vercel prod) — otherwise it no-ops with `skipped:true` so local/dev stays
 * offline. Accepts html and/or text; Resend requires at least one. From MUST be
 * an address on a Resend-verified domain (thesoulsofai.com), never a gmail addr.
 */
export async function sendEmail(payload: {
  from: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log("[email:dev] no RESEND_API_KEY — would send:", payload.subject, "→", payload.to);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
      return { ok: false, error: `${res.status} ${body}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] Resend request failed:", msg);
    return { ok: false, error: msg };
  }
}

// ponytail: keep the old private name as a thin alias for the html-only callers below.
const send = (p: { from: string; to: string; subject: string; html: string }) => sendEmail(p);

/**
 * Operator alert address. Task rule: first entry of ADMIN_EMAILS, else the fixed
 * operator inbox. This is a TO address (a real inbox), unrelated to the verified
 * FROM domain — a gmail operator inbox is fine here.
 */
export function resolveOperatorEmail(): string {
  const first = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)[0];
  return first || "thesoulsofai@gmail.com";
}

/**
 * Notify the operator that a new public scan-request landed, with a link to the
 * Command Center intake queue. One send per request (caller invokes once, inline
 * after the insert) — no retry loop. Best-effort: a send failure never blocks the
 * requester's 200.
 */
export async function sendNewRequestAlert(params: {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  company: string | null;
  targetUrl: string;
  status: string;
  triageVerdict: string | null;
  triageScore: number | null;
}): Promise<SendResult> {
  const to = resolveOperatorEmail();
  const intakeUrl = `${APP_URL}/command-center/intake`;
  const verdict = (params.triageVerdict ?? "n/a").toUpperCase();
  const statusColor = params.status === "rejected" ? "#ef4444" : "#f59e0b";

  const html = `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:600px">
<h2 style="color:#a78bfa;margin-top:0">New Scan Request — Intake</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
  <tr><td style="padding:5px 0;color:#94a3b8;width:130px">Requester</td><td>${esc(params.requesterName)} &lt;${esc(params.requesterEmail)}&gt;</td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Company</td><td>${esc(params.company ?? "—")}</td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Target</td><td><a href="${esc(params.targetUrl)}" style="color:#a78bfa">${esc(params.targetUrl)}</a></td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Status</td><td><span style="color:${statusColor};font-weight:bold;text-transform:uppercase">${params.status}</span></td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Triage</td><td>${verdict} risk · score ${params.triageScore ?? "—"}/100</td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Request ID</td><td style="color:#64748b;font-family:monospace">${params.requestId}</td></tr>
</table>
<a href="${intakeUrl}" style="background:#8b5cf6;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Open Command Center Intake</a>
<p style="color:#475569;font-size:11px;margin-top:14px">No scan has run and no payment taken — this is an authorization request awaiting your review.</p>
</body></html>`;

  return sendEmail({
    from: "AI Sec Tester <alerts@thesoulsofai.com>",
    to,
    subject: `[AI Sec Tester] New scan request — ${params.status.toUpperCase()} — ${params.requesterName}`,
    html,
  });
}

/**
 * Confirm to the requester that their scan request landed and is awaiting
 * authorization review. Sent for every non-rejected request (the caller gates on
 * status) — auto-declined requests get nothing, keeping the public response
 * uniform. Best-effort via the shared sendEmail gate; a failure never blocks the
 * intake 200. No turnaround promise — dispatch is a daily cron, not "seconds".
 */
export async function sendRequesterAck(params: {
  requesterName: string;
  requesterEmail: string;
  targetUrl: string;
  requestId: string;
}): Promise<SendResult> {
  const html = `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:580px">
<h2 style="color:#a78bfa;margin-top:0">We received your scan request</h2>
<p>Hi ${esc(params.requesterName)},</p>
<p>Thanks — your request to scan <strong>${esc(params.targetUrl)}</strong> has been received and is awaiting authorization review.</p>
<p>If it's approved, you'll receive a secure payment link by email. Once the scan completes, your graded PDF report is emailed to you.</p>
<p style="color:#64748b;font-size:13px;margin-top:20px">Request ID: <span style="font-family:monospace">${esc(params.requestId)}</span></p>
<p style="color:#94a3b8;margin-top:24px">AI Sec Tester · The Souls of AI</p>
</body></html>`;

  return sendEmail({
    from: "AI Sec Tester <alerts@thesoulsofai.com>",
    to: params.requesterEmail,
    subject: "We received your AI Sec Tester scan request",
    html,
  });
}

export async function sendOwnerAlert(params: {
  requestId: string;
  requesterName: string;
  requesterEmail: string;
  company: string | null;
  chatbotUrl: string;
  triageScore: number;
  triageVerdict: string;
  triageSummary: string;
  triageFlags: Array<{ code: string; severity: string; message: string }>;
  approvalToken: string;
}) {
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!ownerEmail) {
    console.log("[email:dev] OWNER_EMAIL not set — owner alert skipped");
    return;
  }

  const approveUrl = `${APP_URL}/api/enterprise/approve?id=${params.requestId}&token=${params.approvalToken}`;
  const rejectUrl = `${APP_URL}/api/enterprise/reject?id=${params.requestId}&token=${params.approvalToken}`;

  const riskColor =
    params.triageVerdict === "low"
      ? "#22c55e"
      : params.triageVerdict === "medium"
        ? "#f59e0b"
        : "#ef4444";

  const flagRows = params.triageFlags
    .map(
      (f) =>
        `<tr>
          <td style="padding:4px 8px;font-weight:bold;color:${
            f.severity === "critical"
              ? "#ef4444"
              : f.severity === "warn"
                ? "#f59e0b"
                : "#94a3b8"
          };white-space:nowrap">${esc(f.code)}</td>
          <td style="padding:4px 8px;color:#cbd5e1">${esc(f.message)}</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:640px">
<h2 style="color:#a78bfa;margin-top:0">New Authorized Deep Scan Request</h2>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
  <tr><td style="padding:5px 0;color:#94a3b8;width:140px">Requester</td><td>${esc(params.requesterName)} &lt;${esc(params.requesterEmail)}&gt;</td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Company</td><td>${esc(params.company ?? "—")}</td></tr>
  <tr><td style="padding:5px 0;color:#94a3b8">Target</td><td><a href="${esc(params.chatbotUrl)}" style="color:#a78bfa">${esc(params.chatbotUrl)}</a></td></tr>
</table>
<h3 style="color:#94a3b8;font-size:13px;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Automated Triage</h3>
<div style="background:#1e293b;border-radius:8px;padding:16px;margin-bottom:20px">
  <div style="margin-bottom:10px">
    <span style="background:${riskColor}20;color:${riskColor};border:1px solid ${riskColor}50;padding:3px 12px;border-radius:999px;font-weight:bold;text-transform:uppercase;font-size:12px">${params.triageVerdict} risk</span>
    <span style="color:#64748b;margin-left:10px;font-size:13px">Score: ${params.triageScore}/100</span>
  </div>
  <p style="margin:0 0 12px;color:#cbd5e1;font-size:14px">${esc(params.triageSummary)}</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px">${flagRows}</table>
</div>
<a href="${approveUrl}" style="background:#22c55e;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-right:10px">Approve — Run Scan</a>
<a href="${rejectUrl}" style="background:#ef4444;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Reject Request</a>
<p style="color:#475569;font-size:11px;margin-top:14px">Single-use links — do not share.</p>
</body></html>`;

  await send({
    from: "AI Sec Tester <alerts@thesoulsofai.com>",
    to: ownerEmail,
    subject: `[AI Sec Tester] New Deep Scan Request — ${params.triageVerdict.toUpperCase()} risk — ${params.requesterName}`,
    html,
  });
}

export async function sendRejectionEmail(params: {
  toEmail: string;
  toName: string;
  chatbotUrl: string;
  reason?: string;
}) {
  const html = `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:580px">
<h2 style="color:#a78bfa;margin-top:0">Deep Scan Request — Update</h2>
<p>Hi ${esc(params.toName)},</p>
<p>Thank you for submitting a deep scan request for <strong>${esc(params.chatbotUrl)}</strong>.</p>
<p>After review, we are unable to proceed with this request at this time.</p>
${params.reason ? `<div style="background:#1e293b;padding:12px 16px;border-radius:8px;border-left:3px solid #ef4444;margin:16px 0"><strong>Reason:</strong> ${esc(params.reason)}</div>` : ""}
<p>If you believe this decision is incorrect or can provide additional authorization evidence, please reply to this email.</p>
<p style="color:#94a3b8;margin-top:24px">AI Sec Tester · The Souls of AI</p>
</body></html>`;

  await send({
    from: "AI Sec Tester <noreply@thesoulsofai.com>",
    to: params.toEmail,
    subject: "Your AI Sec Tester Deep Scan Request — Update",
    html,
  });
}

export async function sendReportEmail(params: {
  toEmail: string;
  toName: string;
  chatbotUrl: string;
  reportToken: string;
  reScanToken: string;
  verdict: string;
  score: number;
}) {
  const reportUrl = `${APP_URL}/enterprise/report/${params.reportToken}`;
  const reScanUrl = `${APP_URL}/enterprise/rescan?token=${params.reScanToken}`;
  const verdictColor =
    params.verdict === "pass"
      ? "#22c55e"
      : params.verdict === "warn"
        ? "#f59e0b"
        : "#ef4444";

  const html = `<!DOCTYPE html>
<html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif;padding:32px;max-width:580px">
<h2 style="color:#a78bfa;margin-top:0">Your Security Report is Ready</h2>
<p>Hi ${esc(params.toName)},</p>
<p>Your deep scan of <strong>${esc(params.chatbotUrl)}</strong> is complete.</p>
<div style="background:#1e293b;border-radius:8px;padding:16px;margin:16px 0;display:inline-block">
  <span style="font-size:36px;font-weight:bold;color:${verdictColor}">${params.score}</span>
  <span style="color:#94a3b8;font-size:13px;margin-left:10px">/ 100 &nbsp;·&nbsp;</span>
  <span style="color:${verdictColor};font-weight:bold;text-transform:uppercase;font-size:14px">${params.verdict}</span>
</div>
<p><a href="${reportUrl}" style="background:#8b5cf6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">View Full Report &amp; PDF</a></p>
<hr style="border:none;border-top:1px solid #1e293b;margin:24px 0">
<p style="color:#64748b;font-size:13px">You have one complimentary re-scan once you've addressed the findings.<br>
<a href="${reScanUrl}" style="color:#a78bfa">Run Free Re-Scan</a></p>
<p style="color:#94a3b8;margin-top:24px">AI Sec Tester · The Souls of AI</p>
</body></html>`;

  await send({
    from: "AI Sec Tester <reports@thesoulsofai.com>",
    to: params.toEmail,
    subject: `Security Report Ready — ${params.chatbotUrl}`,
    html,
  });
}
