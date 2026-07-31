"use client";

import { useState } from "react";

import { PAYMENT_LINKS } from "@/lib/payment-links";

interface Challenge {
  proof_id: string;
  token: string;
  dns_txt_record: string;
  well_known_path: string;
}

/** Browser-side twin of lib/ownership-verification#extractDomain. That module
 *  imports node:dns / node:https and can never be pulled into a client bundle,
 *  so the parse is repeated here with the same URL semantics. */
function domainOf(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(raw.includes("://") ? raw : "https://" + raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function DeepScanCta({
  scanId,
  email,
  targetUrl,
  categoriesRun = 0,
}: {
  scanId: string;
  email: string | null;
  /** The scan's target URL — the domain the buyer has to prove they control. */
  targetUrl: string;
  /**
   * How many core attack categories actually produced a result. On an
   * incomplete scan this is 0, and the card must NOT claim it ran anything —
   * telling a customer we "ran the 5 core attack categories" on a 0/0 report
   * is a false statement about work they paid for.
   */
  categoriesRun?: number;
}) {
  // busy names the in-flight step so each button gets its own pending state.
  const [busy, setBusy] = useState<null | "challenge" | "verify" | "checkout">(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const domain = domainOf(targetUrl);

  /** Step 1 — ask the server for a one-off verification token for this domain. */
  async function startVerification() {
    if (!domain) {
      setMessage(
        "We could not read a website address from this scan, so we cannot start ownership checks. Please run a new scan with a full address such as https://example.com.",
      );
      return;
    }
    setBusy("challenge");
    setMessage(null);
    try {
      const res = await fetch("/api/ownership/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, target_url: targetUrl, email }),
      });
      const data = await res.json();
      if (data.proof_id && data.token) {
        setChallenge({
          proof_id: data.proof_id as string,
          token: data.token as string,
          dns_txt_record: (data.dns_txt_record as string) || domain,
          well_known_path: (data.well_known_path as string) || "",
        });
        return;
      }
      setMessage(data.error ?? "Could not start the ownership check. Please try again.");
    } catch {
      setMessage("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  /** Step 3 — only reachable with a verified proof; identical hand-off to
   *  checkout as before, plus the proof id the route requires. */
  async function startCheckout(proofId: string) {
    setBusy("checkout");
    try {
      const res = await fetch("/api/deep-scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId, email, ownership_proof_id: proofId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
        return;
      }
      setMessage(data.error ?? "Could not start checkout.");
    } catch {
      setMessage("Network error — please try again.");
    } finally {
      setBusy(null);
    }
  }

  /** Step 2 — check the record/file is live, then roll straight into checkout. */
  async function verifyOwnership() {
    if (!challenge) return;
    setBusy("verify");
    setMessage(null);
    try {
      const res = await fetch("/api/ownership/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proof_id: challenge.proof_id }),
      });
      const data = await res.json();
      if (data.verified === true) {
        setMessage("Ownership confirmed — taking you to checkout…");
        await startCheckout(challenge.proof_id);
        return;
      }
      setMessage(
        data.error === "Challenge not found."
          ? "That verification request has expired. Close this and press the upgrade button again to get a fresh code."
          : "We could not see it yet. DNS changes usually take a few minutes to spread across the internet (occasionally up to an hour), and uploaded files can take a moment to go live. Nothing is lost — wait a little and press verify again.",
      );
    } catch {
      setMessage("Network error — please try again.");
    } finally {
      setBusy((b) => (b === "verify" ? null : b));
    }
  }

  async function copyToken() {
    if (!challenge) return;
    try {
      await navigator.clipboard.writeText(challenge.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage(
        "Your browser blocked the copy. Select the code above and copy it by hand instead.",
      );
    }
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-violet-100 bg-white/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-slate-800">
            Want a real-world deep pentest?
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {categoriesRun > 0
              ? `This scan ran ${categoriesRun} of the 5 core attack categories against your bot. `
              : "This scan did not complete any of the 5 core attack categories against your bot. "}
            Our{" "}
            <span className="font-semibold text-brand-600">Enterprise Grade</span>{" "}
            deep scan runs an expert-led, manual prompt-injection &amp; jailbreak
            pentest against your live chatbot — with a full written report and
            remediation plan.
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-800">
            ${PAYMENT_LINKS.enterprise.priceUsd}
          </div>
          <div className="text-xs text-slate-400">one-time</div>
        </div>
      </div>

      {!challenge && (
        <>
          <button
            onClick={startVerification}
            disabled={busy !== null}
            className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
          >
            {busy === "challenge"
              ? "Preparing…"
              : "Upgrade to Enterprise Deep Scan →"}
          </button>
          <p className="mt-2 text-xs text-slate-400">
            A deep scan actively attacks a live system, so we first ask you to
            prove the site is yours. It takes about two minutes and happens
            before any payment.
          </p>
        </>
      )}

      {challenge && (
        <div className="mt-5 rounded-xl border border-violet-100 bg-white/50 p-4">
          <h4 className="font-semibold text-slate-800">
            Step 1 of 2 — confirm {domain} belongs to you
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            We gave you a private code. Put that code somewhere only the owner of{" "}
            {domain} could put it, and we will check for it. There are two ways
            to do that — <span className="font-semibold">pick whichever one is
            easier for you, you only need to do one.</span>
          </p>

          <div className="mt-4 rounded-lg bg-violet-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Your code
            </p>
            <p className="mt-1 break-all font-mono text-sm text-slate-700">
              {challenge.token}
            </p>
            <button
              type="button"
              onClick={copyToken}
              className="mt-2 rounded-md border border-violet-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-500 hover:text-brand-600"
            >
              {copied ? "Copied ✓" : "Copy code"}
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-violet-100 bg-white/70 p-4">
            <h5 className="text-sm font-semibold text-slate-800">
              Option A — add the code to your domain settings
            </h5>
            <p className="mt-1 text-sm text-slate-500">
              Sign in wherever you bought your domain name (GoDaddy, Namecheap,
              Cloudflare, Squarespace and so on) and look for a page called{" "}
              <span className="font-medium">DNS</span> or{" "}
              <span className="font-medium">DNS records</span>. Add a new record
              using these three values. A &ldquo;TXT record&rdquo; is just a
              short note attached to your domain — it does not affect your
              website, email, or visitors.
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="w-28 shrink-0 text-slate-400">Type</dt>
                <dd className="font-mono text-slate-700">TXT</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="w-28 shrink-0 text-slate-400">Name / Host</dt>
                <dd className="break-all font-mono text-slate-700">
                  {challenge.dns_txt_record}
                </dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="w-28 shrink-0 text-slate-400">Value</dt>
                <dd className="break-all font-mono text-slate-700">
                  {challenge.token}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-slate-400">
              If the Name box will not accept the full address, type{" "}
              <span className="font-mono">@</span> instead — most providers use
              that to mean &ldquo;the domain itself&rdquo;. Leave any TTL or
              priority boxes on their default.
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-violet-100 bg-white/70 p-4">
            <h5 className="text-sm font-semibold text-slate-800">
              Option B — put the code in a file on your site
            </h5>
            <p className="mt-1 text-sm text-slate-500">
              If it is easier to edit your website than your domain settings,
              upload a plain text file so that this address opens and shows
              nothing but the code:
            </p>
            <p className="mt-2 break-all rounded-md bg-violet-50 px-3 py-2 font-mono text-xs text-slate-700">
              https://{domain}
              {challenge.well_known_path}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              The folder name starts with a dot on purpose. The file&rsquo;s
              entire contents should be the code above and nothing else. You can
              open that address in your browser to check it before verifying.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={verifyOwnership}
              disabled={busy !== null}
              className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-70"
            >
              {busy === "verify"
                ? "Checking…"
                : busy === "checkout"
                  ? "Starting checkout…"
                  : "I've added it — verify"}
            </button>
            <button
              type="button"
              onClick={() => {
                setChallenge(null);
                setMessage(null);
              }}
              disabled={busy !== null}
              className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline disabled:opacity-70"
            >
              I&rsquo;ll do this later
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Once we can see the code, we take you straight to checkout. You are
            not charged anything until then.
          </p>
        </div>
      )}

      {message && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {message}
        </p>
      )}
    </div>
  );
}
