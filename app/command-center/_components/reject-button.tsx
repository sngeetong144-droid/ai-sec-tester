"use client";

import { useState } from "react";
import { rejectCaseAction } from "@/app/actions/command-center";
import { COLORS } from "@/app/command-center/_ui";

/**
 * Reject flow (PRD "Reject reason modal"): preset chips + free-text textarea, and
 * a submit that is DISABLED until a reason is non-empty. Client component because
 * of the modal open state + the enable-on-input behaviour; submission itself goes
 * to the rejectCaseAction server action.
 */

const PRESETS = [
  "Licence required — no valid local pen-test licence on file.",
  "Sanctions deny-list — jurisdiction is on the sanctions deny-list.",
  "Ownership unverifiable — could not confirm authorization to test the target.",
  "Subscribed platform — no third-party provider disclosure proof supplied.",
  "Due-diligence conflict — declared country conflicts with network signals.",
];

export function RejectButton({ caseId }: { caseId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const ready = reason.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "9px 14px",
          borderRadius: 100,
          fontSize: 12.5,
          fontWeight: 700,
          background: "transparent",
          color: COLORS.ink2,
          border: `1px solid ${COLORS.cardBorder}`,
          cursor: "pointer",
        }}
      >
        Reject with reason
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(21,19,33,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
        >
          <div
            style={{
              width: 520,
              maxWidth: "100%",
              background: COLORS.surface,
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 16px 40px rgba(21,19,33,.18)",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.ink }}>Reject request</div>
            <div style={{ fontSize: 12.5, color: COLORS.ink3, marginTop: 4 }}>
              A reason is required. It is emailed to the requestor and logged to the audit trail.
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0" }}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 100,
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: COLORS.inset2,
                    color: COLORS.ink2,
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {p.split(" — ")[0]}
                </button>
              ))}
            </div>

            <form action={rejectCaseAction} onSubmit={() => setOpen(false)}>
              <input type="hidden" name="caseId" value={caseId} />
              <textarea
                name="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Reason for rejection…"
                style={{
                  width: "100%",
                  border: `1px solid ${COLORS.cardBorder}`,
                  borderRadius: 10,
                  padding: 10,
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 100,
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: "transparent",
                    color: COLORS.ink2,
                    border: `1px solid ${COLORS.cardBorder}`,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!ready}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 100,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "#fff",
                    border: "none",
                    background: ready ? "#e2453d" : "#c9c5b8",
                    cursor: ready ? "pointer" : "not-allowed",
                  }}
                >
                  Send rejection email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
