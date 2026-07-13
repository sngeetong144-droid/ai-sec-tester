import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { runTriage, type TriageFlag } from "@/lib/triage";
import { recordScanAudit } from "@/lib/audit-log";
import {
  isKnownCountryCode,
  COMPREHENSIVE_SANCTION_CODES,
  RESTRICTED_JURISDICTION_CODES,
  type RestrictedJurisdictionCode,
} from "@/lib/jurisdiction-policy";
import {
  reviewJurisdiction,
  lookupIpCountry,
  lookupIpNetworkType,
} from "@/lib/jurisdiction-review";
import { resolveTargetGeo } from "@/lib/geo";
import { rateLimitScanRequest } from "@/lib/rate-limit";
import { sendNewRequestAlert, sendRequesterAck } from "@/lib/email";

/**
 * POST /api/scan-request — public scan-request intake for the
 * scan.thesoulsofai.com marketing landing.
 *
 * NO scan is launched here and NO payment is taken. This records an
 * authorization request and runs jurisdiction due-diligence so a human (the
 * command-center admin) can act on it.
 *
 * SECURITY MODEL — the server is the control, the client is advisory:
 *   - BOTH consent checkboxes (authorized + due-diligence) and, when the
 *     requester is subscribed to a platform, the provider-notified checkbox, are
 *     RE-CHECKED here. A missing consent is a 400 regardless of what the client
 *     rendered.
 *   - Requester IP (from x-forwarded-for / x-real-ip) and the TARGET host IP
 *     (DNS A-record → country) are resolved SERVER-SIDE. Client-submitted
 *     requestorGeo / targetGeo are stored for mismatch detection but are NEVER
 *     the gate.
 *   - Comprehensive-sanctions requester OR target → rejected. Licence-required
 *     (SG/MY) is HELD as pending_review with a flag for manual admin review —
 *     never auto-rejected on unverified law.
 *
 * Persistence: public.scan_requests (migrations 0004 + 0006). Those migrations
 * are LOCAL / not yet applied — applying them is a gated deploy step.
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
  target?: string;
  context?: string;
  // consent — TWO distinct required checkboxes (design ai-security-scanner.html)
  authorized?: boolean;
  dueDiligenceConsent?: boolean;
  // third-party disclosure (only meaningful when subscribedPlatform is true)
  subscribedPlatform?: boolean;
  providerName?: string;
  providerNotifyRef?: string;
  providerNotified?: boolean;
  // client-claimed geo — ADVISORY ONLY, persisted for mismatch detection
  requestorGeo?: unknown;
  targetGeo?: unknown;
  // anti-abuse
  website?: string; // honeypot
  turnstileToken?: string;
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

/**
 * Cloudflare Turnstile server-side verify. GATED-ON-CREATOR: without a
 * TURNSTILE_SECRET_KEY the check is SKIPPED (returns true) so intake keeps
 * working. The real siteverify call only runs once Creator provisions the keys.
 */
async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // ponytail: no keys → skip. Wire when Creator adds Turnstile.
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token ?? "", remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

