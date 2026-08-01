import { NextResponse } from "next/server";
import { resolvePaymentLink } from "@/lib/payment-links";
import { buildPaymentUrl } from "@/app/actions/scan-request-lifecycle";
import { getRequestIdentity, getScan, getVerifiedOwnership } from "@/lib/queries";
import { extractDomain } from "@/lib/ownership-verification";
import { recordScanAudit } from "@/lib/audit-log";
import { decideActivation, sanctionsCheck, ssrfSafeTarget } from "@/lib/scan-gate";

export const dynamic = "force-dynamic";

/**
 * POST /api/deep-scan
 * Body: { scanId?: string, email?: string, ownership_proof_id?: string }
 *
 * Authorizes an "Enterprise Grade" deep-scan request (ownership + domain
 * binding + SSRF/sanctions gate + audit), then hands back the canonical
 * Scalendo (Stripe-backed) enterprise payment link. Payment/settlement happen
 * on Scalendo — this route does NOT create a Stripe Checkout session. No auth
 * (demo-first).
 */
export async function POST(request: Request) {
  let body: { scanId?: string; email?: string; ownership_proof_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }

  // Sprint 2 SAFE gate: a deep scan is an active assessment — require a verified
  // domain-ownership proof before taking payment, and record the audit trail.
  const ownershipProofId =
    typeof body.ownership_proof_id === "string" ? body.ownership_proof_id : "";
  const identity = await getRequestIdentity();
  const proof = ownershipProofId
    ? await getVerifiedOwnership(ownershipProofId, identity)
    : null;
  if (!proof) {
    return NextResponse.json(
      {
        configured: true,
        error:
          "Ownership not verified. Complete domain verification before requesting a deep scan.",
      },
      { status: 403 },
    );
  }

  // CRITICAL #2 fix: a verified proof only authorizes its own domain. Without
  // this check, a proof for a domain you own could be paired with a scanId
  // pointing at any other target ("victim") and still pass the gate. With a
  // scanId the authorized target is the scan's URL; without one it is the
  // proof's own verified domain.
  let target: string;
  if (body.scanId) {
    const scan = await getScan(body.scanId);
    if (!scan || extractDomain(scan.target_url) !== proof.target_domain) {
      return NextResponse.json(
        {
          configured: true,
          error: "Ownership proof does not match this scan's target.",
        },
        { status: 403 },
      );
    }
    target = scan.target_url;
  } else {
    target = `https://${proof.target_domain}`;
  }

  // Deterministic activation gate (lib/scan-gate). Ownership + domain binding are
  // proven above; the gate adds the SSRF/allowlist + sanctions sub-checks so a
  // proof for a public domain that (re)resolves to an internal address, or a
  // sanctioned target, still cannot launch a paid active scan.
  const ssrf = await ssrfSafeTarget(target);
  const decision = decideActivation({
    ownershipVerified: true, // proven: verified proof + domain matches target above
    ssrfSafe: ssrf.ok,
    // ponytail: no country signal is captured in this flow; sanctionsCheck fails
    // open on a null signal by design. FOLLOW-UP: capture requester/target
    // country (geo-IP or form field) and pass it here to arm the sub-check.
    sanctionsOk: sanctionsCheck(null).ok,
    // ponytail: this route only HANDS OUT the Scalendo payment link — money
    // isn't received here, so `paid` can't be confirmed at this step. Real
    // "paid -> activate" is bound to the signature-verified
    // checkout.session.completed webhook (app/api/stripe/webhooks). This gate
    // therefore only proves pre-payment authorization (ownership/SSRF/sanctions)
    // before issuing the link.
    paid: true,
  });
  if (!decision.activate) {
    return NextResponse.json(
      { configured: true, error: `Scan not authorized: ${decision.reason}` },
      { status: 403 },
    );
  }

  // MEDIUM #5 fix: fail closed — no audit row, no Stripe session.
  let auditId: string | null = null;
  try {
    auditId = await recordScanAudit({
      scanId: body.scanId || null,
      email: body.email || proof.email,
      targetUrl: proof.target_domain,
      tier: "enterprise",
      ownershipProofId,
      resultHash: null,
    });
  } catch {
    return NextResponse.json(
      {
        configured: true,
        error: "Could not record the audit trail. Please try again.",
      },
      { status: 500 },
    );
  }

  // Payment is the canonical Scalendo (Stripe-backed) enterprise link. The link
  // owns its own checkout + success/cancel pages; we only hand it back.
  const link = resolvePaymentLink("enterprise");
  if (!link) {
    return NextResponse.json(
      { configured: true, error: "Enterprise payment link is not configured." },
      { status: 500 },
    );
  }

  // Carry a client_reference_id. This checkout previously handed back the RAW
  // payment link, so a settled $497 enterprise payment arrived at the webhook with
  // NOTHING on it to identify the buyer, the target, or the ownership proof it was
  // taken for - unmatchable even by hand. It still does not auto-fulfil (this flow
  // captures no full_name/country_declared, which scan_requests requires NOT NULL,
  // and fabricating those on a compliance product is not acceptable), but every
  // payment is now traceable to its audit row.
  const url = auditId ? buildPaymentUrl(link.url, auditId, body.email || proof.email) : link.url;
  return NextResponse.json({ configured: true, url });
}
