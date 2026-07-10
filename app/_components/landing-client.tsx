"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PAYMENT_LINKS } from "@/lib/payment-links";
import { COUNTRIES } from "@/lib/jurisdiction-policy";

const PLAN_LABELS: Record<string, string> = {
  basic: PAYMENT_LINKS.basic.label,
  advanced: PAYMENT_LINKS.advanced.label,
  enterprise: PAYMENT_LINKS.enterprise.label,
};

/**
 * Progressive-enhancement scroll reveal, ported from soul-site.js.
 * Adds `.in` to every `[data-reveal]` inside the landing as it scrolls in.
 * The page is fully visible without JS via the <noscript> style in Landing,
 * so this only layers the animation on top.
 */
export function RevealScripts() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>(".aist-landing [data-reveal]"),
    );
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            const el = en.target as HTMLElement;
            el.style.transitionDelay = `${el.dataset.revealDelay || 0}ms`;
            el.classList.add("in");
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return null;
}

/**
 * Floating "chat with us" bubble, ported from soul-site.js. Live chat is not
 * wired yet ("coming soon") — submitting shows a local acknowledgement only,
 * exactly like the static design. No network call, no dead promise.
 */
export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim();
    if (!name || !email || !message) return;
    // ponytail: local ack only — live chat inbox not built yet (matches design).
    setSent(true);
  }

  return (
    <div className={`chatw${open ? " open" : ""}`}>
      <div className="panel">
        <div className="phead">
          <b>Chat with us</b>
          <p>Live chat is coming soon</p>
        </div>
        <div className="pbody">
          <div className="msg">
            👋 Our AI assistant is on its way. In the meantime, leave a message and
            we&rsquo;ll get back to you by email.
          </div>
          {sent ? (
            <div className="thx show">Thanks! We&rsquo;ll be in touch soon. 🙌</div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="cfield">
                <input type="text" name="name" required placeholder="Your name" />
              </div>
              <div className="cfield">
                <input type="email" name="email" required placeholder="Email address" />
              </div>
              <div className="cfield">
                <textarea name="message" required placeholder="How can we help?" />
              </div>
              <button type="submit" className="btn btn-accent">
                Send message
              </button>
            </form>
          )}
        </div>
      </div>
      <button
        className="bubble"
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dot" />
        <svg className="chat-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
        </svg>
        <svg className="close-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

const CheckSm = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * Public scan-request form, ported from the static #request section. Posts the
 * exact ScanRequestBody shape to /api/scan-request, which records the request in
 * the Command Center Intake queue (scan_requests). NO payment/checkout here —
 * the payment link is emailed only after a human approves the request.
 */
export function RequestForm() {
  const [plan, setPlan] = useState(PAYMENT_LINKS.advanced.label);
  const [country, setCountry] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Tier CTAs elsewhere on the page carry data-plan="basic|advanced|enterprise";
  // clicking one preselects the matching plan here (static data-tier behavior).
  useEffect(() => {
    const btns = Array.from(document.querySelectorAll<HTMLElement>(".aist-landing [data-plan]"));
    const onClick = (e: Event) => {
      const key = (e.currentTarget as HTMLElement).dataset.plan;
      if (key && PLAN_LABELS[key]) setPlan(PLAN_LABELS[key]);
    };
    btns.forEach((b) => b.addEventListener("click", onClick));
    return () => btns.forEach((b) => b.removeEventListener("click", onClick));
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const website = String(fd.get("website") || ""); // honeypot — must stay empty
    const selected = COUNTRIES.find((c) => c.code === country);

    const body = {
      plan,
      name: String(fd.get("name") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      company: String(fd.get("company") || "").trim(),
      countryDeclared: country,
      countryDeclaredName: selected?.name ?? "",
      browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      browserLocale: typeof navigator !== "undefined" ? navigator.language : "",
      dueDiligenceConsent: consent,
      target: String(fd.get("target") || "").trim(),
      context: String(fd.get("context") || "").trim(),
      website,
    };

    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/scan-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setStatus("ok");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setErrorMsg(data?.error || "Could not submit your request. Please try again.");
      setStatus("error");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <div className="req-form">
        <div className="req-note ok">
          <span className="ic">
            <CheckSm />
          </span>
          Request received. Check your email — we&rsquo;ll review and reply within one
          business day with next steps. No charge until your request is approved.
        </div>
      </div>
    );
  }

  return (
    <form className="req-form" onSubmit={handleSubmit} autoComplete="on">
      <div className="field">
        <label htmlFor="rf-plan">Plan</label>
        <select id="rf-plan" name="plan" value={plan} onChange={(e) => setPlan(e.target.value)} required>
          {(["basic", "advanced", "enterprise"] as const).map((k) => (
            <option key={k} value={PLAN_LABELS[k]}>
              {PLAN_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="rf-name">Full name</label>
          <input id="rf-name" type="text" name="name" required placeholder="Jane Smith" />
        </div>
        <div className="field">
          <label htmlFor="rf-email">Work email</label>
          <input id="rf-email" type="email" name="email" required placeholder="you@company.com" />
        </div>
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="rf-company">Company / brand</label>
          <input id="rf-company" type="text" name="company" placeholder="Acme Inc." />
        </div>
        <div className="field">
          <label htmlFor="rf-country">Country of residence</label>
          <select id="rf-country" name="country" value={country} onChange={(e) => setCountry(e.target.value)} required>
            <option value="">— Select country —</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="rf-target">Target to scan (chatbot URL or endpoint)</label>
        <input id="rf-target" type="url" name="target" required placeholder="https://yoursite.com/chat" />
      </div>
      <div className="field">
        <label htmlFor="rf-context">
          What is the chatbot for? <span style={{ fontWeight: 500, color: "var(--ink-3)" }}>(optional)</span>
        </label>
        <textarea id="rf-context" name="context" placeholder="e.g. customer support bot on our marketing site" />
      </div>
      <label className="consent">
        <input type="checkbox" name="authorized" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>
          I confirm I own this target, or I am explicitly authorized to test it, and I accept the{" "}
          <a href="https://thesoulsofai.com/terms" target="_blank" rel="noopener noreferrer">
            Terms
          </a>
          .
        </span>
      </label>
      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />
      <button type="submit" className="btn btn-accent" disabled={status === "sending"}>
        {status === "sending" ? "Submitting…" : "Submit scan request"}
      </button>
      {status === "error" && (
        <div className="req-note err">
          <span>{errorMsg}</span>
        </div>
      )}
    </form>
  );
}
