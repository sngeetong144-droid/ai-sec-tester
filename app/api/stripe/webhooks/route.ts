import { constructWebhookEvent } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { activateCase } from "@/lib/command-center/queries";
import { markRequestPaid } from "@/app/actions/scan-request-lifecycle";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * Kick the dispatcher the moment money lands, so a paid scan starts in seconds
 * instead of waiting for the next cron tick (the customer promise is
 * request → approve → pay → scan → report, with no human in the loop).
 *
 * Fire-and-DON'T-await: /api/cron/dispatch-scans runs scans synchronously and can
 * take minutes, which would blow Stripe's webhook timeout and trigger retries. We
 * abort the CLIENT side after a moment — that only drops our end of the socket;
 * the dispatch invocation Vercel already started keeps running to completion.
 * Cron remains the backstop for anything this misses.
 */
async function kickDispatch(): Promise<void> {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return; // not configured → cron still picks it up

  const controller = new AbortController();
  const cut = setTimeout(() => controller.abort(), 1_500);
  try {
    await fetch(`${base.replace(/\/$/, "")}/api/cron/dispatch-scans`, {
      headers: { authorization: `Bearer ${secret}` },
      signal: controller.signal,
    });
  } catch {
    // Abort/network failure is expected and harmless — the run is already underway
    // server-side, and the cron backstop covers a genuine miss.
  } finally {
    clearTimeout(cut);
  }
}

/**
 * POST /api/stripe/webhooks
 *
 * Receives and processes Stripe webhook events.
 * Register this URL in your Stripe dashboard:
 *   https://dashboard.stripe.com/webhooks → add endpoint → /api/stripe/webhooks
 *
 * Required events to enable in Stripe dashboard:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_failed
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error("[stripe/webhooks] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      // ── New subscription or one-time purchase ─────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // ── PRIMARY paid → paid_scanning path (scan_requests lifecycle) ────────
        // The approval flow appends ?client_reference_id=<scan_request id> to the
        // payment link, so a settled checkout carries it back. Flip that request to
        // paid_scanning; the cron dispatch job then runs the guarded scan. IDEMPOTENT:
        // markRequestPaid only transitions a row still in approved_awaiting_payment, so
        // a duplicate delivery is a no-op (no second scan — the scan is triggered by the
        // separate dispatch job, keyed on paid_scanning — and this handler queues no email).
        // FLAG: it is UNCONFIRMED that FastPayDirect/Scalendo forwards client_reference_id
        // and fires a Stripe `checkout.session.completed` event. If it does not, console
        // activation remains the manual fallback. See deliverable notes.
        const clientRef =
          session.client_reference_id ?? session.metadata?.client_reference_id;
        if (clientRef && session.payment_status === "paid") {
          // Pass amount_total so markRequestPaid rejects underpayment (a basic-tier
          // checkout carrying an enterprise request's client_reference_id), and the
          // discount so a merchant-issued promotion code still counts toward the
          // quoted price rather than reading as an underpayment.
          const paid = await markRequestPaid(
            clientRef,
            session.amount_total,
            session.total_details?.amount_discount ?? 0,
          );
          // Only kick when THIS delivery performed the transition (markRequestPaid
          // returns false for a duplicate/underpaid delivery), so a replayed webhook
          // cannot start a second dispatch run.
          if (paid) await kickDispatch();
        }

        // ── Legacy cc_cases metadata activation (kept; never fires for FastPayDirect
        //    static links — flagged non-functional in recon). ───────────────────
        const caseId = session.metadata?.case_id;
        const scanId = session.metadata?.scan_id;
        if (caseId && scanId && session.payment_status === "paid") {
          await activateCase(caseId, scanId);
        }

        const userId = session.metadata?.userId;
        if (!userId) break;

        // Store Stripe customer ID on profile for future portal/checkout calls
        if (session.customer) {
          await supabase
            .from("profiles")
            .update({ stripe_customer_id: session.customer as string })
            .eq("id", userId);
        }

        // If subscription, the subscription.updated event will handle status
        if (session.mode === "payment") {
          await supabase.from("purchases").upsert({
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_session_id: session.id,
            amount_total: session.amount_total,
            status: "paid",
          });
        }
        break;
      }

      // ── Subscription created or updated ───────────────────────────────────
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await supabase.from("subscriptions").upsert({
          id: sub.id,
          user_id: userId,
          stripe_customer_id: sub.customer as string,
          status: sub.status,
          price_id: sub.items.data[0]?.price.id,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        });
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        break;
      }

      // ── Payment failed — notify user ──────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("[stripe/webhooks] payment failed for customer:", invoice.customer);
        // TODO: send email via Supabase Edge Function or Resend
        break;
      }

      default:
        // Unhandled event — safe to ignore
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhooks] error handling ${event.type}:`, err);
    // Return 200 anyway — Stripe will retry on 5xx, not on handler errors
  }

  return NextResponse.json({ received: true });
}
