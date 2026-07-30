import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimitChat } from "@/lib/rate-limit";
import { chatReply, MAX_MESSAGE_CHARS, type ChatMessage } from "@/lib/chat-assistant";

/**
 * POST /api/chat — the landing chat bubble's REAL assistant turn.
 *
 * Same discipline as /api/contact: same-origin only, no CORS headers, no OPTIONS
 * handler, honest errors. Two things this route adds, because unlike /api/contact
 * every allowed request SPENDS LLM TOKENS:
 *   1. an explicit cross-origin reject (a foreign page must not be able to bill us
 *      by fetching this endpoint from a visitor's browser), and
 *   2. a tight IP rate limit — 10 requests / 5 min (lib/rate-limit.ts).
 *
 * Provider errors are NEVER echoed to the client: the visitor gets one of a fixed
 * set of safe strings and the detail goes to the server log only. On unconfigured
 * or unavailable the UI falls back to the contact form, so the message-capture
 * path survives every failure mode here.
 *
 * ponytail: the rate limiter is per-instance in-memory (see lib/rate-limit.ts), so
 * under serverless fan-out the effective cap is cap x live instances. Upgrade path
 * is the same one noted there (Upstash / WAF rule) if spend ever justifies it.
 */

const MAX_MESSAGES = 40;

interface Body {
  messages?: unknown;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/**
 * Reject a cross-origin browser POST. The Origin header is sent by browsers on
 * every POST; when it is absent (curl, server-to-server, tests) there is no
 * cross-origin risk to reject on, so absence is allowed.
 */
function crossOrigin(req: NextRequest, host: string | null): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (host ?? "");
  } catch {
    return true; // unparseable Origin — treat as hostile
  }
}

export async function POST(req: NextRequest) {
  const headersList = await headers();

  if (crossOrigin(req, headersList.get("host"))) {
    return bad("This endpoint only accepts requests from the AI Sec Tester site.", 403);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return bad("Invalid JSON body.");
  }

  const raw = body.messages;
  if (!Array.isArray(raw) || raw.length === 0) return bad("A messages array is required.");
  if (raw.length > MAX_MESSAGES) return bad("Conversation too long. Please start a new chat.");

  const messages: ChatMessage[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return bad("Each message must be an object.");
    const { role, content } = entry as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return bad("Each message role must be 'user' or 'assistant'.");
    }
    if (typeof content !== "string") return bad("Each message needs string content.");
    const trimmed = content.trim();
    if (!trimmed) continue;
    if (trimmed.length > MAX_MESSAGE_CHARS * 4) {
      return bad(`Message too long (${MAX_MESSAGE_CHARS} characters max per message).`);
    }
    messages.push({ role, content: trimmed });
  }

  // A turn only makes sense if the visitor actually said something last.
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return bad("The last message must be from the visitor.");

  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown";

  const limit = rateLimitChat(ip);
  if (!limit.ok) {
    console.warn(`[chat] ${limit.reason}`);
    return NextResponse.json(
      {
        ok: false,
        reason: "rate_limited",
        error:
          "You've sent a lot of messages in a short window. Please wait a few minutes, or use the message form to email us.",
      },
      { status: 429 },
    );
  }

  const result = await chatReply(messages);

  if (result.ok) return NextResponse.json({ ok: true, reply: result.reply });

  // Honest, safe copy. The provider's own error text never reaches the client.
  if (result.reason === "unconfigured") {
    console.error("[chat] no provider key configured — assistant is off.");
    return NextResponse.json(
      {
        ok: false,
        reason: "unconfigured",
        error:
          "Our live assistant isn't switched on yet. Leave a message below and we'll reply by email.",
      },
      { status: 503 },
    );
  }

  console.error("[chat] every configured provider failed — replying unavailable.");
  return NextResponse.json(
    {
      ok: false,
      reason: "unavailable",
      error:
        "Our assistant is temporarily unavailable. Leave a message below and we'll reply by email.",
    },
    { status: 503 },
  );
}
