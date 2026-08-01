/**
 * owasp-ids.test.ts - the OWASP LLM Top-10 (2025) id mapping is the product's
 * core credibility claim. Getting a code wrong is the first thing an informed
 * buyer catches, and it has now been wrong three separate times:
 *   - homepage said "LLM02 Insecure output" (engine grades it LLM05)
 *   - homepage said "LLM08 Excessive agency" for a check the Normal tier never runs
 *   - the engine labelled BOTH Sensitive Information Disclosure and Excessive
 *     Agency as LLM06, and shipped that into a paid $497 report (scan c498084a)
 *
 * Prose in a comment did not prevent any of those. This test does: it reads the
 * engine sources and refuses any id/name pairing that is not canonical.
 *
 * Run: bun test __tests__/owasp-ids.test.ts
 */
import { test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// OWASP Top 10 for LLM Applications, 2025. The single source of truth.
const CANONICAL: Record<string, string> = {
  LLM01: "prompt injection",
  LLM02: "sensitive information disclosure",
  LLM03: "supply chain",
  LLM04: "data and model poisoning",
  LLM05: "improper output handling",
  LLM06: "excessive agency",
  LLM07: "system prompt leakage",
  LLM08: "vector and embedding weaknesses",
  LLM09: "misinformation",
  LLM10: "unbounded consumption",
};

const LIB = join(import.meta.dir, "..", "lib");
const PAIR = /OWASP\s+(LLM\d{2})\s+\u2014\s+([A-Za-z][A-Za-z0-9 \/-]*)/g;

function pairs(): { id: string; name: string; file: string }[] {
  const out: { id: string; name: string; file: string }[] = [];
  for (const f of readdirSync(LIB).filter((n) => n.endsWith(".ts"))) {
    const src = readFileSync(join(LIB, f), "utf8");
    for (const m of src.matchAll(PAIR)) {
      out.push({ id: m[1], name: m[2].trim().toLowerCase(), file: f });
    }
  }
  return out;
}

test("the engines actually declare OWASP categories", () => {
  // Guards the guard: if the regex stops matching, every assertion below passes
  // vacuously and the test becomes decoration.
  expect(pairs().length).toBeGreaterThan(10);
});

test("every declared category uses its canonical OWASP id", () => {
  const wrong = pairs().filter(({ id, name }) => {
    const want = CANONICAL[id];
    return !want || !name.startsWith(want);
  });
  expect(wrong.map((w) => `${w.file}: ${w.id} = ${w.name}`)).toEqual([]);
});

test("no single OWASP id is used for two different categories", () => {
  const byId = new Map<string, Set<string>>();
  for (const { id, name } of pairs()) {
    const base = name.split(" (")[0];
    if (!byId.has(id)) byId.set(id, new Set());
    byId.get(id)!.add(base);
  }
  const collisions = [...byId.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([id, names]) => `${id} -> ${[...names].join(" | ")}`);
  expect(collisions).toEqual([]);
});

test("no category name is filed under two different OWASP ids", () => {
  const byName = new Map<string, Set<string>>();
  for (const { id, name } of pairs()) {
    const base = name.split(" (")[0];
    if (!byName.has(base)) byName.set(base, new Set());
    byName.get(base)!.add(id);
  }
  const split = [...byName.entries()]
    .filter(([, ids]) => ids.size > 1)
    .map(([name, ids]) => `${name} -> ${[...ids].join(" | ")}`);
  expect(split).toEqual([]);
});