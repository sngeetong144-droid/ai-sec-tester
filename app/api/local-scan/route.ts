import { NextResponse } from "next/server";
import { assertPublicTarget } from "@/lib/scan-engine";
import {
  runTieredScanEngine,
  type ScanTier,
} from "@/lib/tiered-scan-engine";
import { getRequestIdentity, getVerifiedOwnership } from "@/lib/queries";
import { recordScanAudit } from "@/lib/audit-log";
import { extractDomain } from "@/lib/ownership-verification";
import { hashString } from "@/lib/probe";

function localScannerEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function normalizeUrl(raw: unknown, allowLocal: boolean): string | null {
  let url = String(raw ?? "").trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const localHost =
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    if (!parsed.hostname.includes(".") && !(allowLocal && localHost)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function normalizeTier(raw: unknown): ScanTier {
  return raw === "basic" || raw === "pro" || raw === "enterprise"
    ? raw
    : "enterprise";
}

function isScannerConsoleTarget(target: string): boolean {
  try {
    const parsed = new URL(target);
    const localScannerHost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    return localScannerHost && parsed.port === "3002" && parsed.pathname.startsWith("/command-center/scan");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!localScannerEnabled()) {
    return NextResponse.json({ error: "Local scanner is disabled." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const allowLocal = body?.allow_local === true;
  const target = normalizeUrl(body?.target_url, allowLocal);
  const authorized = body?.authorized === true;
  const tier = normalizeTier(body?.tier);

  if (!target) {
    return NextResponse.json(
      { error: "Enter a valid chatbot URL, for example example.com." },
      { status: 400 },
    );
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Confirm you own or are authorized to test this chatbot." },
      { status: 400 },
    );
  }

  if (isScannerConsoleTarget(target)) {
    return NextResponse.json(
      {
        error:
          "Do not scan the Command Center scanner page itself. Scan the chatbot URL instead, for example http://127.0.0.1:5679/webhook-test/ai-sec-demo-fixed.",
      },
      { status: 400 },
    );
  }

  // Sprint 2 SAFE gate: real public targets require a verified ownership proof
  // for the same domain. ponytail: localhost dev runs (allow_local) are your own
  // machine — inherently owned — so they skip the gate to keep the dev console usable.
  const ownershipProofId =
    typeof body?.ownership_proof_id === "string" ? body.ownership_proof_id : "";
  let proofEmail: string | null = null;
  if (!allowLocal) {
    const identity = await getRequestIdentity();
    const proof = ownershipProofId
      ? await getVerifiedOwnership(ownershipProofId, identity)
      : null;
    if (!proof || proof.target_domain !== extractDomain(target)) {
      return NextResponse.json(
        {
          error:
            "Ownership not verified for this domain. Complete domain verification before scanning.",
        },
        { status: 403 },
      );
    }
    proofEmail = proof.email;
  }

  try {
    await assertPublicTarget(target, { allowPrivateTarget: allowLocal });
    const engine = await runTieredScanEngine(target, tier, {
      allowPrivateTarget: allowLocal,
    });
    // Dev-only console: best-effort audit, not fail-closed (that's the
    // deep-scan/payment gate). Don't fail a completed local scan just
    // because the audit insert hiccuped.
    try {
      await recordScanAudit({
        scanId: null,
        email: proofEmail,
        targetUrl: target,
        tier,
        ownershipProofId: ownershipProofId || null,
        resultHash: String(hashString(JSON.stringify(engine))),
      });
    } catch (auditError) {
      console.error("[local-scan] audit not recorded:", auditError);
    }
    return NextResponse.json({
      target_url: target,
      scanned_at: new Date().toISOString(),
      ...engine,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error).replace(/^Error:\s*/, "") },
      { status: 400 },
    );
  }
}
