/**
 * report-labels.ts — pure presentation logic for the customer-facing report.
 *
 * Split out of report-pdf.ts because that module is globally mocked by
 * report-artifact.test.ts (bun mock.module is process-wide), which makes anything
 * exported from it untestable elsewhere. These functions carry no pdf-lib
 * dependency and no I/O, so they are cheap to test directly.
 */
import { ADVISORY_TEST_KEYS } from "@/lib/report-recommendations";

/** The three OWASP categories a black-box scan cannot observe — never pass, never fail. */
const ADVISORY_ROW_KEYS: ReadonlySet<string> = new Set(ADVISORY_TEST_KEYS);

export type RowLabel =
  | "PASS"
  | "FAIL"
  | "NOT RUN"
  | "ADVISORY"
  | "PARTIAL"
  // The three reviewed states. They are deliberately WORDED so no reader can mistake
  // them for a probe result: a customer-disclosed control is not a tested control.
  // "REVIEWED" is never rendered as "PASS", which is why it is its own label and not
  // a flag on the pass branch.
  | "REVIEWED"
  | "REVIEWED - GAPS"
  | "NOT ASSESSED";

/**
 * Label for one of the three advisory OWASP categories once a control disclosure
 * exists. Falls back to ADVISORY when nothing was disclosed, which preserves the
 * pre-existing behaviour for every scan that has no disclosure attached.
 */
export function advisoryLabelFor(
  review: { verdict: string } | null | undefined,
): RowLabel {
  switch (review?.verdict) {
    case "reviewed_pass":
      return "REVIEWED";
    case "reviewed_gaps":
      return "REVIEWED - GAPS";
    case "reviewed_incomplete":
      return "NOT ASSESSED";
    default:
      return "ADVISORY";
  }
}

/**
 * The engine prefixes a category's evidence with this marker when some of its
 * probes were delivered and some were not. Matching on it keeps ONE source of
 * truth: the engine decides what partial means, the report only renders it.
 */
export const PARTIAL_COVERAGE_MARKER = "PARTIAL COVERAGE";

/**
 * Was `status === "pass" ? "PASS" : "FAIL"` — a binary over a THREE-state world.
 * Anything not passing printed FAIL, so the checks a rate-limited scan never sent
 * were reported to the customer as failures, several tagged [CRITICAL]. Telling a
 * business its bot FAILED prompt injection when no probe ever reached it is a
 * false accusation about their product, not a caveat. The three advisory OWASP
 * categories were mislabelled the same way, despite ADVISORY_NOTE stating they
 * are "neither passed nor failed".
 *
 * Observed in a real delivered report: scan_requests c25b2cfc, 2026-08-01.
 */
export function rowLabelFor(
  testKey: string,
  status: string | null | undefined,
  evidence?: string | null,
  /**
   * The control review for this category, when the customer supplied a disclosure.
   * Optional so every existing caller keeps its current behaviour untouched.
   */
  review?: { verdict: string } | null,
): RowLabel {
  if (ADVISORY_ROW_KEYS.has(testKey)) return advisoryLabelFor(review);
  if (status === "fail") return "FAIL";
  if (status === "pass") {
    // A category graded pass whose OWN evidence says it was not fully verified is
    // still an overstatement. Real case: Misinformation & Overreliance printed PASS
    // on report 7fdd21ea while its evidence read "PARTIAL COVERAGE - only 3 of 4
    // probe(s) in this category were delivered... this category is NOT fully
    // verified." A paying customer reads the green word, not the grey paragraph.
    if (evidence && evidence.includes(PARTIAL_COVERAGE_MARKER)) return "PARTIAL";
    return "PASS";
  }
  return "NOT RUN";
}

/**
 * The coverage line under the score. Partials are pulled OUT of the passed count
 * so "passed" means fully verified and nothing else.
 */
export function coverageLineFor(
  passed: number,
  partial: number,
  notRun: number,
  total: number,
): string {
  const parts = [`${Math.max(0, passed - partial)}/${total} checks passed`];
  if (partial > 0) parts.push(`${partial} PARTIAL`);
  if (notRun > 0) parts.push(`${notRun} NOT RUN`);
  return parts.join(", ") + ".";
}

/**
 * The score's denominator is the checks that RAN, not the tier's full set. On a
 * rate-limited scan four transport checks can pass and print "Security score:
 * 100/100" beside "NEEDS ATTENTION" — a $497 report whose headline says perfect
 * while all five core OWASP categories were never probed. The caveat existed only
 * in body prose, which is not what a customer reads or screenshots. Whenever any
 * check did not run, the coverage travels WITH the number so it cannot be quoted
 * alone.
 */
export function scoreHeadlineFor(
  score: number | null | undefined,
  ran: number,
  total: number,
): string {
  const n = score ?? 0;
  return total - ran > 0
    ? `Security score: ${n}/100 over ${ran} of ${total} checks`
    : `Security score: ${n}/100`;
}
/** Marker written ONLY by the live-probe path in real-scan-engine.ts. */
export const LIVE_PROBE_MARKER = "live probe(s)";

/**
 * The methodology footnote. It was a hardcoded sentence claiming "Interactive
 * jailbreak probes are simulated and labelled" — true of the original engine,
 * false since real probing shipped, and actively harmful: it tells a paying
 * customer to discount the only part of the report that involved actually
 * attacking their bot. Report 7fdd21ea carried it while every interactive
 * category had been probed live and judged.
 *
 * Derived from the evidence the engine itself wrote, so the footnote can never
 * again drift from what the scan did.
 */
export function methodologyNoteFor(
  results: ReadonlyArray<{ evidence?: string | null; simulated?: boolean | null }>,
): string {
  // Prefer the PERSISTED fact over prose. `simulated === false` is the engine
  // recording that this verdict came from a live probe (migration 0021). Evidence
  // string-matching stays only as a fallback for rows written before 0021, where
  // the column is NULL and genuinely unknown. NULL is never read as "live".
  const anyLive =
    results.some((r) => r.simulated === false) ||
    results.some((r) => r.evidence?.includes(LIVE_PROBE_MARKER));
  const head = anyLive
    ? "Interactive OWASP LLM probes were sent live to the target's chat endpoint and " +
      "each reply was graded by an AI judge; transport and secret-exposure checks are " +
      "performed live against the target."
    : "Interactive probes could not be delivered to the target, so interactive " +
      "categories are unverified and are labelled as such; transport and " +
      "secret-exposure checks are performed live against the target.";
  return (
    "Checks are aligned with the OWASP Top-10 for LLM Applications. " +
    head +
    " Only scan chatbots you own or are authorized to test."
  );
}