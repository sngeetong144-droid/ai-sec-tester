/**
 * advisory-review.ts - turns the three UNPROBEABLE OWASP categories into a real,
 * defensible deliverable.
 *
 * WHY THIS EXISTS
 * LLM03 (supply chain), LLM04 (data/model poisoning) and LLM08 (vector store) cannot
 * be verified by an external black-box scan: the evidence lives inside the customer's
 * build pipeline, training/ingestion path and vector store, none of which the scanner
 * can reach. Before this module they shipped as ADVISORY rows carrying remediation
 * text and no verdict - honest, but a buyer who paid for "all 10 OWASP LLM categories"
 * reasonably reads three verdict-less rows as work not done.
 *
 * The evidence the scanner cannot reach is evidence the CUSTOMER can hand over. So
 * these categories are assessed by structured control disclosure instead of by probe.
 *
 * THE CREDIBILITY RULE - the whole point of this module:
 * A REVIEWED verdict is NOT a PROBED verdict and SHALL NEVER be presented as one.
 *   - Reviewed findings are scored SEPARATELY and never enter the probe score. A
 *     customer cannot raise their security score by ticking boxes about themselves.
 *   - Every reviewed row states, in the customer's words, that it came from their own
 *     disclosure and was not independently verified.
 *   - An unanswered control is INCOMPLETE, never a pass. Silence is not a control.
 * Breaking any of those turns a defensible product into a self-certification mill.
 */

export type ControlAnswer = "yes" | "no" | "unknown";

export interface ControlDefinition {
  id: string;
  /** Plain-language question put to the customer. No jargon they would have to look up. */
  question: string;
  /** Severity carried by a NO answer - a missing control, not a failed probe. */
  severity: "critical" | "high" | "medium" | "low";
  /** What to do about a NO. */
  remediation: string;
}

/** The advisory scan_results keys these controls back. */
export type AdvisoryKey = "supply_chain" | "data_poisoning" | "vector_weakness";

export const ADVISORY_CONTROLS: Record<AdvisoryKey, readonly ControlDefinition[]> = {
  supply_chain: [
    {
      id: "model_pinned",
      question:
        "Is the base model pinned to a specific version, rather than tracking a floating latest tag?",
      severity: "high",
      remediation:
        "Pin the model to an explicit version and review each upgrade deliberately. A floating tag silently changes the system behaviour and safety profile under you.",
    },
    {
      id: "deps_scanned",
      question:
        "Are your application dependencies scanned for known vulnerabilities as part of your build or CI?",
      severity: "high",
      remediation:
        "Enable dependency scanning in CI and fail the build on known-exploitable CVEs. Generate an SBOM so you can answer whether you are affected in minutes rather than days.",
    },
    {
      id: "plugin_vetting",
      question:
        "Are third-party plugins, tools or agent integrations reviewed before you connect them to the model?",
      severity: "medium",
      remediation:
        "Require a review before any plugin or tool is granted to the model, covering what data it sees and what actions it can take. Re-review on version changes.",
    },
    {
      id: "provenance_verified",
      question:
        "Do you verify the provenance of models and datasets you pull in (signature, checksum, or a trusted registry)?",
      severity: "medium",
      remediation:
        "Verify artefact signatures or hashes against a trusted source before use, and record what was verified so a later compromise can be traced.",
    },
  ],
  data_poisoning: [
    {
      id: "sources_controlled",
      question:
        "Are the sources used for fine-tuning or retrieval (RAG) restricted to an approved, tracked list?",
      severity: "critical",
      remediation:
        "Allowlist every training and retrieval source and record its provenance. An untracked source is an unreviewed path into your model behaviour.",
    },
    {
      id: "untrusted_ingestion_isolated",
      question:
        "Is user-submitted or public content prevented from entering training or retrieval data without review?",
      severity: "critical",
      remediation:
        "Isolate untrusted content from the training and RAG pipeline, and require review before promotion. Unreviewed ingestion is the most common poisoning route.",
    },
    {
      id: "eval_holdout",
      question:
        "Do you run a fixed evaluation set against the model before each deployment to catch behaviour changes?",
      severity: "high",
      remediation:
        "Hold out a clean evaluation set the model never trains on and run it every deploy. Without a baseline you cannot detect that behaviour shifted, let alone why.",
    },
    {
      id: "anomaly_checks",
      question:
        "Are training or retrieval datasets checked for anomalies or unexpected content before use?",
      severity: "medium",
      remediation:
        "Run anomaly and outlier checks over datasets before ingestion, and alert on sudden distribution changes that can indicate injected content.",
    },
  ],
  vector_weakness: [
    {
      id: "tenant_isolation",
      question:
        "If multiple customers or teams share the vector store, is their data isolated from each other?",
      severity: "critical",
      remediation:
        "Enforce per-tenant partitioning in the vector store. Shared embedding space without isolation means one customer query can surface another customer documents.",
    },
    {
      id: "retrieval_filtered",
      question:
        "Is retrieval filtered by the requesting user permissions, rather than searching the whole index?",
      severity: "critical",
      remediation:
        "Apply the caller authorization as a retrieval filter at query time. Filtering only in the UI leaves the underlying documents reachable.",
    },
    {
      id: "secrets_scrubbed",
      question:
        "Are documents cleaned of secrets and personal data before they are embedded?",
      severity: "high",
      remediation:
        "Scrub credentials and personal data before embedding. Once content is in the index it can be surfaced by paraphrase, so redaction after the fact is unreliable.",
    },
    {
      id: "retrieval_audited",
      question:
        "Have you audited what content is actually retrievable across different user accounts?",
      severity: "medium",
      remediation:
        "Periodically test retrieval as different user roles and confirm each sees only what it should. Cross-tenant bleed is usually found by testing, not by reading config.",
    },
  ],
};

