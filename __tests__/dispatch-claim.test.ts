/**
 * dispatch-claim.test.ts — the atomic claim stopping two dispatchers from
 * running one paid scan twice. The double models Postgres row semantics: the
 * UPDATE matches only while its predicate holds. Full rationale and why a TTL:
 * supabase/migrations/0009_scan_request_claim.sql
 * COVERS contention + expired-claim steal. NOT covered here: fail-closed on
 * query error, release ownership scoping, and the status predicate.
 */
import { test, expect } from "bun:test";
import { claimScanRequest, CLAIM_TTL_MS } from "../lib/command-center/claim";

type Row = { id: string; status: string; claimed_at: string | null; claimed_by: string | null };
const fresh = (): Row => ({ id: "r1", status: "paid_scanning", claimed_at: null, claimed_by: null });

function client(row: Row) {
  return {
    from() {
      const f: Record<string, string> = {};
      let patch: Partial<Row> = {}, or = "";
      const b = {
        update(p: Partial<Row>) { patch = p; return b; },
        eq(c: string, v: string) { f[c] = v; return b; },
        or(c: string) { or = c; return b; },
        select() { return b; },
        then(res: (v: { data: unknown[]; error: null }) => unknown) {
          const cut = Date.parse(or.split("claimed_at.lt.")[1] ?? "");
          const free = row.claimed_at === null || Date.parse(row.claimed_at) < cut;
          const ok = f.id === row.id && f.status === row.status && free;
          if (ok) Object.assign(row, patch);
          return Promise.resolve({ data: ok ? [{ id: row.id }] : [], error: null }).then(res);
        },
      };
      return b;
    },
  } as never;
}

test("second dispatcher loses the row the first claimed", async () => {
  const row = fresh();
  expect(await claimScanRequest(client(row), "r1", "A")).toBe(true);
  expect(await claimScanRequest(client(row), "r1", "B")).toBe(false);
  expect(row.claimed_by).toBe("A");
});

test("an expired claim is stealable, so a killed run cannot strand the row", async () => {
  const stale = new Date(Date.now() - CLAIM_TTL_MS - 1e3).toISOString();
  const row = { ...fresh(), claimed_at: stale, claimed_by: "dead" };
  expect(await claimScanRequest(client(row), "r1", "B")).toBe(true);
});
