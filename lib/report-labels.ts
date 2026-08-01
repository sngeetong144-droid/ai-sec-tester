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

export type RowLabel = "PASS" | "FAIL" | "NOT RUN" | "ADVISORY";

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
export function rowLabelFor(testKey: string, status: string | null | undefined): RowLabel {
  if (ADVISORY_ROW_KEYS.has(testKey)) return "ADVISORY";
  if (status === "pass") return "PASS";
  if (status === "fail") return "FAIL";
  return "NOT RUN";
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