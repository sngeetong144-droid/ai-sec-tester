/**
 * scan-request payment lifecycle helpers (server-only by convention).
 *
 * The PAYMENT lifecycle lives on the `scan_requests` table (migration 0006 added
 * stripe_client_reference_id / payment_link_sent_at / report_url / rejection_reason
 * and the status values approved_awaiting_payment | paid_scanning | complete). The
 * console's cc_cases state machine (intake→approval→approved→scanning→complete) is a
 * SEPARATE vocabulary; the two are bridged in the cron dispatch job. These helpers
 * only touch scan_requests via the service-role client.
 *
 * No "use server" directive: these are plain server helpers, not client-callable
 * server actions. No `import "server-only"` so the pure helpers stay unit-testable
 * under bun; do not import this from a "use client" file.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { resolvePaymentLink } from "@/lib/payment-links";

/** Reminder fires once the approval link has sat unpaid this long. */
export const PAYMENT_REMINDER_AFTER_MS = 48 * 60 * 60 * 1000; // 48h
/** Auto-close (reject) once the approval link has sat unpaid this long. */
export const PAYMENT_AUTOCLOSE_AFTER_MS = 14 * 24 * 60 * 60 * 1000; // 14d

/**
 * Append the Stripe/Scalendo checkout hints to a payment link. `client_reference_id`
 * is the scan_request id — the webhook reads it back to identify the paid request.
 * ponytail: assumes the provider forwards these query params to the settlement
 * webhook (standard Stripe payment-link behaviour). Unconfirmed for FastPayDirect —
 * flagged in the deliverable notes.
 */
export function buildPaymentUrl(
  base: string,
  requestId: string,
  email: string | null | undefined,
): string {
  const u = new URL(base);
  u.searchParams.set("client_reference_id", requestId);
  if (email) u.searchParams.set("prefilled_email", email);
  return u.toString();
}

export interface PaymentCountdown {
  reminderDueInMs: number | null;
  autoCloseDueInMs: number | null;
  reminderOverdue: boolean;
  autoCloseOverdue: boolean;
}

/**
 * Derived stale-payment countdown for a case awaiting payment. Pure — the Command
 * Center can render this straight from scan_requests.payment_link_sent_at without a
 * stored column. Negative *DueInMs means overdue.
 */
export function paymentCountdown(
  paymentLinkSentAt: string | null | undefined,
  now: number = Date.now(),
): PaymentCountdown {
  if (!paymentLinkSentAt) {
    return {
      reminderDueInMs: null,
      autoCloseDueInMs: null,
      reminderOverdue: false,
      autoCloseOverdue: false,
    };
  }
  const elapsed = now - new Date(paymentLinkSentAt).getTime();
  return {
    reminderDueInMs: PAYMENT_REMINDER_AFTER_MS - elapsed,
    autoCloseDueInMs: PAYMENT_AUTOCLOSE_AFTER_MS - elapsed,
    reminderOverdue: elapsed >= PAYMENT_REMINDER_AFTER_MS,
    autoCloseOverdue: elapsed >= PAYMENT_AUTOCLOSE_AFTER_MS,
  };
}

export interface ApprovedPayment {
  url: string;
  baseUrl: string;
}

/**
 * APPROVE (payment side): stamp the scan_request with its payment link + lifecycle
 * state. Sets stripe_client_reference_id = the request id (webhook lookup key),
 * status = approved_awaiting_payment, payment_link_sent_at = now. Returns the exact
 * param-appended checkout URL so the caller can queue it in the approval email, or
 * null when no payment link resolves for the plan/tier.
 */
