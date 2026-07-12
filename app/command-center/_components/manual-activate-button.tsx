"use client";

import { manualActivateScanAction } from "@/app/actions/command-center";
import { COLORS } from "@/app/command-center/_ui";

/**
 * Deliberate admin override for when the payment webhook never fired and a paid
 * case is stuck in `approved`. Client component only for the confirm() step — the
 * submit goes to the manualActivateScanAction server action. Styled as an outline
 * (not a primary) button so it reads as an override, not the normal happy path.
 */
export function ManualActivateButton({ caseId }: { caseId: string }) {
  return (
    <form
      action={manualActivateScanAction}
      style={{ display: "inline" }}
      onSubmit={(e) => {
        if (
          !confirm(
            "Only if you have verified payment out-of-band.\n\n" +
              "This bypasses the payment webhook and runs the scan now: it activates " +
              "the case, executes the OWASP-LLM checks, and queues the report email.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="caseId" value={caseId} />
      <button
        type="submit"
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
        Confirm payment &amp; run scan
      </button>
    </form>
  );
}
