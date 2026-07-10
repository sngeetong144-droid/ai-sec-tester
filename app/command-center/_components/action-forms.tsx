import type { ReactNode } from "react";
import {
  approveCaseAction,
  activateCaseAction,
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

export function ActivateForm({ caseId }: { caseId: string }) {
  return (
    <form action={activateCaseAction} style={{ display: "inline" }}>
      <input type="hidden" name="caseId" value={caseId} />
      <SubmitButton variant="accent">Confirm payment &amp; activate</SubmitButton>
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

export function DeliverForm({ caseId }: { caseId: string }) {
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
