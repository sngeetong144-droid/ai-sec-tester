/**
 * Command-center case state machine (PRD §"STATE MACHINE").
 *
 * Six statuses, one linear happy path plus a terminal `rejected`:
 *   intake -> approval -> approved -> scanning -> complete
 *   intake -> rejected   (reject from triage)
 *   approval -> rejected (reject at decision)
 *
 * `complete` and `rejected` are terminal. Pure logic, no I/O — the queries
 * layer (lib/command-center/queries.ts) enforces transitions with canTransition
 * before any DB write, so an out-of-order mutation fails closed.
 */

export const CASE_STATUS = [
  "intake",
  "approval",
  "approved",
  "scanning",
  "complete",
  "rejected",
] as const;

export type CaseStatus = (typeof CASE_STATUS)[number];

/** Allowed next-states for each status. Empty = terminal. */
const TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  intake: ["approval", "rejected"],
  approval: ["approved", "rejected"],
  approved: ["scanning"],
  scanning: ["complete"],
  complete: [],
  rejected: [],
};

function isCaseStatus(value: unknown): value is CaseStatus {
  return typeof value === "string" && (CASE_STATUS as readonly string[]).includes(value);
}

/**
 * True only when `to` is a declared successor of `from`. Unknown/garbage inputs
 * (non-status strings, null, injection payloads) return false — fail closed.
 */
export function canTransition(from: unknown, to: unknown): boolean {
  if (!isCaseStatus(from) || !isCaseStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}
