import { NextResponse } from "next/server";
import { simulateBot, type BotVersion } from "@/lib/test-targets/sim-bot";

/**
 * POST /api/test-target/[version] — authorized, owner-controlled scanner test
 * fixtures. version = weak | partial | secure. Public by design (no auth):
 * these deterministic bots exist only to validate the AI Sec Tester scanner.
 * Body: {"message": string} -> {"reply": string}. See docs/test-targets.md.
 */

const VERSIONS: readonly BotVersion[] = ["weak", "partial", "secure"];

function isVersion(v: string): v is BotVersion {
  return (VERSIONS as readonly string[]).includes(v);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ version: string }> },
) {
  const { version } = await ctx.params;
  if (!isVersion(version)) {
    return NextResponse.json({ error: "unknown version" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const message = (body as { message?: unknown })?.message;
  if (typeof message !== "string") {
    return NextResponse.json(
      { error: "message must be a string" },
      { status: 400 },
    );
  }

  return NextResponse.json({ reply: simulateBot(version, message) });
}