function isRestrictedCode(cc: string | null): cc is RestrictedJurisdictionCode {
  return cc != null && RESTRICTED_JURISDICTION_CODES.has(cc as RestrictedJurisdictionCode);
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

  // Re-check BOTH consent checkboxes server-side — never trust the client render.
  if (body.authorized !== true || body.dueDiligenceConsent !== true) {
    return NextResponse.json(
      { error: "Both the authorization and due-diligence confirmations are required." },
      { status: 400 },
    );
  }
  // Conditional third-party disclosure consent.
  const subscribedPlatform = body.subscribedPlatform === true;
  if (subscribedPlatform && body.providerNotified !== true) {
    return NextResponse.json(
      { error: "You must confirm the platform provider has been informed." },
      { status: 400 },
    );
  }

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";
  const ua = headersList.get("user-agent") || "";

  // Turnstile (skipped unless keys are configured) — verify before any real work.
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: "Challenge verification failed." }, { status: 400 });
  }

  // Rate limit the expensive path (network + DB) by IP and by email domain.
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const rl = rateLimitScanRequest(ip, emailDomain);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429 },
    );
  }

  // Resolve live signals independently of the declared/claimed values.
  const [ipCountry, networkType, targetGeo] = await Promise.all([
    lookupIpCountry(ip),
    lookupIpNetworkType(ip),
    resolveTargetGeo(target),
  ]);

  // Requester-side due-diligence (declared vs IP, proxy ASN, tz/locale conflict).
  const review = reviewJurisdiction({
    declaredCountry: declared,
    ipCountry,
    networkType,
    browserTimezone: body.browserTimezone?.trim() || null,
    browserLocale: body.browserLocale?.trim() || null,
  });

  // Target-side risk context for the reviewer.
  const triage = await runTriage({ chatbot_url: target, email, ip_address: ip });

  const flags: TriageFlag[] = [...triage.flags, ...review.flags];

  // ── status decision (server-authoritative) ──────────────────────────────────
  // Default: everything non-rejected is pending_review; hold reasons ride along
  // as flags. Reject ONLY on a comprehensive-sanctions hit (requester via review,
  // or server-resolved target country). Licence-required is a hold, never reject.
  let status = "pending_review";
  let rejectionReason: string | null = null;
  const targetCc = targetGeo.country;

  if (review.status === "rejected") {
    status = "rejected";
    rejectionReason = `requester:${review.reason}`;
  } else if (targetCc && COMPREHENSIVE_SANCTION_CODES.has(targetCc)) {
    status = "rejected";
    rejectionReason = `sanctioned-target:${targetCc}`;
    flags.push({
      code: "SANCTIONED_TARGET",
      severity: "critical",
      message: `Target ${targetGeo.host ?? target} resolves to ${targetCc}, a comprehensively sanctioned jurisdiction; request auto-declined.`,
    });
  } else if (isRestrictedCode(targetCc)) {
    // Licence-required target → HOLD (pending_review) for manual admin review.
    flags.push({
      code: "LICENSE_RESTRICTED_TARGET",
      severity: "warn",
      message: `Target ${targetGeo.host ?? target} resolves to ${targetCc}, where security testing is licence-regulated; manual review / licensed-provider path required before any scan.`,
    });
    rejectionReason = null;
  }

  // Persist BOTH the server-resolved (authoritative) and client-claimed geo.
  const requestorGeoRow = {
    resolved: { country: ipCountry, networkType, ip },
    claimed: body.requestorGeo ?? null,
  };
  const targetGeoRow = {
    resolved: { country: targetCc, ip: targetGeo.ip, host: targetGeo.host },
    claimed: body.targetGeo ?? null,
  };

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
      // ponytail: single consent column, but a row only exists when BOTH consents
      // passed the gate above — the row's existence IS the both-true proof.
      due_diligence_consent: true,
      subscribed_platform: subscribedPlatform,
      provider_name: subscribedPlatform ? body.providerName?.trim() || null : null,
      provider_notify_ref: subscribedPlatform ? body.providerNotifyRef?.trim() || null : null,
      provider_notified: subscribedPlatform ? body.providerNotified === true : false,
      requestor_geo: requestorGeoRow,
      target_geo: targetGeoRow,
      status,
      review_reason: review.reason,
      rejection_reason: rejectionReason,
      user_agent: ua,
      triage_score: triage.score,
      triage_verdict: triage.verdict,
      triage_flags: flags,
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
      tier: `scan-request:${status}`,
      ownershipProofId: null,
      resultHash: null,
    });
  } catch (err) {
    console.error("[scan-request] audit log failed:", err);
  }

  // Notify the operator (one send per request, inline — no retry loop). Best-effort:
  // an email failure must never turn a saved request into a 500.
  try {
    await sendNewRequestAlert({
      requestId: inserted.id as string,
      requesterName: name,
      requesterEmail: email,
      company: body.company?.trim() || null,
      targetUrl: target,
      status,
      triageVerdict: triage.verdict,
      triageScore: triage.score,
    });
  } catch (err) {
    console.error("[scan-request] operator alert failed:", err);
  }

  // Acknowledge the requester — but NOT for auto-declined requests: a "we're
  // reviewing" note would break the deliberately uniform public response.
  // Best-effort, same as the operator alert — an email failure never 500s.
  if (status !== "rejected") {
    try {
      await sendRequesterAck({
        requesterName: name,
        requesterEmail: email,
        targetUrl: target,
        requestId: inserted.id as string,
      });
    } catch (err) {
      console.error("[scan-request] requester ack failed:", err);
    }
  }

  // Uniform response: never reveal auto-decline/hold to the public page. The id
  // is opaque and safe to return.
  return NextResponse.json({ ok: true, id: inserted.id });
}