export type ReviewVerdict =
  | "reviewed_pass"
  | "reviewed_gaps"
  | "reviewed_incomplete"
  | "not_disclosed";

export interface ReviewGap {
  controlId: string;
  question: string;
  severity: ControlDefinition["severity"];
  remediation: string;
}

export interface CategoryReview {
  key: AdvisoryKey;
  verdict: ReviewVerdict;
  confirmed: number;
  answered: number;
  total: number;
  gaps: ReviewGap[];
  /** Controls the customer could not answer - reported as unknown, never as pass. */
  unknowns: string[];
  evidence: string;
}

/** Answers keyed by control id. Missing keys are NOT DISCLOSED, never a pass. */
export type DisclosureAnswers = Partial<Record<string, ControlAnswer>>;

const SEVERITY_RANK: Record<ControlDefinition["severity"], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const NOT_DISCLOSED_EVIDENCE =
  "Not assessed. This OWASP category cannot be verified by an external black-box scan " +
  "(the evidence sits inside your build pipeline, training data or vector store), and no " +
  "control disclosure was provided for this scan. Remediation guidance is included for " +
  "completeness. Provide the control disclosure to have this category assessed.";

function reviewedPreamble(confirmed: number, total: number): string {
  return (
    "REVIEWED, NOT PROBED - assessed from your own control disclosure and not " +
    "independently verified by this scan. " +
    confirmed +
    " of " +
    total +
    " controls confirmed. "
  );
}

/**
 * Assess one advisory category from the customer disclosure.
 *
 * Deliberate asymmetry: a NO is a GAP (actionable, severity-weighted) while an UNKNOWN
 * is INCOMPLETE. Collapsing "we do not do this" into "we are not sure" would let a real
 * missing control hide behind uncertainty.
 */
export function reviewCategory(
  key: AdvisoryKey,
  answers: DisclosureAnswers | null | undefined,
): CategoryReview {
  const controls = ADVISORY_CONTROLS[key];
  const total = controls.length;

  const provided = controls.filter((c) => answers?.[c.id] != null);
  if (provided.length === 0) {
    return {
      key,
      verdict: "not_disclosed",
      confirmed: 0,
      answered: 0,
      total,
      gaps: [],
      unknowns: [],
      evidence: NOT_DISCLOSED_EVIDENCE,
    };
  }

  const gaps: ReviewGap[] = [];
  const unknowns: string[] = [];
  let confirmed = 0;

  for (const c of controls) {
    const a = answers?.[c.id];
    if (a === "yes") {
      confirmed += 1;
    } else if (a === "no") {
      gaps.push({
        controlId: c.id,
        question: c.question,
        severity: c.severity,
        remediation: c.remediation,
      });
    } else {
      // Explicit "unknown" AND an omitted control both land here: neither is a pass.
      unknowns.push(c.id);
    }
  }

  const verdict: ReviewVerdict =
    gaps.length > 0
      ? "reviewed_gaps"
      : unknowns.length > 0
        ? "reviewed_incomplete"
        : "reviewed_pass";

  let evidence = reviewedPreamble(confirmed, total);
  if (gaps.length > 0) {
    const worst = gaps.reduce((w, g) =>
      SEVERITY_RANK[g.severity] > SEVERITY_RANK[w.severity] ? g : w,
    );
    evidence +=
      gaps.length +
      " control gap(s) reported, most serious " +
      worst.severity.toUpperCase() +
      ": " +
      worst.question +
      " Answered NO. See remediation for each gap.";
  } else if (unknowns.length > 0) {
    evidence +=
      unknowns.length +
      " control(s) could not be confirmed and are reported as UNKNOWN, not as passing. " +
      "Confirm them to close this category.";
  } else {
    evidence +=
      "All controls in this category were reported as in place. This reflects your " +
      "disclosure, not an independent test - treat it as a documented baseline to " +
      "re-confirm after changes.";
  }

  return { key, verdict, confirmed, answered: provided.length, total, gaps, unknowns, evidence };
}

/** Assess all three advisory categories. */
export function reviewAllAdvisory(
  answers: DisclosureAnswers | null | undefined,
): Record<AdvisoryKey, CategoryReview> {
  return {
    supply_chain: reviewCategory("supply_chain", answers),
    data_poisoning: reviewCategory("data_poisoning", answers),
    vector_weakness: reviewCategory("vector_weakness", answers),
  };
}

/**
 * The reviewed-controls summary line. Reported ALONGSIDE the probe score, never folded
 * into it: self-attested controls must not move a number that means "we tested this".
 */
export function reviewSummaryLine(
  reviews: Record<AdvisoryKey, CategoryReview>,
): string {
  const all = Object.values(reviews);
  if (all.every((r) => r.verdict === "not_disclosed")) {
    return "Reviewed controls: not disclosed for this scan (3 advisory categories unassessed).";
  }
  const confirmed = all.reduce((n, r) => n + r.confirmed, 0);
  const total = all.reduce((n, r) => n + r.total, 0);
  const gaps = all.reduce((n, r) => n + r.gaps.length, 0);
  const unknown = all.reduce((n, r) => n + r.unknowns.length, 0);
  const parts = ["Reviewed controls: " + confirmed + "/" + total + " confirmed"];
  if (gaps > 0) parts.push(gaps + " gap(s)");
  if (unknown > 0) parts.push(unknown + " unknown");
  return parts.join(", ") + ". Self-reported; not independently verified.";
}
