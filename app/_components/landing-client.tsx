"use client";

import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from "react";
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

  // Fixed-nav scroll state now belongs to <SiteNav> (app/_components/site-nav.tsx),
  // which owns `.scrolled` as React state on every route — not just this page.

  return null;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

const CHAT_GREETING =
  "Hi 👋 I'm the AI Sec Tester assistant. Ask me what a scan covers, the tiers and pricing, how to start one, or how to read your report. For anything else, use the message form and a human will reply by email.";

// Only the tail of the conversation is sent; the server caps it again server-side.
const CHAT_SEND_TURNS = 12;

/**
 * Floating "chat with us" bubble, ported from soul-site.js — now a REAL chat.
 *
 * Each turn POSTs the recent history to /api/chat (lib/chat-assistant.ts, scoped
 * strictly to AI Sec Tester topics). Model output is rendered as TEXT through JSX
 * only — no dangerouslySetInnerHTML anywhere in this file, deliberately: the reply
 * is influenced by visitor input and must never become markup.
 *
 * The old contact form is NOT removed, it is the fallback: it appears automatically
 * when the assistant reports unconfigured/unavailable, and is always one click away
 * behind "Email us instead". Message capture never depends on the LLM working.
 */
export function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Chat state
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: CHAT_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [chatErr, setChatErr] = useState("");
  // assistantDown: the API said unconfigured/unavailable — stop offering the chat
  // input and keep the visitor on the path that still works (email capture).
  const [assistantDown, setAssistantDown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Keep the newest turn in view, including while "Thinking…" is showing.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, showForm, open]);

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setChatErr("");
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-CHAT_SEND_TURNS) }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        reply?: string;
        reason?: string;
        error?: string;
      } | null;

      if (res.ok && data?.ok && typeof data.reply === "string" && data.reply.trim()) {
        const reply = data.reply.trim();
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
        return;
      }
      // Assistant genuinely off/down → hand the visitor to the form that works.
      if (data?.reason === "unconfigured" || data?.reason === "unavailable") {
        setAssistantDown(true);
        setShowForm(true);
        setChatErr(
          data.error ||
            "Our assistant isn't available right now. Leave a message and we'll reply by email.",
        );
        return;
      }
      setChatErr(data?.error || "Could not get a reply. Please try again.");
    } catch {
      setChatErr("Could not reach the assistant. Please check your connection and try again.");
    } finally {
      setThinking(false);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim();
    if (!name || !email || !message) return;

    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      // Only claim success when the message actually landed.
      if (!res.ok || !data?.ok) {
        setErr(data?.error || "Could not send your message. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setErr("Could not send your message. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`chatw${open ? " open" : ""}`}>
      <div className="panel">
        <div className="phead">
          <b>Chat with us</b>
          <p>
            {showForm
              ? "Leave a message — we reply by email"
              : "Ask about scans, tiers & reports"}
          </p>
        </div>
        <div className="pbody">
          {showForm ? (
            <>
              <div className="msg">
                {assistantDown
                  ? chatErr ||
                    "Our assistant isn’t available right now. Leave a message and we’ll reply by email."
                  : "Leave a message and we’ll get back to you by email. Support hours are 9am–6pm ET, Mon–Fri."}
              </div>
              {sent ? (
                <div className="thx show">
                  Got it — we&rsquo;ll reply to your email address. 🙌
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} autoComplete="on">
                    <div className="cfield">
                      <input
                        type="text"
                        name="name"
                        required
                        maxLength={80}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="cfield">
                      <input
                        type="email"
                        name="email"
                        required
                        maxLength={160}
                        placeholder="Email address"
                      />
                    </div>
                    <div className="cfield">
                      <textarea
                        name="message"
                        required
                        maxLength={2000}
                        placeholder="How can we help?"
                      />
                    </div>
                    {err && (
                      <p className="req-note err" role="alert">
                        {err}
                      </p>
                    )}
                    <button type="submit" className="btn btn-accent" disabled={busy}>
                      {busy ? "Sending…" : "Send message"}
                    </button>
                  </form>
                  {!assistantDown && (
                    <button type="button" className="altlink" onClick={() => setShowForm(false)}>
                      Back to the assistant
                    </button>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="chatlog" ref={logRef} role="log" aria-live="polite">
                {messages.map((m, i) => (
                  <div key={i} className={`msg ${m.role === "user" ? "me" : "bot"}`}>
                    {m.content}
                  </div>
                ))}
                {thinking && <div className="msg bot pending">Thinking…</div>}
              </div>
              {chatErr && (
                <p className="req-note err" role="alert">
                  {chatErr}
                </p>
              )}
              <form onSubmit={handleSend} className="crow">
                <textarea
                  className="cinput"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter makes a new line.
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={1500}
                  placeholder="Ask about a scan…"
                  aria-label="Message the AI Sec Tester assistant"
                />
                <button
                  type="submit"
                  className="send"
                  disabled={thinking || !input.trim()}
                  aria-label="Send message"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12h15M13 6l6 6-6 6" />
                  </svg>
                </button>
              </form>
              <button type="button" className="altlink" onClick={() => setShowForm(true)}>
                Email us instead
              </button>
            </>
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

// ── Client-side geo preview (UX only) ────────────────────────────────────────
// Restricted-jurisdiction sample used to give the visitor an immediate heads-up.
// The server re-resolves both IP endpoints independently and never trusts these
// client values (that gate lives in the /api/scan-request route). Ported from
// the static design's evaluateGeo(): ONLY a restricted *target* hard-blocks.
type Geo = { cc: string; name: string; host?: string };
type GeoView = { text: string; tone: "" | "ok" | "bad" };

const RESTRICTED: Record<string, { type: "sanctioned" | "license"; name: string }> = {
  IR: { type: "sanctioned", name: "Iran" },
  KP: { type: "sanctioned", name: "North Korea" },
  SY: { type: "sanctioned", name: "Syria" },
  CU: { type: "sanctioned", name: "Cuba" },
  SG: { type: "license", name: "Singapore" },
  MY: { type: "license", name: "Malaysia" },
};

// Exact copy from the design's evaluateGeo() — both-restricted vs target-only.
const GEO_BLOCK_BOTH =
  "We're unable to process this request. Both your current network location and the chatbot you'd like tested are associated with a jurisdiction where independent security testing requires a government-issued licence that we do not hold. To protect you and us from legal risk, we can't proceed with this scan from here. If this is inaccurate — for example you're travelling or using a company VPN — please email hello@thesoulsofai.com from your work address with more detail.";
const GEO_BLOCK_TARGET =
  "We're unable to process this request. The chatbot you'd like tested is hosted in a jurisdiction where independent security testing requires a licence we do not hold, regardless of where you are requesting from. We can't proceed with this scan target. If you believe this detection is incorrect, or you hold the required local licence, email hello@thesoulsofai.com with supporting documentation.";

/**
 * Public scan-request form, ported faithfully from the static #request section.
 * Posts the design's ScanRequestBody shape to /api/scan-request, which records
 * the request in the Command Center Intake queue (scan_requests). NO
 * payment/checkout here — the payment link is emailed only after a human
 * approves the request. The static email stopgap from the design is dropped;
 * the real backend is the POST target.
 */
export function RequestForm() {
  const [plan, setPlan] = useState(PAYMENT_LINKS.advanced.label);
  const [country, setCountry] = useState("");
  const [subscribed, setSubscribed] = useState<"no" | "yes">("no");
  const [authorized, setAuthorized] = useState(false);
  const [dueDiligence, setDueDiligence] = useState(false);
  const [providerNotified, setProviderNotified] = useState(false);
  const [cbErr, setCbErr] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Client geo preview state (data + display separated so a failed lookup can
  // show its own status line without discarding a previous good value).
  const [requestorGeo, setRequestorGeo] = useState<Geo | null>(null);
  const [reqView, setReqView] = useState<GeoView>({ text: "Detecting…", tone: "" });
  const [targetGeo, setTargetGeo] = useState<Geo | null>(null);
  const [tgtView, setTgtView] = useState<GeoView>({ text: "Enter the target URL above", tone: "" });

  // Hard geo-block is derived, not stored — only a restricted *target* blocks.
  const targetRestricted = targetGeo ? RESTRICTED[targetGeo.cc] : undefined;
  const blocked = Boolean(targetRestricted);
  const geoAlert = blocked
    ? requestorGeo && RESTRICTED[requestorGeo.cc]
      ? GEO_BLOCK_BOTH
      : GEO_BLOCK_TARGET
    : "";

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

  // detectRequestor(): resolve the visitor's own IP country on load. UX only.
  useEffect(() => {
    const ctrl = new AbortController();
    fetch("https://ipapi.co/json/", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { country_code?: string; country_name?: string }) => {
        if (!d || !d.country_code) throw new Error("no country");
        const geo: Geo = { cc: d.country_code, name: d.country_name || d.country_code };
        setRequestorGeo(geo);
        setReqView({ text: `${geo.name} (${geo.cc})`, tone: RESTRICTED[geo.cc] ? "bad" : "ok" });
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setReqView({ text: "Unavailable here — verified on submit", tone: "" });
      });
    return () => ctrl.abort();
  }, []);

  // lookupTarget(): on the target-URL field's blur, resolve the host's A record
  // (dns.google) then that IP's country (ipapi.co). Best-effort; the server is
  // authoritative and re-resolves on submit.
  async function handleTargetBlur(e: FocusEvent<HTMLInputElement>) {
    const url = e.currentTarget.value.trim();
    if (!url) return;
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      setTargetGeo(null);
      setTgtView({ text: "Enter a valid URL", tone: "" });
      return;
    }
    setTgtView({ text: `Looking up ${host}…`, tone: "" });
    try {
      const dns = (await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`,
      ).then((r) => r.json())) as { Answer?: { type: number; data: string }[] };
      const rec = dns.Answer?.find((a) => a.type === 1);
      if (!rec) {
        setTargetGeo(null);
        setTgtView({ text: `Could not resolve ${host}`, tone: "" });
        return;
      }
      const d2 = (await fetch(`https://ipapi.co/${rec.data}/json/`).then((r) => r.json())) as {
        country_code?: string;
        country_name?: string;
      };
      if (!d2 || !d2.country_code) throw new Error("no country");
      const geo: Geo = { cc: d2.country_code, name: d2.country_name || d2.country_code, host };
      setTargetGeo(geo);
      setTgtView({ text: `${geo.name} (${geo.cc}) — ${host}`, tone: RESTRICTED[geo.cc] ? "bad" : "ok" });
    } catch {
      setTargetGeo(null);
      setTgtView({ text: "Lookup unavailable — verified server-side on submit", tone: "" });
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (String(fd.get("website") || "")) return; // honeypot — must stay empty
    if (blocked) return; // hard geo block already shown above the buttons

    // Both consent checkboxes gate submit with a visible inline error.
    if (!authorized || !dueDiligence) {
      setCbErr(
        "Please check both boxes above to confirm authorization and accuracy before submitting.",
      );
      return;
    }
    if (subscribed === "yes" && !providerNotified) {
      setCbErr(
        "This chatbot runs on a third-party platform — please confirm you've notified them before submitting.",
      );
      return;
    }
    setCbErr("");

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
      dueDiligenceConsent: true,
      // client geo signals — server re-resolves both, never trusts these alone.
      requestorGeo,
      targetGeo,
      subscribedPlatform: subscribed,
      providerName: String(fd.get("providerName") || "").trim(),
      providerNotifyRef: String(fd.get("providerNotifyRef") || "").trim(),
      providerNotified,
      target: String(fd.get("target") || "").trim(),
      context: String(fd.get("context") || "").trim(),
      website: "",
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
    <form className="req-form" onSubmit={handleSubmit} autoComplete="on" noValidate>
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
            <option value="" disabled>
              Select your country…
            </option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="field-hint">
            Where you actually live and work — cross-checked against your network location
            during review.
          </span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="rf-target">Where is your chatbot?</label>
        <input
          id="rf-target"
          type="url"
          name="target"
          required
          placeholder="https://yourcompany.com"
          onBlur={handleTargetBlur}
        />
        {/* A visitor knows their website address; almost none know their widget's
            message endpoint. Ask for the page and let the scanner find the widget. */}
        <p className="hint">
          Paste the address of the page your chat widget appears on — we find the widget
          automatically. If you already know your bot&rsquo;s message endpoint (the URL it
          posts to), you can paste that instead.
        </p>
      </div>

      {/* Location check — client-side geo preview (UX only; server is authoritative). */}
      <div className="field geo-check">
        <label>Location check</label>
        <div className="geo-row">
          <div className="geo-box">
            <span className="geo-k">Your connection</span>
            <span className={`geo-v${reqView.tone ? ` ${reqView.tone}` : ""}`}>{reqView.text}</span>
          </div>
          <div className="geo-box">
            <span className="geo-k">Target hosting</span>
            <span className={`geo-v${tgtView.tone ? ` ${tgtView.tone}` : ""}`}>{tgtView.text}</span>
          </div>
        </div>
        {blocked && (
          <div className="geo-alert show" role="alert">
            {geoAlert}
          </div>
        )}
      </div>

      <div className="field">
        <label htmlFor="rf-context">
          What is the chatbot for? <span style={{ fontWeight: 500, color: "var(--ink-3)" }}>(optional)</span>
        </label>
        <textarea id="rf-context" name="context" placeholder="e.g. customer support bot on our marketing site" />
      </div>

      <div className="field">
        <label htmlFor="rf-subscribed">Is this chatbot built on a third-party / subscribed platform?</label>
        <select
          id="rf-subscribed"
          name="subscribedPlatform"
          value={subscribed}
          onChange={(e) => setSubscribed(e.target.value as "no" | "yes")}
        >
          <option value="no">No — it&rsquo;s self-hosted / custom-built</option>
          <option value="yes">Yes (e.g. Intercom, Zendesk, OpenAI Assistants, Drift…)</option>
        </select>
        <span className="field-hint">
          Platform terms often require you to notify them before a security test runs on
          infrastructure they host.
        </span>
      </div>

      {/* Third-party disclosure — shown only when the chatbot runs on a subscribed platform. */}
      <div className={`field disc-wrap${subscribed === "yes" ? " show" : ""}`}>
        <label htmlFor="rf-provider">Provider name</label>
        <input id="rf-provider" type="text" name="providerName" placeholder="e.g. Intercom, Zendesk" />
        <label htmlFor="rf-provider-ref" style={{ marginTop: 10 }}>
          Notification reference{" "}
          <span style={{ fontWeight: 500, color: "var(--ink-3)" }}>
            (ticket #, or subject of the email you sent them)
          </span>
        </label>
        <input
          id="rf-provider-ref"
          type="text"
          name="providerNotifyRef"
          placeholder="e.g. Support ticket #48213, or ‘Re: upcoming security test’"
        />
        <label className="consent" style={{ marginTop: 10 }}>
          <input
            type="checkbox"
            name="providerNotified"
            checked={providerNotified}
            onChange={(e) => {
              setProviderNotified(e.target.checked);
              setCbErr("");
            }}
          />
          <span>
            I confirm I have informed this provider that a security test will be run against
            this chatbot, before submitting this request.
          </span>
        </label>
      </div>

      <label className="consent">
        <input
          type="checkbox"
          name="authorized"
          checked={authorized}
          onChange={(e) => {
            setAuthorized(e.target.checked);
            setCbErr("");
          }}
        />
        <span>
          I confirm I own this target, or I am explicitly authorized to test it, and I accept the{" "}
          <a href="https://thesoulsofai.com/terms" target="_blank" rel="noopener noreferrer">
            Terms
          </a>
          .
        </span>
      </label>
      <label className="consent">
        <input
          type="checkbox"
          name="dueDiligence"
          checked={dueDiligence}
          onChange={(e) => {
            setDueDiligence(e.target.checked);
            setCbErr("");
          }}
        />
        <span>
          I confirm my country of residence above is accurate. I understand my network location
          (IP country &amp; network type), browser timezone/locale and — after approval — my
          payment card country are checked against it, and that mismatches or VPN use may hold my
          request for manual review or identity verification. Requests from sanctioned
          jurisdictions are declined.
        </span>
      </label>

      {cbErr && <div className="checkbox-err show">{cbErr}</div>}

      <div className="liability-note">
        AI Sec Tester runs non-intrusive, read-only checks against your chatbot&rsquo;s
        conversational interface only — no exploitation, no infrastructure access, no
        availability/DoS testing. Because the target and its infrastructure remain under your
        control, The Souls of AI is not liable for any pre-existing issue, malfunction, downtime
        or component failure observed during an approved scan. See the full clause in our{" "}
        <a href="https://thesoulsofai.com/terms" target="_blank" rel="noopener noreferrer">
          Terms
        </a>
        .
      </div>

      {/* honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: -9999 }} />

      <button type="submit" className="btn btn-accent" disabled={status === "sending" || blocked}>
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
