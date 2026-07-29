import { NextResponse } from "next/server";
import { realScanEnabled } from "@/lib/real-scan-engine";

// Booleans only — never a value, never a prefix. Vercel blanks Sensitive vars on
// `env pull`, so the interactive scanner's armed/disarmed state cannot be read
// from outside; this is the honest instrument for it.
export function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    scanner: {
      realScanEnabled: realScanEnabled(),
      judgeKeyPresent:
        Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.ANTHROPIC_API_KEY),
      flagLiteralOk:
        String(process.env.REAL_SCAN_ENABLED ?? "").trim().toLowerCase() === "true",
    },
  });
}
