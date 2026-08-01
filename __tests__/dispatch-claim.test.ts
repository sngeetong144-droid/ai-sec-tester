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

// ── what actually makes the claim atomic ────────────────────────────────────
// The handoff carried "claim atomicity is unproven at the Postgres level" as an
// open item. Postgres-level serialisation is not ours to prove in a unit test and
// faking a proof would be worse than the gap. What IS ours: the claim must remain
// a SINGLE conditional UPDATE. That shape is precisely why Postgres atomicity
// applies - concurrent UPDATEs on one row serialise, and under READ COMMITTED the
// loser re-evaluates its WHERE against the committed row and stops matching.
// Rewritten as read-then-write it would race, silently, and every existing test
// here would still pass. These pin the shape.

import { readFileSync } from "node:fs";
import { join } from "node:path";

const CLAIM_SRC = readFileSync(
  join(import.meta.dir, "..", "lib", "command-center", "claim.ts"),
  "utf8",
);

test("the claim is one conditional UPDATE, never read-then-write", () => {
  // Guards the guard: if the file moved or emptied, everything below is vacuous.
  expect(CLAIM_SRC).toContain("claimScanRequest");

  const claimFn = CLAIM_SRC.slice(
    CLAIM_SRC.indexOf("export async function claimScanRequest"),
    CLAIM_SRC.indexOf("export async function releaseScanRequestClaim"),
  );
  expect(claimFn.length).toBeGreaterThan(100);

  // Exactly one write, and no prior read to decide on.
  expect((claimFn.match(/\.update\(/g) ?? []).length).toBe(1);
  expect(claimFn).not.toContain(".maybeSingle(");
  expect(claimFn).not.toContain(".single(");
});

test("the claim predicate keeps both guards: status and availability", () => {
  const claimFn = CLAIM_SRC.slice(CLAIM_SRC.indexOf("export async function claimScanRequest"));
  // Dropping either turns a claim into an unconditional stomp.
  expect(claimFn).toContain('.eq("status", "paid_scanning")');
  expect(claimFn).toContain("availableClaimFilter");
});

test("a query error is distinguished from a lost race", () => {
  // `data`-only destructuring would make a BROKEN claim path read exactly like a
  // legitimately lost race, and every row would silently look claimed-by-someone.
  expect(CLAIM_SRC).toContain("const { data, error }");
  expect(CLAIM_SRC).toContain("if (error)");
});

test("concurrent claimants: exactly one wins", async () => {
  // Models what Postgres does to two UPDATEs on one row: they serialise, and the
  // second sees the first's committed claimed_at, so its filter no longer matches.
  let claimedAt: number | null = null;
  const supa = {
    from() {
      const state: { patch: Record<string, unknown> | null } = { patch: null };
      const b: Record<string, unknown> = {};
      const chain = () => b;
      b.update = (patch: Record<string, unknown>) => {
        state.patch = patch;
        return b;
      };
      b.eq = chain;
      b.or = chain;
      b.select = () => {
        const free = claimedAt === null;
        if (free && state.patch) {
          claimedAt = Date.now();
          return Promise.resolve({ data: [{ id: "req-1" }], error: null });
        }
        return Promise.resolve({ data: [], error: null });
      };
      return b;
    },
  };

  const results = await Promise.all([
    claimScanRequest(supa as never, "req-1", "worker-a"),
    claimScanRequest(supa as never, "req-1", "worker-b"),
    claimScanRequest(supa as never, "req-1", "worker-c"),
  ]);
  expect(results.filter(Boolean).length).toBe(1);
});