"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/app/command-center/_ui";
import { runAdminSelfScan } from "@/app/actions/admin-scan";

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
  const [chatbot, setChatbot] = useState(false);
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
        chatbot,
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
            placeholder="https://example.com"
            style={inputStyle}
          />
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
          <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer" }}>
            <input
              type="checkbox"
              disabled={running}
              checked={chatbot}
              onChange={(e) => setChatbot(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span style={{ fontSize: 12.5, color: COLORS.ink2, lineHeight: 1.5 }}>
              Target is a <strong>chatbot endpoint</strong> — run the interactive OWASP-LLM
              probes (prompt injection, jailbreak, system-prompt leak, data exfiltration,
              unsafe content). Leave off for passive transport/secret checks only.
            </span>
          </label>
        </div>

        {chatbot && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingLeft: 26 }}>
            <div>
              <label htmlFor="bodyTemplate" style={labelStyle}>
                Request body template <span style={{ color: COLORS.faint, fontWeight: 500 }}>(optional)</span>
              </label>
              <input
                id="bodyTemplate"
                type="text"
                disabled={running}
                value={bodyTemplate}
                onChange={(e) => setBodyTemplate(e.target.value)}
                placeholder={`{"message":"{{prompt}}"}`}
                style={{ ...inputStyle, fontFamily: "ui-monospace, monospace" }}
              />
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
