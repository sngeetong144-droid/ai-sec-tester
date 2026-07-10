import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { runTriage } from "@/lib/triage";
import { recordScanAudit } from "@/lib/audit-log";
import { isKnownCountryCode } from "@/lib/jurisdiction-policy";
import {
  reviewJurisdiction,
  lookupIpCountry,
  lookupIpNetworkType,
} from "@/lib/jurisdiction-review";

/**
 * POST /api/scan-request — public scan-request intake for the
 * scan.thesoulsofai.com marketing landing.
 *
 * NO scan is launched here and NO payment is taken. This records an
 * authorization request and runs jurisdiction due-diligence so a human (or the
 * enterprise approval flow) can act on it. Sanctioned requesters are
 * auto-declined; geo/network conflicts are held for manual review.
 *
 * Persistence target: public.scan_requests (supabase/migrations/0004_scan_requests.sql).
 * That migration is LOCAL / not yet applied — applying it is a gated deploy step.
 */

interface ScanRequestBody {
  plan?: string;
  name?: string;
  email?: string;
  company?: string;
  countryDeclared?: string;
  countryDeclaredName?: string;
  browserTimezone?: string;
  browserLocale?: string;
  dueDiligenceConsent?: boolean;
  target?: string;
  context?: string;
  website?: string; // honeypot
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: ScanRequestBody;
  try {
    body = (await req.json()) as ScanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot: a filled hidden field means a bot. Ack politely, persist nothing.
  if (body.website && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const target = body.target?.trim() ?? "";
  const declared = body.countryDeclared?.trim().toUpperCase() ?? "";

  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });
  }
  if (!isPublicHttpUrl(target)) {
    return NextResponse.json({ error: "A valid http(s) target URL is required." }, { status: 400 });
  }
  if (!isKnownCountryCode(declared)) {
    return NextResponse.json({ error: "A valid country of residence is required." }, { status: 400 });
  }
  if (body.dueDiligenceConsent !== true) {
    return NextResponse.json({ error: "Due-diligence consent is required." }, { status: 400 });
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const ua = headersList.get("user-agent") || "";

  // Resolve live geo signals independently of the declared country.
  const [ipCountry, networkType] = await Promise.all([
    lookupIpCountry(ip),
    lookupIpNetworkType(ip),
  ]);

  const review = reviewJurisdiction({
    declaredCountry: declared,
    ipCountry,
    networkType,
    browserTimezone: body.browserTimezone?.trim() || null,
    browserLocale: body.browserLocale?.trim() || null,
  });

  // Target-side risk context for the reviewer (does not gate intake status).
  const triage = await runTriage({ chatbot_url: target, email, ip_address: ip });
  const mergedFlags = [...triage.flags, ...review.flags];

  const supabase = createServiceClient();
  const { data: inserted, error: insErr } = await supabase
    .from("scan_requests")
    .insert({
      plan: body.plan?.trim() || null,
      full_name: name,
      email,
      company: body.company?.trim() || null,
      target_url: target,
      context: body.context?.trim() || null,
      country_declared: declared,
      country_declared_name: body.countryDeclaredName?.trim() || null,
      ip_address: ip,
      ip_country: ipCountry,
      network_type: networkType,
      browser_timezone: body.browserTimezone?.trim() || null,
      browser_locale: body.browserLocale?.trim() || null,
      due_diligence_consent: true,
      status: review.status,
      review_reason: review.reason,
      user_agent: ua,
      triage_score: triage.score,
      triage_verdict: triage.verdict,
      triage_flags: mergedFlags,
      triage_recommendation: triage.recommendation,
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("[scan-request] insert error:", insErr?.message);
    return NextResponse.json(
      { error: "Could not save your request. Please try again." },
      { status: 500 },
    );
  }

  // Append-only audit trail (best-effort — intake is not the fail-closed money path).
  try {
    await recordScanAudit({
      scanId: null,
      email,
      targetUrl: target,
      tier: `scan-request:${review.status}`,
      ownershipProofId: null,
      resultHash: null,
    });
  } catch (err) {
    console.error("[scan-request] audit log failed:", err);
  }

  // Uniform response: never reveal auto-decline/hold to the public page.
  return NextResponse.json({ ok: true });
}
