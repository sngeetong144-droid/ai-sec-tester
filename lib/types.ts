export interface Scan {
  id: string;
  created_at: string;
  completed_at: string | null;
  target_url: string;
  target_label: string | null;
  email: string | null;
  session_id: string | null;
  authorized: boolean;
  status: "pending" | "running" | "complete" | "failed";
  score: number | null;
  tests_total: number;
  tests_passed: number;
  verdict: "pass" | "warn" | "fail" | null;
  summary: string | null;
}

export interface ScanResultRow {
  id: string;
  scan_id: string;
  created_at: string;
  test_key: string;
  test_name: string;
  category: string | null;
  severity: "low" | "medium" | "high" | "critical" | null;
  status: "pending" | "running" | "pass" | "fail";
  detail: string | null;
  evidence: string | null;
  remediation: string | null;
  sort_order: number;
}

export interface ScanWithResults extends Scan {
  results: ScanResultRow[];
}
