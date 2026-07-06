import { NextResponse } from "next/server";
import { stripe, stripeAccountOptions } from "@/lib/stripe";
import { getRequestIdentity, getScan, getVerifiedOwnership } from "@/lib/queries";
import { extractDomain } from "@/lib/ownership-verification";
import { recordScanAudit } from "@/lib/audit-log";
import { decideActivation, sanctionsCheck, ssrfSafeTarget } from "@/lib/scan-gate";

export const dynamic = "force-dynamic";

const DEEP_SCAN_PRICE_CENTS = Number(
  process.env.DEEP_SCAN_PRICE_CENTS || "49900",
);

/**
 * POST /api/deep-scan
 * Body: { scanId?: string, email?: string }
 *
 * Creates a one-time Stripe Checkout session for the "Enterprise Grade" deep
 * security scan. Uses inline price_data so it works with only STRIPE_SECRET_KEY
 * configured — no pre-created Stripe Product/Price needed. No auth (demo-first).
 */
export async function POST(request: Request) {
  // Not configured yet → tell the client clearly (no silent/dead button).
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Payments aren't configured yet. Add STRIPE_SECRET_KEY to enable Enterprise checkout.",
      },
      { status: 503 },
    );
  }

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
    // ponytail: this route CREATES the Stripe checkout — it IS the payment step,
    // so money-received cannot be confirmed here yet. FOLLOW-UP: bind activation
    // to the signature-verified checkout.session.completed webhook. (The webhook
    // can't re-verify ownership today — getVerifiedOwnership is identity-scoped
    // and Stripe's server-to-server call carries no session cookie — so the real
    // fix threads ownership_proof_id through checkout metadata.)
    paid: true,
  });
  if (!decision.activate) {
    return NextResponse.json(
      { configured: true, error: `Scan not authorized: ${decision.reason}` },
      { status: 403 },
    );
  }

  // MEDIUM #5 fix: fail closed — no audit row, no Stripe session.
  try {
    await recordScanAudit({
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

  const origin =
    request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const back = body.scanId ? `${origin}/scans/${body.scanId}` : origin;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: DEEP_SCAN_PRICE_CENTS,
              product_data: {
                name: "Enterprise Grade Deep Security Scan",
                description:
                  "Authorization-gated chatbot prompt-injection assessment with human review, remediation guidance, and a full written report.",
              },
            },
            quantity: 1,
          },
        ],
        customer_email: body.email || undefined,
        metadata: { scanId: body.scanId ?? "", product: "deep_scan" },
        success_url: `${back}?purchase=success`,
        cancel_url: `${back}?purchase=cancelled`,
      },
      stripeAccountOptions(),
    );

    return NextResponse.json({ configured: true, url: session.url });
  } catch (err) {
    console.error("[deep-scan] checkout error:", err);
    return NextResponse.json(
      { configured: true, error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
