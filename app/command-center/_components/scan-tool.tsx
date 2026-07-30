"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/app/command-center/_ui";
import { runAdminSelfScan, type AdminScanMode } from "@/app/actions/admin-scan";
import type { ScanTier } from "@/lib/payment-links";

/**
 * Admin scan tool: runs the real OWASP engine against a public target the
 * operator supplies, independent of the customer approve -> pay -> scan flow.
 * On success it navigates to the standard /scans/[id] report. Public targets
 * only — the server action's assertPublicTarget guard rejects private/localhost.
 */
export function ScanTool() {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<AdminScanMode>("passive");
  const [tier, setTier] = useState<ScanTier>("enterprise");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const scanId = await runAdminSelfScan({
        target: target.trim(),
        label: label.trim() || undefined,
        mode,
        tier,
        bodyTemplate: bodyTemplate.trim() || undefined,
        authToken: authToken.trim() || undefined,
      });
      router.push(`/scans/${scanId}`);
    } catch (err) {
      setError(
        String(err instanceof Error ? err.message : err).replace(/^Error:\s*/, ""),
      );
      setRunning(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 560,
        background: COLORS.surface,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 16,
        padding: 22,
      }}
    >
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label htmlFor="target" style={labelStyle}>
            Target URL
          </label>
          <input
            id="target"
            type="url"
            inputMode="url"
            required
            disabled={running}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={
              mode === "endpoint"
                ? "https://api.example.com/chat"
                : "https://example.com"
            }
            style={inputStyle}
          />
          <p style={{ margin: "6px 0 0", fontSize: 11.5, color: COLORS.ink3, lineHeight: 1.5 }}>
            {mode === "endpoint"
              ? "Direct chatbot message endpoint (webhook / API that takes a message and returns a reply)."
              : mode === "website"
                ? "A page that hosts a chatbot — the endpoint is auto-discovered from the page; if none is found the scan fails loudly."
                : "Any public page — transport headers and exposed-secret checks only, no chatbot probing."}
          </p>
        </div>

        <div>
          <label htmlFor="label" style={labelStyle}>
            Label <span style={{ color: COLORS.faint, fontWeight: 500 }}>(optional)</span>
          </label>
          <input
            id="label"
            type="text"
            disabled={running}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Acme support bot"
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="mode" style={labelStyle}>
            Scan mode
          </label>
          <select
            id="mode"
            disabled={running}
            value={mode}
            onChange={(e) => setMode(e.target.value as AdminScanMode)}
            style={inputStyle}
          >
            <option value="passive">Passive — transport &amp; secret checks only</option>
            <option value="endpoint">Chatbot endpoint — probe this URL directly</option>
            <option value="website">Website — discover the chatbot on this page</option>
          </select>
        </div>

        <div>
          <label htmlFor="tier" style={labelStyle}>
            Tier
          </label>
          <select
            id="tier"
            disabled={running}
            value={tier}
            onChange={(e) => setTier(e.target.value as ScanTier)}
            style={inputStyle}
          >
            <option value="basic">Normal — 5 core checks</option>
            <option value="advanced">Advanced — full OWASP Top-10 (15)</option>
            <option value="enterprise">Enterprise — full OWASP Top-10 (15)</option>
          </select>
        </div>

        {mode !== "passive" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 26 }}>
            <div>
              <label htmlFor="bodyTemplate" style={labelStyle}>
                Request body template{" "}
                <span style={{ color: COLORS.faint, fontWeight: 500 }}>(leave blank — auto-detected)</span>
              </label>
              <input
                id="bodyTemplate"
                type="text"
                disabled={running}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder="auto-detect"
                style={{ ...inputStyle, fontFamily: "ui-monospace, monospace" }}
              />
              <p style={{ margin: "6px 0 0", fontSize: 11.5, color: COLORS.ink3, lineHeight: 1.5 }}>
                The scanner sends a harmless &ldquo;Hello&rdquo; first and keeps whichever shape the bot
                answers: <code>{`{"message":…}`}</code>, <code>{`{"messages":[{"role","content"}]}`}</code>,{" "}
                <code>{`{"text":…}`}</code>, <code>{`{"query":…}`}</code>, <code>{`{"prompt":…}`}</code>,{" "}
                <code>{`{"input":…}`}</code>, or n8n&rsquo;s <code>{`{"chatInput":…}`}</code>. Only fill this in
                if your bot uses a shape that is not on that list — <code>{`{{prompt}}`}</code> marks where the
                probe text goes.
              </p>
            </div>
            <div>
              <label htmlFor="authToken" style={labelStyle}>
                Bearer token <span style={{ color: COLORS.faint, fontWeight: 500 }}>(optional, not stored)</span>
              </label>
              <input
                id="authToken"
                type="password"
                autoComplete="off"
                disabled={running}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="sent as Authorization: Bearer …"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 12.5,
              color: "#e2453d",
              background: "rgba(226,69,61,0.08)",
              border: "1px solid rgba(226,69,61,0.20)",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={running}
          style={{
            alignSelf: "flex-start",
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            fontSize: 13.5,
            fontWeight: 700,
            color: "#fff",
            background: COLORS.accent,
            cursor: running ? "not-allowed" : "pointer",
            opacity: running ? 0.65 : 1,
          }}
        >
          {running ? "Running scan…" : "Run scan"}
        </button>

        <p style={{ margin: 0, fontSize: 11.5, color: COLORS.ink3, lineHeight: 1.5 }}>
          Public targets only. Private, localhost, and link-local addresses are
          rejected. Runs the full engine and opens the report when complete.
        </p>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: COLORS.ink3,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${COLORS.cardBorder}`,
  fontSize: 13.5,
  color: COLORS.ink,
  background: COLORS.inset,
  outline: "none",
};
