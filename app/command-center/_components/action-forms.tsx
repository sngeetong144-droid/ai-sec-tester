import type { ReactNode } from "react";
import {
  approveCaseAction,
  advanceToApprovalAction,
  runScanAction,
  deliverCaseAction,
  requestDisclosureAction,
  ingestIntakeAction,
} from "@/app/actions/command-center";

/**
 * Server-rendered mutation buttons — each is a <form> bound to a server action
 * with a hidden id. No client JS needed for approve/activate/deliver/disclosure/
 * ingest (the only interactive-modal action, reject, lives in reject-button.tsx).
 */

const BASE = {
  padding: "9px 14px",
  borderRadius: 100,
  fontSize: 12.5,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
} as const;

function SubmitButton({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "green" | "accent" | "gold";
}) {
  const bg = variant === "green" ? "#0f9d6b" : variant === "gold" ? "#a87d1e" : "#5a45e6";
  return (
    <button type="submit" style={{ ...BASE, background: bg, color: "#fff" }}>
      {children}
    </button>
  );
}

export function ApproveForm({ caseId }: { caseId: string }) {
  return (
    <form action={approveCaseAction} style={{ display: "inline" }}>
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton variant="green">Approve &amp; send payment link</SubmitButton>
    </form>
  );
}

export function AdvanceForm({ caseId }: { caseId: string }) {
  return (
    <form action={advanceToApprovalAction} style={{ display: "inline" }}>
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton variant="accent">Clear triage &amp; send to decision</SubmitButton>
    </form>
  );
}

export function RunScanForm({ caseId }: { caseId: string }) {
  return (
    <form action={runScanAction} style={{ display: "inline" }}>
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton variant="green">Run security scan</SubmitButton>
    </form>
  );
}

/**
 * `ready` is false until the linked scan has finished AND persisted results.
 * Delivering before then emailed the customer a "Verdict: PENDING (0 of 5
 * checks passed)" report and closed the case. The server action refuses too —
 * this only makes the refusal visible instead of a click that silently does
 * nothing.
 */
export function DeliverForm({ caseId, ready = true }: { caseId: string; ready?: boolean }) {
  if (!ready) {
    return (
      <span style={{ fontSize: 12.5, color: "#9b8fae" }}>
        Report unavailable — the scan has not finished. Wait for it to complete, or re-run it.
      </span>
    );
  }
  return (
    <form action={deliverCaseAction} style={{ display: "inline" }}>
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton variant="accent">Generate &amp; email report</SubmitButton>
    </form>
  );
}

export function DisclosureForm({ caseId }: { caseId: string }) {
  return (
    <form action={requestDisclosureAction} style={{ display: "inline" }}>
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton variant="gold">Request disclosure proof</SubmitButton>
    </form>
  );
}

export function IngestForm({ requestId }: { requestId: string }) {
  return (
    <form action={ingestIntakeAction} style={{ display: "inline" }}>
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton variant="accent">Add to queue</SubmitButton>
    </form>
  );
}
