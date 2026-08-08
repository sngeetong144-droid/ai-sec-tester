import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";

/**
 * POST /api/starter-map — lead capture + Starter Map delivery for the marketing
 * site's /starter-map form (static Astro on Firebase at thesoulsofai.com).
 *
 * Before this route the form showed "Check your inbox!" and sent nothing. Order
 * is deliberate: PERSIST FIRST, then email best-effort. A missing RESEND_API_KEY,
 * a gate that is off, or a Resend 5xx must never cost us the lead.
 *
 * Cross-origin: called from https://thesoulsofai.com only — exact-origin CORS,
 * never a wildcard.
 */

const PDF_URL = "https://thesoulsofai.com/downloads/solo-empire-starter-map.pdf";
const ALLOWED_ORIGIN = "https://thesoulsofai.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

const ok = () => NextResponse.json({ ok: true }, { headers: CORS });
const bad = (error: string) =>
  NextResponse.json({ ok: false, error }, { status: 400, headers: CORS });

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

interface Body {
  name?: string;
  email?: string;
  country?: string;
  website?: string; // honeypot
  lead?: string; // capture source — which page earned this lead
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON body.");
  }

  // Honeypot: filled hidden field means a bot. Plain 200 — never say why.
  if (body.website && body.website.trim() !== "") return ok();

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const country = body.country?.trim() || null;

  if (!name || name.length > 80) return bad("A name is required (80 characters max).");
  if (!email || email.length > 160 || !EMAIL_RE.test(email)) {
    return bad("A valid email address is required (160 characters max).");
  }
  if (country && country.length > 80) return bad("Country is too long (80 characters max).");

  // Capture source. The column is varchar(60) and several SEO pages now post here, so an
  // over-long or absent value must degrade to the historical default rather than fail the
  // insert — losing the lead to protect the label would be the wrong trade.
  const leadRaw = body.lead?.trim() ?? "";
  const lead = leadRaw && leadRaw.length <= 60 ? leadRaw : "starter-map";

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const supabase = createServiceClient();
  const { error: insErr } = await supabase
    .from("site_leads")
    .insert({ name, email, country, lead, ip });

  if (insErr) {
    console.error("[starter-map] insert error:", insErr.message);
    return NextResponse.json(
      { ok: false, error: "Could not save your request. Please try again." },
      { status: 500, headers: CORS },
    );
  }

  // Best-effort delivery behind the repo-wide two-flag gate. Lead is already
  // safe on disk; a skip or a failure here is logged, never surfaced as an error.
  if (process.env.CC_EMAIL_SEND_ENABLED === "true" && process.env.RESEND_API_KEY) {
    try {
      const res = await sendEmail({
        from: "The Souls of AI <hello@thesoulsofai.com>",
        to: email,
        subject: "Your Solo Empire Starter Map",
        text: `Hi ${name},\n\nHere's your Solo Empire Starter Map:\n${PDF_URL}\n\nIt's yours to keep — save it somewhere you'll actually look at it.\n\n— The Souls of AI`,
        html: `<!DOCTYPE html>
<html><body style="background:#f7f6f2;color:#151321;font-family:system-ui,sans-serif;padding:28px;max-width:600px;margin:0 auto">
<div style="background:#fff;border-radius:14px;padding:26px;border:1px solid #e7e3d8">
<h2 style="margin:0 0 12px;color:#5a45e6">Your Solo Empire Starter Map</h2>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6">Thanks for grabbing it — the map is a single PDF, yours to keep.</p>
<a href="${PDF_URL}" style="background:#5a45e6;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Download the Starter Map (PDF)</a>
<p style="margin:20px 0 0;color:#8a8578;font-size:12px">Direct link: <a href="${PDF_URL}" style="color:#5a45e6">${PDF_URL}</a></p>
</div>
<p style="color:#8a8578;font-size:11px;margin:16px 4px 0">The Souls of AI</p>
</body></html>`,
      });
      if (!res.ok) console.error("[starter-map] email not delivered:", res.error ?? "skipped");
    } catch (err) {
      console.error("[starter-map] email failed:", err);
    }
  } else {
    console.log(`[starter-map] email gated off — lead saved (${email}), no send.`);
  }

  return ok();
}
