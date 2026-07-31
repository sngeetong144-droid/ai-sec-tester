import type { ScanResultRow } from "@/lib/types";

/**
 * Report recommendations — the consolidated advice layer both report surfaces
 * render under the per-check cards (/scans/[id] and /enterprise/report/[token]).
 *
 * Pure derivation over the persisted scan_results rows; no DB access, no React,
 * so both pages share ONE grouping/ordering rule and only own their own markup.
 *
 * Three groups, in the order a reader should act on them:
 *   1. fixNow    — checks that FAILED. Severity-ordered critical > high > medium > low.
 *   2. hardening — checks that PASSED but still carry remediation worth keeping.
 *   3. advisory  — the three OWASP categories a black-box scan cannot verify.
 *
 * HISTORY NOTE (do not "fix" by backfilling): until this change, remediation was
 * persisted only when status === "fail". Scans stored before that will therefore
 * produce a thin or empty `hardening` group and advisory rows with no remediation
 * text. That is the honest state of those rows — the caller renders what exists
 * and omits an empty group entirely rather than inventing guidance.
 */

/** OWASP categories that are unobservable from outside the model's infrastructure. */
export const ADVISORY_TEST_KEYS = [
  "supply_chain",
  "data_poisoning",
  "vector_weakness",
] as const;

const ADVISORY_KEY_SET: ReadonlySet<string> = new Set(ADVISORY_TEST_KEYS);

/** Plain-language statement of WHY the advisory group cannot be tested externally. */
export const ADVISORY_NOTE =
  "These three OWASP LLM categories live inside your build, training, and retrieval " +
  "infrastructure. A black-box scan reaches your public endpoint only, so it cannot " +
  "observe them and this report does not claim to have tested them — they are neither " +
  "passed nor failed, and they are excluded from the score. Verify them internally: " +
  "review model, plugin, and package provenance; the sources feeding fine-tuning and " +
  "RAG ingestion; and per-tenant access control on your vector store.";

const SEVERITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface Recommendation {
  id: string;
  testKey: string;
  testName: string;
  category: string | null;
  severity: ScanResultRow["severity"];
  /** Null only in the advisory group on scans stored before remediation was kept for non-fails. */
  remediation: string | null;
}

export interface RecommendationGroups {
  fixNow: Recommendation[];
  hardening: Recommendation[];
  advisory: Recommendation[];
  /** True when every group is empty — caller omits the whole section. */
  empty: boolean;
}

function toRec(r: ScanResultRow): Recommendation {
  return {
    id: r.id,
    testKey: r.test_key,
    testName: r.test_name,
    category: r.category,
    severity: r.severity,
    remediation: r.remediation?.trim() ? r.remediation.trim() : null,
  };
}

function bySeverity(a: Recommendation, b: Recommendation): number {
  const ra = SEVERITY_RANK[a.severity ?? ""] ?? 99;
  const rb = SEVERITY_RANK[b.severity ?? ""] ?? 99;
  return ra - rb;
}

export function groupRecommendations(results: ScanResultRow[]): RecommendationGroups {
  const fixNow: Recommendation[] = [];
  const hardening: Recommendation[] = [];
  const advisory: Recommendation[] = [];

  for (const r of results) {
    // Advisory categories are never scored and never fail; they get their own
    // group regardless of the stored status (they persist as "pending").
    if (ADVISORY_KEY_SET.has(r.test_key)) {
      advisory.push(toRec(r));
      continue;
    }
    const rec = toRec(r);
    if (!rec.remediation) continue; // nothing to recommend — say nothing.
    if (r.status === "fail") fixNow.push(rec);
    else if (r.status === "pass") hardening.push(rec);
    // "pending" (= not run) non-advisory checks are omitted: we did not test them,
    // so we do not present their guidance as a finding about this target.
  }

  fixNow.sort(bySeverity);
  hardening.sort(bySeverity);

  return {
    fixNow,
    hardening,
    advisory,
    empty: fixNow.length === 0 && hardening.length === 0 && advisory.length === 0,
  };
}