export async function approveScanRequestPayment(
  requestId: string,
  planOrTier: string | null | undefined,
  email: string | null | undefined,
): Promise<ApprovedPayment | null> {
  const link = resolvePaymentLink(planOrTier);
  if (!link) return null;
  const url = buildPaymentUrl(link.url, requestId, email);

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("scan_requests")
    .update({
      stripe_client_reference_id: requestId,
      status: "approved_awaiting_payment",
      payment_link_sent_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) {
    console.error("approveScanRequestPayment error:", error.message);
    return null;
  }
  return { url, baseUrl: link.url };
}

/**
 * WEBHOOK settlement: flip a paid request to paid_scanning. IDEMPOTENT by design —
 * the conditional WHERE only matches a row still in approved_awaiting_payment, so a
 * duplicate webhook delivery updates zero rows and returns false (no re-trigger).
 * Matches on stripe_client_reference_id (indexed by 0006). Returns whether a row
 * transitioned.
 */
export async function markRequestPaid(
  clientReferenceId: string,
  amountTotalCents?: number | null,
  /** Stripe `total_details.amount_discount` — promotion codes and coupons. */
  discountCents?: number | null,
): Promise<boolean> {
  const supabase = createServiceClient();

  // Read the awaiting-payment row FIRST so we can validate the settled amount
  // against the quoted tier price before flipping. Underpayment guard: opening a
  // cheaper payment link (basic $47) with a higher tier's client_reference_id
  // (enterprise $497) fires a validly-signed paid webhook — without this check the
  // enterprise scan would unlock for the basic price. Still idempotent: the row
  // only exists while in approved_awaiting_payment, so a duplicate delivery finds
  // nothing and no-ops.
  const { data: reqRow, error: readErr } = await supabase
    .from("scan_requests")
    .select("id, plan")
    .eq("stripe_client_reference_id", clientReferenceId)
    .eq("status", "approved_awaiting_payment")
    .maybeSingle();
  if (readErr) {
    console.error("markRequestPaid read error:", readErr.message);
    return false;
  }
  if (!reqRow) return false; // no awaiting row → idempotent no-op

  if (amountTotalCents != null) {
    const link = resolvePaymentLink((reqRow as { plan: string | null }).plan);
    const expectedCents = link ? link.priceUsd * 100 : 0;
    // Compare the GROSS value of the checkout (paid + discounted), not the net
    // charge. The guard exists to stop a cheap link being opened with an
    // expensive tier's client_reference_id — a discount the merchant themselves
    // issued is not that attack. Comparing net alone meant any Stripe promotion
    // code, including the 100%-off coupon used to test the money path without
    // spending, produced a validly-paid checkout that this function then refused
    // to activate: Stripe says paid, the scan never runs, and the customer waits.
    const grossCents = amountTotalCents + (discountCents ?? 0);
    // What the buyer was ACTUALLY charged, as opposed to the gross value above.
    const netCents = amountTotalCents;
    if (expectedCents > 0 && grossCents < expectedCents) {
      console.error(
        `markRequestPaid: underpayment for ${(reqRow as { id: string }).id} — gross ${grossCents}c ` +
          `(paid ${amountTotalCents}c + discount ${discountCents ?? 0}c) < quoted ${expectedCents}c; not flipping to paid_scanning.`,
      );
      return false;
    }

    // ── Denial-of-wallet guard for fully-discounted checkouts ──────────────
    // The gross check above deliberately treats a merchant coupon as payment, so
    // a 100%-off code on the ENTERPRISE link yields gross $497 >= $497 and unlocks
    // a free $497 scan. That is correct for a private test coupon and wrong for a
    // lead-magnet code, which is public by design: one shared or leaked code then
    // buys anyone unlimited enterprise scans, and every scan spends real LLM
    // tokens. Stripe can cap redemptions and restrict a code to one price, but
    // that is dashboard configuration a human can forget — this is the same rule
    // enforced where the money actually settles.
    //
    // FREE_SCAN_MAX_TIER is the highest tier a ZERO-CHARGE checkout may unlock.
    // Default "basic": free leads get the $47 scan, paid tiers need real money.
    // Set it to "enterprise" to run a full-price test without spending.
    if (netCents === 0 && link) {
      const RANK: Record<string, number> = { basic: 0, advanced: 1, enterprise: 2 };
      const ceilingName = (process.env.FREE_SCAN_MAX_TIER ?? "basic").trim().toLowerCase();
      const ceiling = RANK[ceilingName] ?? RANK.basic;
      if ((RANK[link.tier] ?? 99) > ceiling) {
        console.error(
          `markRequestPaid: refusing free ${link.tier} scan for ${(reqRow as { id: string }).id} — ` +
            `a zero-charge checkout may unlock at most "${ceilingName}" (FREE_SCAN_MAX_TIER). ` +
            `Discount ${discountCents ?? 0}c covered the whole ${expectedCents}c price.`,
        );
        return false;
      }
    }
  }

  const { data, error } = await supabase
    .from("scan_requests")
    .update({ status: "paid_scanning" })
    .eq("stripe_client_reference_id", clientReferenceId)
    .eq("status", "approved_awaiting_payment")
    .select("id");
  if (error) {
    console.error("markRequestPaid error:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}
