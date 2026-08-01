import { NextResponse } from "next/server";
import { providerChain, realScanEnabled } from "@/lib/real-scan-engine";
import { emailSendEnabled } from "@/lib/email-templates";

// Booleans only — never a value, never a prefix. Vercel blanks Sensitive vars on
// `env pull`, so the interactive scanner's armed/disarmed state cannot be read
// from outside; this is the honest instrument for it.
export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    /**
     * The git SHA this build was made from. Exists so a push can be PROVEN to
     * have reached production. Twice now a deployment was refused with no build,
     * no deployment record and no error — most recently a five-minute cron schedule Vercel
     * rejected outright, which silently kept a customer-facing fix off prod while
     * the commit sat on origin/main. Comparing this to local HEAD is the only
     * cheap check that catches it. See scripts/assert-deployed.mjs.
     */
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    scanner: {
      realScanEnabled: realScanEnabled(),
      judgeKeyPresent:
        Boolean(process.env.OPENAI_API_KEY) ||
        Boolean(process.env.ANTHROPIC_API_KEY) ||
        Boolean(process.env.NVIDIA_API_KEY),
      flagLiteralOk:
        String(process.env.REAL_SCAN_ENABLED ?? "").trim().toLowerCase() === "true",
      // Which provider serves FIRST, and the failover chain behind it. Names only.
      activeProvider: providerChain()[0] ?? "none",
      failoverChain: providerChain(),
      pinned: String(process.env.JUDGE_PROVIDER ?? "").trim().toLowerCase() || null,
    },
    /**
     * Can a settled checkout actually be VERIFIED and acted on? Without
     * STRIPE_WEBHOOK_SECRET every delivery fails signature verification, returns
     * 400, and the paid scan never starts — Stripe does not retry a 400, so the
     * sale is silently lost. This is the single point of failure for the entire
     * paid path and it was the one thing this instrument did not report. A green
     * scanner and a green delivery block above prove nothing if this is false.
     */
    payment: {
      webhookSecretPresent: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      stripeKeyPresent: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    // Does the finished report actually reach the customer, unattended?
    delivery: {
      emailSendEnabled: emailSendEnabled(),
      mailKeyPresent: Boolean(process.env.RESEND_API_KEY),
      autoDispatchArmed: Boolean(process.env.CRON_SECRET && process.env.NEXT_PUBLIC_APP_URL),
    },
  });
}
