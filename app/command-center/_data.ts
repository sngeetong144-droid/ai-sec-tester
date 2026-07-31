import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { listCases, getCase, type CaseRecord } from "@/lib/command-center/queries";
import type { CaseStatus } from "@/lib/command-center/state";
import type { Scan, ScanResultRow } from "@/lib/types";

/**
 * Read/derive layer for the command-center console (server-only).
 *
 * The console's source of truth is cc_cases (lib/command-center/queries.ts),
 * which threads a reused scan_requests intake (PII + triage + jurisdiction) and
 * a reused scans engine record. This module JOINS those three on read and
 * derives the presentation-only values (jurisdiction verdict, gate rows, status
 * badges) the PRD screens need. It never mutates — mutations go through the
 * queries.ts helpers via app/actions/command-center.ts.
 *
 * NOTE: migration 0005 is not yet applied to the live DB, so at runtime these
 * reads return [] and every screen renders its honest EMPTY state. No seed rows
 * are invented (task honesty rule).
 */

// ── intake row (subset of scan_requests we render) ───────────────────────────
export interface ScanRequestRow {
  id: string;
  created_at: string;
  plan: string | null;
  full_name: string;
  email: string;
  company: string | null;
  target_url: string;
  context: string | null;
  country_declared: string;
  country_declared_name: string | null;
  ip_country: string | null;
  network_type: string | null;
  browser_timezone: string | null;
  browser_locale: string | null;
  user_agent: string | null;
  due_diligence_consent: boolean;
  status: string;
  review_reason: string | null;
  triage_score: number | null;
  triage_verdict: string | null;
  triage_flags: TriageFlag[] | null;
  triage_recommendation: string | null;
  // ── migration 0006: third-party disclosure + client geo + payment lifecycle ──
  // Fetched by the existing select("*"); undefined at runtime until 0006 is
  // applied, so every reader treats a missing value as "no proof / not set".
  subscribed_platform: boolean;
  provider_name: string | null;
  provider_notify_ref: string | null;
  provider_notified: boolean;
  requestor_geo: GeoSignal | null;
  target_geo: GeoSignal | null;
  rejection_reason: string | null;
  payment_link_sent_at: string | null;
  report_url: string | null;
}

/** Client-submitted geo preview (soft signal; server re-resolves independently). */
export interface GeoSignal {
  cc?: string;
  name?: string;
  host?: string;
}

export interface TriageFlag {
  sev?: string;
  severity?: string;
  code?: string;
  msg?: string;
  message?: string;
}

export interface CaseView {
  case: CaseRecord;
  req: ScanRequestRow | null;
  scan: Scan | null;
  checks: ScanResultRow[];
}

// ── joined reads ─────────────────────────────────────────────────────────────
async function fetchRequests(ids: string[]): Promise<Map<string, ScanRequestRow>> {
  const map = new Map<string, ScanRequestRow>();
  if (ids.length === 0) return map;
  const supabase = createServiceClient();
  const { data } = await supabase.from("scan_requests").select("*").in("id", ids);
  for (const r of (data as ScanRequestRow[]) ?? []) map.set(r.id, r);
  return map;
}

async function fetchScans(ids: string[]): Promise<Map<string, Scan>> {
  const map = new Map<string, Scan>();
  if (ids.length === 0) return map;
  const supabase = createServiceClient();
  const { data } = await supabase.from("scans").select("*").in("id", ids);
  for (const s of (data as Scan[]) ?? []) map.set(s.id, s);
  return map;
}

export async function loadCases(): Promise<CaseView[]> {
  const cases = await listCases(200);
  const reqIds = cases.map((c) => c.scan_request_id).filter((v): v is string => Boolean(v));
  const scanIds = cases.map((c) => c.scan_id).filter((v): v is string => Boolean(v));
  const [reqs, scans] = await Promise.all([fetchRequests(reqIds), fetchScans(scanIds)]);
  return cases.map((c) => ({
    case: c,
    req: c.scan_request_id ? reqs.get(c.scan_request_id) ?? null : null,
    scan: c.scan_id ? scans.get(c.scan_id) ?? null : null,
    checks: [],
  }));
}

