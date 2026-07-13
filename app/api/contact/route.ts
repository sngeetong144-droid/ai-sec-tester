import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail, esc } from "@/lib/email";

/**
 * POST /api/contact — the landing chat bubble's "leave a message" path.
 *
 * Before this route the ChatBubble told the visitor "we'll be in touch" and threw
 * the message away. Same order as /api/starter-map: PERSIST FIRST (site_leads,
 * lead='aist-chat'), then notify the operator best-effort behind the
 * CC_EMAIL_SEND_ENABLED + RESEND_API_KEY gate. Email off or failing never loses
 * the message.
 *
 * Same-origin only — no CORS headers. The visitor-supplied message is escaped
 * before it enters the alert HTML (esc from lib/email.ts).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  name?: string;
  email?: string;
  message?: string;
}

const bad = (error: string) => NextResponse.json({ ok: false, error }, { status: 400 });

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON body.");
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || name.length > 80) return bad("A name is required (80 characters max).");
  if (!email || email.length > 160 || !EMAIL_RE.test(email)) {
    return bad("A valid email address is required (160 characters max).");
  }
  if (!message || message.length > 2000) {
    return bad("A message is required (2000 characters max).");
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const supabase = createServiceClient();
  const { error: insErr } = await supabase
    .from("site_leads")
    .insert({ name, email, message, lead: "aist-chat", ip });

  if (insErr) {
    console.error("[contact] insert error:", insErr.message);
    return NextResponse.json(
      { ok: false, error: "Could not send your message. Please try again." },
      { status: 500 },
    );
  }

  const operator = process.env.OWNER_EMAIL;
  if (process.env.CC_EMAIL_SEND_ENABLED === "true" && process.env.RESEND_API_KEY && operator) {
    try {
      const res = await sendEmail({
        from: "AI Sec Tester <alerts@thesoulsofai.com>",
        to: operator,
        subject: `[AI Sec Tester] New chat message — ${name}`,
        html: `<!DOCTYPE html>
<html><body style="background:#f7f6f2;color:#151321;font-family:system-ui,sans-serif;padding:28px;max-width:600px;margin:0 auto">
<div style="background:#fff;border-radius:14px;padding:26px;border:1px solid #e7e3d8">
<h2 style="margin:0 0 12px;color:#5a45e6">New chat message</h2>
<p style="margin:0 0 6px;font-size:14px"><strong>${esc(name)}</strong> &lt;${esc(email)}&gt;</p>
<p style="margin:0 0 16px;color:#8a8578;font-size:12px">IP: ${esc(ip)}</p>
<div style="background:#f7f6f2;border-radius:10px;padding:14px;font-size:14px;line-height:1.6;white-space:pre-wrap">${esc(message)}</div>
<p style="margin:16px 0 0;font-size:13px">Reply to <a href="mailto:${encodeURI(email)}" style="color:#5a45e6">${esc(email)}</a>.</p>
</div>
</body></html>`,
      });
      if (!res.ok) console.error("[contact] operator alert not delivered:", res.error ?? "skipped");
    } catch (err) {
      console.error("[contact] operator alert failed:", err);
    }
  } else {
    console.log(`[contact] email gated off — message saved (${email}), no operator alert.`);
  }

  return NextResponse.json({ ok: true });
}
