/**
 * owasp-ids.test.ts - the OWASP LLM Top-10 (2025) id mapping is the product's
 * core credibility claim. Getting a code wrong is the first thing an informed
 * buyer catches, and it has now been wrong three separate times:
 *   - homepage said "LLM05 Insecure output" (engine grades it LLM05)
 *   - homepage said "LLM06 Excessive agency" for a check the Normal tier never runs
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

// The homepage carries bare codes next to a category NAME, in a different shape
// from the engines. The first version of this test read only lib/, so it passed
// green while the hero scorecard still said "LLM02 Sensitive data exposure" -
// caught by reading the deployed page, not by the suite. Covered now.
const LANDING = join(import.meta.dir, "..", "app", "_components", "landing.tsx");
const LANDING_PAIR = /code:\s*"(LLM\d{2})",\s*(?:h|name):\s*"([^"]+)"/g;

const HOMEPAGE_ALIASES: Record<string, string> = {
  "sensitive data exposure": "sensitive information disclosure",
  "sensitive info disclosure": "sensitive information disclosure",
  "unsafe content generation": "improper output handling",
  "jailbreak / persona bypass": "prompt injection",
  "system prompt disclosure": "system prompt leakage",
  "system prompt leakage": "system prompt leakage",
  "excessive agency": "excessive agency",
  "prompt injection": "prompt injection",
};

function landingPairs(): { id: string; name: string }[] {
  const src = readFileSync(LANDING, "utf8");
  return [...src.matchAll(LANDING_PAIR)].map((m) => ({
    id: m[1],
    name: m[2].trim().toLowerCase(),
  }));
}

test("the homepage actually declares OWASP codes", () => {
  expect(landingPairs().length).toBeGreaterThan(5);
});

test("every homepage code matches the canonical category it names", () => {
  const wrong = landingPairs().filter(({ id, name }) => {
    const canonicalName = HOMEPAGE_ALIASES[name];
    if (!canonicalName) return true; // an unmapped label is itself a defect
    return CANONICAL[id] !== canonicalName;
  });
  expect(wrong.map((w) => `${w.id} = ${w.name}`)).toEqual([]);
});
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
// ── the tier claim must match what the engine actually probes ────────────────
// The Advanced bullet used to read "Full OWASP LLM Top-10 coverage". All 10
// categories are declared, but three are advisory-only and the engine's own
// evidence text says a black-box scan "cannot" verify them. A buyer reads
// "coverage" as "tested". This binds the sentence to the code so it cannot drift.

test("the Advanced tier claim states the real probed/advisory split", async () => {
  const { TIER_FEATURES } = await import("../lib/tier-features");
  const engineSrc = readFileSync(join(LIB, "scan-engine.ts"), "utf8");

  const advisoryMatch = engineSrc.match(/const ADVISORY_KEYS = new Set\(\[([^\]]*)\]\)/);
  expect(advisoryMatch).not.toBeNull();
  const advisory = advisoryMatch![1].split(",").filter((s) => s.trim().length > 0).length;

  const declared = new Set([...engineSrc.matchAll(/OWASP (LLM\d{2})/g)].map((m) => m[1])).size;
  const probed = declared - advisory;

  // Guards the guard: if either count collapses the assertion below is vacuous.
  expect(declared).toBe(10);
  expect(advisory).toBeGreaterThan(0);

  const claim = TIER_FEATURES.advanced.find((f) => /OWASP/i.test(f));
  expect(claim).toBeDefined();
  for (const n of [declared, probed, advisory]) {
    expect(claim!).toContain(String(n));
  }
  // The overstated wording must not come back.
  expect(TIER_FEATURES.advanced.join(" ").toLowerCase()).not.toContain("full owasp");
});
// ── the admin console ───────────────────────────────────────────────────────
// Found on 2026-08-01 by reading the actual signed-in command centre: after the
// engines AND the homepage were corrected, the scan-case card still rendered
// "LLM02 Sensitive Data Exposure". The suite was green because it looked at lib/
// and landing.tsx and nowhere else. Third surface, same defect, same lesson as
// the dead pricing-tiers.tsx: fixing the copies you happen to know about is not
// fixing the defect.
const CONSOLE = join(import.meta.dir, "..", "app", "command-center", "_data.ts");
const CONSOLE_PAIR = /\{\s*key:\s*"(LLM\d{2}[a-z]?)",\s*name:\s*"([^"]+)"\s*\}/g;

const CONSOLE_ALIASES: Record<string, string> = {
  "system prompt disclosure": "system prompt leakage",
  "prompt injection": "prompt injection",
  "jailbreak / persona bypass": "prompt injection",
  "sensitive data exposure": "sensitive information disclosure",
  "unsafe content generation": "improper output handling",
};

test("the command centre actually declares OWASP checks", () => {
  const src = readFileSync(CONSOLE, "utf8");
  expect([...src.matchAll(CONSOLE_PAIR)].length).toBeGreaterThan(3);
});

test("every command-centre check code matches the category it names", () => {
  const src = readFileSync(CONSOLE, "utf8");
  const wrong: string[] = [];
  for (const m of src.matchAll(CONSOLE_PAIR)) {
    // "LLM01b" is a second probe under LLM01, not a distinct OWASP id.
    const baseId = m[1].replace(/[a-z]$/, "");
    const name = m[2].trim().toLowerCase();
    const canonicalName = CONSOLE_ALIASES[name];
    if (!canonicalName || CANONICAL[baseId] !== canonicalName) {
      wrong.push(`${m[1]} = ${name}`);
    }
  }
  expect(wrong).toEqual([]);
});