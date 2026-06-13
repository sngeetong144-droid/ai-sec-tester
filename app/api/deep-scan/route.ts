import { NextResponse } from "next/server";
import { stripe, stripeAccountOptions } from "@/lib/stripe";

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

  let body: { scanId?: string; email?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
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
                  "Manual, expert-led prompt-injection & jailbreak pentest of your AI chatbot with a full written report.",
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