export async function loadCase(id: string): Promise<CaseView | null> {
  const c = await getCase(id);
  if (!c) return null;
  const supabase = createServiceClient();
  const [req, scan] = await Promise.all([
    c.scan_request_id
      ? supabase.from("scan_requests").select("*").eq("id", c.scan_request_id).maybeSingle()
      : Promise.resolve({ data: null }),
    c.scan_id
      ? supabase.from("scans").select("*").eq("id", c.scan_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  let checks: ScanResultRow[] = [];
  if (c.scan_id) {
    const { data } = await supabase
      .from("scan_results")
      .select("*")
      .eq("scan_id", c.scan_id)
      .order("sort_order", { ascending: true });
    checks = (data as ScanResultRow[]) ?? [];
  }
  return {
    case: c,
    req: (req.data as ScanRequestRow) ?? null,
    scan: (scan.data as Scan) ?? null,
    checks,
  };
}

export interface AuditRow {
  id: string;
  created_at: string;
  case_id: string | null;
  event_type: string;
  detail: string | null;
  ref: string | null;
}

export async function loadAuditLog(limit = 200): Promise<AuditRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("cc_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AuditRow[]) ?? [];
}

export interface EmailRow {
  id: string;
  created_at: string;
  case_id: string | null;
  kind: "approval" | "reject" | "report" | "disclosure";
  to_email: string | null;
  subject: string | null;
  body: string | null;
}

export async function loadEmailLog(limit = 200): Promise<EmailRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("cc_email_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as EmailRow[]) ?? [];
}

/**
 * Operator-run scans straight off the `scans` engine table — the admin self-scan
 * path (app/actions/admin-scan.ts) writes here and NEVER creates a cc_case, so
 * these rows are invisible to loadCases() and to every case-driven screen. The
 * report-history page reads them separately so an operator can find a scan they
 * ran; they are NOT delivered customer reports.
 */
export type OperatorScanRow = Pick<
  Scan,
  | "id"
  | "created_at"
  | "target_url"
  | "target_label"
  | "status"
  | "verdict"
  | "score"
  | "tests_passed"
  | "tests_total"
>;

export async function loadRecentScans(limit = 50): Promise<OperatorScanRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("scans")
    .select(
      "id, created_at, target_url, target_label, status, verdict, score, tests_passed, tests_total",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as OperatorScanRow[]) ?? [];
}

/** scan_requests with no cc_case yet — the raw intake feed the console ingests. */
export async function loadUningestedRequests(): Promise<ScanRequestRow[]> {
  const supabase = createServiceClient();
  const [reqRes, caseRes] = await Promise.all([
    supabase.from("scan_requests").select("*").order("created_at", { ascending: false }).limit(200),
    supabase.from("cc_cases").select("scan_request_id"),
  ]);
  const linked = new Set(
    ((caseRes.data as { scan_request_id: string | null }[]) ?? [])
      .map((c) => c.scan_request_id)
      .filter(Boolean),
  );
  return ((reqRes.data as ScanRequestRow[]) ?? []).filter((r) => !linked.has(r.id));
}

// ── sidebar counts (single query) ────────────────────────────────────────────
export interface Counts {
  intake: number;
  approval: number;
  approved: number;
  scanning: number;
  reports: number;
  disclosure: number;
  uningested: number;
}

export async function loadCounts(): Promise<Counts> {
  const [cases, uningested] = await Promise.all([loadCases(), loadUningestedRequests()]);
  const by = (s: CaseStatus) => cases.filter((c) => c.case.status === s).length;
  return {
    intake: by("intake"),
    approval: by("approval"),
    approved: by("approved"),
    scanning: by("scanning"),
    reports: cases.filter((c) => c.case.report_delivered_at).length,
    disclosure: cases.filter(
      (c) => c.case.subscribed && c.case.disclosure_state !== "informed",
    ).length,
    uningested: uningested.length,
  };
}

// ── OWASP-LLM checks (fixed order, PRD) ───────────────────────────────────────
export const CHECKS = [
  { key: "LLM07", name: "System Prompt Disclosure" },
  { key: "LLM01", name: "Prompt Injection" },
  { key: "LLM01b", name: "Jailbreak / Persona Bypass" },
  { key: "LLM06", name: "Sensitive Data Exposure" },
  { key: "LLM05", name: "Unsafe Content Generation" },
] as const;

// ── status → label/badge (PRD statusMeta) ────────────────────────────────────
export type BadgeKind = "ok" | "warn" | "bad" | "info" | "subtle";

export const STATUS_META: Record<CaseStatus, { label: string; kind: BadgeKind }> = {
  intake: { label: "Needs triage review", kind: "warn" },
  approval: { label: "Awaiting decision", kind: "warn" },
  approved: { label: "Approved — payment", kind: "info" },
  scanning: { label: "Scan running", kind: "info" },
  complete: { label: "Report delivered", kind: "ok" },
  rejected: { label: "Rejected", kind: "bad" },
};

export function tierKind(tier: string | null | undefined): BadgeKind {
  const t = (tier ?? "").toLowerCase();
  if (t.includes("enterprise")) return "warn";
  if (t.includes("advanced")) return "info";
  return "subtle";
}

// ── jurisdiction engine (derived; PRD 4-value) ───────────────────────────────
const SANCTIONED = new Set(["CU", "IR", "KP", "SY", "RU", "BY"]);
const LICENCE = new Set(["SG", "MY"]);
const UNTRUSTED_NET = new Set(["hosting", "vpn", "proxy", "datacenter"]);

export type Jur = "clear" | "license" | "sanctioned" | "mismatch";

export interface JurVerdict {
  jur: Jur;
  label: string;
  kind: BadgeKind;
  geoLine: string;
  detail: string;
}

export function deriveJur(req: ScanRequestRow | null): JurVerdict {
  const declared = (req?.country_declared ?? "").toUpperCase();
  const ip = (req?.ip_country ?? "").toUpperCase();
  const net = (req?.network_type ?? "").toLowerCase();
  const geoLine = `Declared ${declared || "—"} · IP ${ip || "—"}${
    net ? ` (${net})` : ""
  }`;
  // Stricter of the two wins: sanctions first, then licence, then mismatch.
  if (SANCTIONED.has(declared) || SANCTIONED.has(ip)) {
    return {
      jur: "sanctioned",
      label: "Sanctions hit",
      kind: "bad",
      geoLine,
      detail: "On the deny-list — auto-reject. A clear sanctions check is never on its own sufficient to approve.",
    };
  }
  const netConflict = net && UNTRUSTED_NET.has(net);
  const countryConflict = Boolean(declared && ip && declared !== ip);
  if (countryConflict || netConflict) {
    return {
      jur: "mismatch",
      label: "Due-diligence hold",
      kind: "bad",
      geoLine,
      detail: "Declared vs network signals conflict. No scan and no ownership challenge until manually cleared.",
    };
  }
  if (LICENCE.has(declared) || LICENCE.has(ip)) {
    return {
      jur: "license",
      label: "Licence required",
      kind: "warn",
      geoLine,
      detail: "Hold pending a valid local pen-test licence for this jurisdiction (e.g. SG CSA licence).",
    };
  }
  return { jur: "clear", label: "Clear", kind: "ok", geoLine, detail: "Jurisdiction clear — proceed." };
}

// ── activation gate rows (PRD gateRowsFor) ───────────────────────────────────
export interface GateRow {
  label: string;
  value: string;
  kind: BadgeKind;
}

export function gateRowsFor(view: CaseView): GateRow[] {
  const { case: c } = view;
  const j = deriveJur(view.req);
  const rows: GateRow[] = [];

  // Ownership: no verified proof is linked to a case in this data model yet.
  // ponytail: honest "not proven" until ownership_tokens are wired to a case; no fake "verified".
  rows.push({ label: "Ownership verified", value: "Not proven", kind: "bad" });

  rows.push(
    j.jur === "mismatch"
      ? { label: "Residency cross-check", value: "Signals conflict", kind: "bad" }
      : { label: "Residency cross-check", value: j.geoLine, kind: "subtle" },
  );

  rows.push(
    j.jur === "sanctioned"
      ? { label: "SSRF / public target", value: "Blocked", kind: "bad" }
      : { label: "SSRF / public target", value: "Public address", kind: "subtle" },
  );

  rows.push(
    j.jur === "sanctioned"
      ? { label: "Sanctions sub-check", value: "Deny-list hit", kind: "bad" }
      : { label: "Sanctions sub-check", value: "Not on deny-list", kind: "subtle" },
  );

  if (c.subscribed) {
    rows.push(
      c.disclosure_state === "informed"
        ? { label: "Provider disclosure", value: "Notified", kind: "ok" }
        : { label: "Provider disclosure", value: "Awaiting proof", kind: "warn" },
    );
  }

  rows.push(
    c.paid
      ? { label: "Payment confirmed", value: "Paid", kind: "ok" }
      : { label: "Payment confirmed", value: "Awaiting payment", kind: "warn" },
  );

  return rows;
}

export function gateVerdict(rows: GateRow[]): { text: string; kind: BadgeKind } {
  if (rows.some((r) => r.kind === "bad")) return { text: "Will not activate", kind: "bad" };
  if (rows.every((r) => r.kind === "ok" || r.kind === "subtle"))
    return { text: "All conditions met — scan can activate", kind: "ok" };
  return { text: "Holding — conditions outstanding", kind: "warn" };
}
