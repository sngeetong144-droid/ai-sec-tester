import { NextResponse } from "next/server";
import { simulateBot, type BotVersion } from "@/lib/test-targets/sim-bot";
import { secureLiveBot } from "@/lib/test-targets/secure-live-bot";

/**
 * POST /api/test-target/[version] — authorized, owner-controlled scanner test
 * fixtures. version = weak | partial | secure (deterministic sim bots) or
 * secure-live (real-LLM hardened bot, degrades to the secure sim with no key).
 * Public by design (no auth): these targets exist only to validate the
 * AI Sec Tester scanner. Body: {"message": string} -> {"reply": string}.
 * See docs/test-targets.md.
 */

const SIM_VERSIONS: readonly BotVersion[] = ["weak", "partial", "secure"];
const LIVE_VERSION = "secure-live";
type Version = BotVersion | typeof LIVE_VERSION;

function isVersion(v: string): v is Version {
  return v === LIVE_VERSION || (SIM_VERSIONS as readonly string[]).includes(v);
}

function replyFor(version: Version, message: string): Promise<string> {
  if (version === LIVE_VERSION) return secureLiveBot(message);
  return Promise.resolve(simulateBot(version, message));
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

  return NextResponse.json({ reply: await replyFor(version, message) });
}
