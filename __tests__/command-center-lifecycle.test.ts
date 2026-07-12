/**
 * command-center-lifecycle.test.ts — the approve / reject / mark-paid (activate)
 * transitions at the guarded queries layer, plus mark-paid idempotency.
 *
 * Exercises the REAL transition() logic (lib/command-center/queries.ts) against a
 * modeled cc_cases row with true conditional-update semantics (the WHERE re-asserts
 * the expected status), so the idempotency guarantee is proven, not stubbed. Audit
 * writes are spied to confirm every mutation records its append-only trail.
 *
 * Run: bun test __tests__/command-center-lifecycle.test.ts
 */
import { test, expect, mock, beforeEach, afterAll } from "bun:test";

// Capture the REAL modules BEFORE mocking (static imports evaluate first). bun runs
// every test file in one process and mock.module is global, so a cc_cases-only stub
// would leak into alphabetically-later files (e.g. ownership-gate) that use the real
// service client. Restore them in afterAll to contain the mock to this file.
import * as realService from "@/lib/supabase/service";
import * as realAudit from "@/lib/audit-log";
const realCreateServiceClient = realService.createServiceClient;
const realRecordCaseAudit = realAudit.recordCaseAudit;

type Row = {
  id: string;
  status: string;
  paid: boolean;
  scan_id: string | null;
  rejection_reason: string | null;
};

let ccRow: Row;
let auditCalls: { caseId: string; eventType: string; detail?: string | null }[] = [];

function resetRow(status: string) {
  ccRow = { id: "case-1", status, paid: false, scan_id: null, rejection_reason: null };
  auditCalls = [];
}

// Minimal service-client double for cc_cases. Supports the two shapes transition()
// uses: read = .select().eq().maybeSingle(); write = .update().eq().eq().select().maybeSingle()
// with a conditional update that only matches when the asserted status still holds.
function client() {
  return {
    from(table: string) {
      const state: { patch: Record<string, unknown> | null; filters: Record<string, string> } = {
        patch: null,
        filters: {},
      };
      const matches = () => {
        const idOk = !("id" in state.filters) || state.filters.id === ccRow.id;
        const statusOk = !("status" in state.filters) || state.filters.status === ccRow.status;
        return idOk && statusOk;
      };
      const builder = {
        select() {
          return builder;
        },
        update(patch: Record<string, unknown>) {
          state.patch = patch;
          return builder;
        },
        eq(col: string, val: string) {
          state.filters[col] = String(val);
          return builder;
        },
        maybeSingle() {
          if (table !== "cc_cases") return Promise.resolve({ data: null, error: null });
          if (state.patch) {
            if (matches()) {
              Object.assign(ccRow, state.patch);
              return Promise.resolve({ data: { ...ccRow }, error: null });
            }
            return Promise.resolve({ data: null, error: null }); // status moved → no write
          }
          return Promise.resolve({ data: matches() ? { ...ccRow } : null, error: null });
        },
      };
      return builder;
    },
  };
}

mock.module("@/lib/supabase/service", () => ({ createServiceClient: () => client() }));
mock.module("@/lib/audit-log", () => ({
  recordCaseAudit: async (a: { caseId: string; eventType: string; detail?: string | null }) => {
    auditCalls.push(a);
  },
}));

const { approveCase, rejectCase, advanceToApproval, activateCase } = await import(
  "../lib/command-center/queries"
);

afterAll(() => {
  mock.module("@/lib/supabase/service", () => ({ createServiceClient: realCreateServiceClient }));
  mock.module("@/lib/audit-log", () => ({ recordCaseAudit: realRecordCaseAudit }));
});

beforeEach(() => resetRow("approval"));

test("advanceToApproval: intake → approval, audit-logged", async () => {
  resetRow("intake");
  const updated = await advanceToApproval("case-1");
  expect(updated?.status).toBe("approval");
  expect(auditCalls.at(-1)?.eventType).toBe("SENT_TO_DECISION");
});

test("approveCase: approval → approved, audit-logged", async () => {
  const updated = await approveCase("case-1");
  expect(updated?.status).toBe("approved");
  expect(ccRow.status).toBe("approved");
  expect(auditCalls.some((a) => a.eventType === "REQUEST_APPROVED")).toBe(true);
});

test("approveCase from a non-approval status fails closed (no write, no audit)", async () => {
  resetRow("intake");
  const updated = await approveCase("case-1");
  expect(updated).toBeNull();
  expect(ccRow.status).toBe("intake");
  expect(auditCalls.length).toBe(0);
});

test("rejectCase: requires a reason", async () => {
  const updated = await rejectCase("case-1", "   ");
  expect(updated).toBeNull();
  expect(ccRow.status).toBe("approval"); // unchanged
});

test("rejectCase: approval → rejected, reason stored + audited", async () => {
  const updated = await rejectCase("case-1", "Ownership unverifiable.");
  expect(updated?.status).toBe("rejected");
  expect(ccRow.rejection_reason).toBe("Ownership unverifiable.");
  expect(auditCalls.some((a) => a.eventType === "REQUEST_REJECTED")).toBe(true);
});

test("mark-paid (activateCase) is idempotent: second activation is a no-op", async () => {
  resetRow("approved");

  const first = await activateCase("case-1", "scan-1");
  expect(first?.status).toBe("scanning");
  expect(ccRow.paid).toBe(true);
  expect(ccRow.scan_id).toBe("scan-1");

  // A duplicate "mark paid" (webhook re-delivery / double-click) finds the case
  // already scanning; canTransition(scanning, scanning) is false → null, no write.
  const second = await activateCase("case-1", "scan-2");
  expect(second).toBeNull();
  expect(ccRow.scan_id).toBe("scan-1"); // NOT overwritten by the second scan id
  expect(ccRow.status).toBe("scanning");
});
