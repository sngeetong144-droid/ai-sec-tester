#!/usr/bin/env node
/**
 * check-payload-contracts.mjs - client -> handler payload contract checker.
 *
 * WHY THIS EXISTS (do not delete this as noise):
 *
 * On 2026-07-31 the public scan-request form was found to be rejecting EVERY
 * submission with HTTP 400. app/_components/landing-client.tsx built its JSON
 * body with `dueDiligenceConsent: true` but never sent `authorized`, while
 * app/api/scan-request/route.ts rejects unless `body.authorized === true`.
 * The form was 100% blocked on the one route that produces leads.
 *
 * The unit suite was GREEN the entire time. __tests__/scan-request-route.test.ts
 * hand-writes its own request payload containing `authorized: true`, so it was
 * testing the handler against an imaginary client that does not exist in the app.
 * That is the whole failure class: the client and the handler are two halves of
 * one contract, and nothing in the build ever compared them to each other.
 *
 * A prose rule ("remember to keep payloads in sync") cannot prevent that.
 * A runnable check can. This script is that check: for every fetch("/api/...")
 * call under app/, it reads the JSON object the caller actually sends, reads
 * every `body.X` the matching handler actually consumes, and fails if the
 * handler depends on a field no caller sends.
 *
 * Zero dependencies. Node ESM.  Run:  node scripts/check-payload-contracts.mjs
 * Exit 0 = every checked pair agrees. Exit 1 = at least one broken contract.
 *
 * IT IS A PRESENCE CHECK, NOT A PROOF OF CORRECTNESS. See the NOT COVERED
 * section it prints on every clean run before trusting a green result.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP_DIR = join(ROOT, "app");

/**
 * Fields a handler may legitimately read without every caller sending them.
 * Keyed by handler path. Every entry MUST carry a written REASON - an
 * unexplained entry is indistinguishable from the bug this script exists to
 * catch, so an empty reason is itself treated as a failure.
 */
const ALLOWLIST = {
  "app/api/scan-request/route.ts": {
    turnstileToken:
      "REASON: optional by design. verifyTurnstile() returns true when no Turnstile " +
      "secret is configured, so the request succeeds with the field absent. When keys " +
      "ARE configured the widget supplies it at runtime, not from a static object literal.",
    website:
      "REASON: honeypot. The field is a hidden input that real users leave empty; the " +
      "handler only branches when it is non-empty. Absence is the intended human path.",
  },
  // DELIBERATELY NOT ALLOWLISTED: app/api/deep-scan/route.ts `ownership_proof_id`.
  //
  // This script was written after a missing payload field cost months of revenue,
  // so exempting a live revenue blocker to obtain a green run would defeat its
  // whole purpose. This entry once had to stay red: the deep-scan CTA posted only
  // { scanId, email } while the handler required ownership_proof_id and returned
  // 403 otherwise, and no user interface called /api/ownership/challenge or
  // /api/ownership/verify at all, so no customer could ever obtain the proof id.
  // The path was unreachable, not "gated".
  //
  // It is now reachable: app/_components/deep-scan-cta.tsx drives the challenge
  // and verify steps and posts the resulting proof id, so the pair passes on its
  // own merits rather than on an exemption. Leave it unallowlisted - that is what
  // keeps the check honest if the caller ever regresses. Re-adding an entry here
  // instead of fixing the caller is how the original bug shipped.
  //
  // NOTE: /enterprise is the ownership-verification funnel, not a price tier.
  // Ruling R-15 (2026-08-02) retired the Enterprise TIER; the route is unaffected.
  "app/api/local-scan/route.ts": {
    ownership_proof_id:
      "REASON: gate input, not a form field. Same typeof-guarded pattern as deep-scan; " +
      "allow_local (localhost dev runs) skips the ownership gate entirely, so the console " +
      "runner is expected to post without a proof id.",
  },
};

/* ------------------------------------------------------------------ */
/* Source scanning helpers                                             */
/* ------------------------------------------------------------------ */

const QUOTES = new Set(['"', "'", "`"]);

/**
 * Blank out comments while preserving every character offset (comments become
 * spaces, newlines are kept). Offsets stay valid for later index math, and a
 * `body.x` mentioned only in a JSDoc block can never be mistaken for a read.
 */
function stripComments(src) {
  const out = src.split("");
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (QUOTES.has(c)) {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") { out[i] = " "; i++; }
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      if (i < src.length) { out[i] = " "; out[i + 1] = " "; i += 2; }
      continue;
    }
    i++;
  }
  return out.join("");
}

/** Index of the bracket matching the opener at `start`, or -1. */
function matchBracket(src, start) {
  const open = src[start];
  const close = open === "{" ? "}" : open === "(" ? ")" : "]";
  let depth = 0;
  let i = start;
  while (i < src.length) {
    const c = src[i];
    if (QUOTES.has(c)) {
      const q = c;
      i++;
      while (i < src.length) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Top-level property names of an object literal (text must start at its `{`).
 * MUST understand ES6 shorthand - `plan,` is a sent field even though it has no
 * colon. Treating shorthand as "not a key" would make this script emit false
 * positives on the exact repo it was written for.
 */
function objectLiteralKeys(text) {
  const keys = [];
  let spread = false;
  let dynamic = false;
  const segments = [];
  let buf = "";
  let depth = 0;
  let i = 1;
  while (i < text.length) {
    const c = text[i];
    if (QUOTES.has(c)) {
      const q = c;
      const from = i;
      i++;
      while (i < text.length) {
        if (text[i] === "\\") { i += 2; continue; }
        if (text[i] === q) { i++; break; }
        i++;
      }
      buf += text.slice(from, i);
      continue;
    }
    if (c === "{" || c === "[" || c === "(") { depth++; buf += c; i++; continue; }
    if (c === "}" && depth === 0) { segments.push(buf); break; }
    if (c === "}" || c === "]" || c === ")") { depth--; buf += c; i++; continue; }
    if (c === "," && depth === 0) { segments.push(buf); buf = ""; i++; continue; }
    buf += c;
    i++;
  }

  for (const raw of segments) {
    const seg = raw.trim();
    if (!seg) continue;
    if (seg.startsWith("...")) { spread = true; continue; }
    if (seg.startsWith("[")) { dynamic = true; continue; }
    const m = /^(?:(['"])([^'"]*)\1|([A-Za-z_$][\w$]*))\s*(:)?/.exec(seg);
    if (!m) { dynamic = true; continue; }
    // No colon => ES6 shorthand => still a sent field.
    keys.push(m[2] !== undefined ? m[2] : m[3]);
  }
  return { keys, spread, dynamic };
}

/** Every `body.X` / `body?.X` the handler reads. */
function handlerBodyReads(src) {
  const clean = stripComments(src);
  const reads = new Set();
  const re = /\bbody\s*\??\.\s*([A-Za-z_$][\w$]*)/g;
  let m;
  while ((m = re.exec(clean))) reads.add(m[1]);
  return reads;
}

function lineOf(src, index) {
  return src.slice(0, index).split("\n").length;
}

const BSLASH = String.fromCharCode(92);
const rel = (p) => relative(ROOT, p).split(BSLASH).join("/");

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // app/api is the server side of the contract, never the caller side.
      if (rel(full) === "app/api") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

/* ------------------------------------------------------------------ */
/* Contract extraction                                                 */
/* ------------------------------------------------------------------ */

/** Resolve the JSON object literal a fetch call sends, if it is resolvable. */
function resolveSentBody(clean, fetchOpenIdx) {
  const closeIdx = matchBracket(clean, fetchOpenIdx);
  if (closeIdx < 0) return { status: "unresolved", why: "unbalanced fetch() call" };
  const args = clean.slice(fetchOpenIdx, closeIdx + 1);

  const bodyKey = /\bbody\s*:/.exec(args);
  if (!bodyKey) return { status: "no-body", why: "fetch sends no body" };

  const expr = args.slice(bodyKey.index + bodyKey[0].length).trim();

  // Pattern A: body: JSON.stringify({ ... })  or  body: JSON.stringify(ident)
  if (expr.startsWith("JSON.stringify")) {
    const parenRel = expr.indexOf("(");
    const parenEnd = matchBracket(expr, parenRel);
    if (parenEnd < 0) return { status: "unresolved", why: "unbalanced JSON.stringify()" };
    const inner = expr.slice(parenRel + 1, parenEnd).trim();

    if (inner.startsWith("{")) {
      const end = matchBracket(inner, 0);
      return { status: "ok", ...objectLiteralKeys(inner.slice(0, end + 1)) };
    }
    // Pattern B: const body = { ... }; ... JSON.stringify(body)
    if (/^[A-Za-z_$][\w$]*$/.test(inner)) {
      const declRe = new RegExp("(const|let|var)[ ]+" + inner + "[^=;]*=[ ]*[{]");
      const decl = declRe.exec(clean);
      if (!decl) {
        return {
          status: "unresolved",
          why: 'body variable "' + inner + '" is not a local object literal',
        };
      }
      const braceIdx = clean.indexOf("{", decl.index);
      const end = matchBracket(clean, braceIdx);
      return { status: "ok", ...objectLiteralKeys(clean.slice(braceIdx, end + 1)) };
    }
    return {
      status: "unresolved",
      why: "JSON.stringify() argument is not a literal or a local const",
    };
  }

  if (expr.startsWith("{")) {
    const end = matchBracket(expr, 0);
    return { status: "ok", ...objectLiteralKeys(expr.slice(0, end + 1)) };
  }

  return {
    status: "unresolved",
    why: "body is not a JSON object literal (FormData, blob, stream, ...)",
  };
}

function handlerPathFor(url) {
  const segs = url.split("?")[0].replace(/\/+$/, "").split("/").filter(Boolean);
  return join(ROOT, "app", ...segs, "route.ts");
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

if (!existsSync(APP_DIR)) {
  console.error("FAIL: no app/ directory at " + APP_DIR + ". Run from the project root.");
  process.exit(1);
}

const failures = [];
const skipped = [];
const allowlistNotes = [];
let pairsChecked = 0;

for (const file of walk(APP_DIR)) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("/api/")) continue;
  const clean = stripComments(src);

  const fetchRe = /\bfetch\s*\(\s*(["'`])(\/api\/[^"'`$]*)\1/g;
  let m;
  while ((m = fetchRe.exec(clean))) {
    const url = m[2];
    const callerRef = rel(file) + ":" + lineOf(clean, m.index);
    const openParen = clean.indexOf("(", m.index);
    const handlerFile = handlerPathFor(url);

    if (!existsSync(handlerFile)) {
      skipped.push(callerRef + " -> " + url + "  (no handler file at " + rel(handlerFile) + ")");
      continue;
    }

    const sent = resolveSentBody(clean, openParen);
    if (sent.status === "no-body") {
      skipped.push(callerRef + " -> " + url + "  (no request body)");
      continue;
    }
    if (sent.status !== "ok") {
      skipped.push(callerRef + " -> " + url + "  (" + sent.why + ")");
      continue;
    }
    if (sent.spread || sent.dynamic) {
      skipped.push(
        callerRef + " -> " + url +
          "  (payload uses a spread or a computed key - cannot be resolved statically)",
      );
      continue;
    }

    const handlerRel = rel(handlerFile);
    const reads = handlerBodyReads(readFileSync(handlerFile, "utf8"));
    const allowed = ALLOWLIST[handlerRel] || {};
    const sentSet = new Set(sent.keys);
    pairsChecked++;

    const missing = [];
    for (const field of reads) {
      if (sentSet.has(field)) continue;
      const reason = allowed[field];
      if (typeof reason === "string" && reason.trim()) {
        allowlistNotes.push(handlerRel + "  " + field + "\n      " + reason);
        continue;
      }
      if (field in allowed) {
        missing.push(field + " (allowlisted with an EMPTY reason - reasons are mandatory)");
        continue;
      }
      missing.push(field);
    }

    if (missing.length) failures.push({ callerRef, handlerRel, url, missing });
  }
}

console.log("PAYLOAD CONTRACT CHECK");
console.log("  pairs checked: " + pairsChecked);

if (skipped.length) {
  console.log("  call sites skipped (not statically resolvable): " + skipped.length);
  for (const s of skipped) console.log("    - " + s);
}

if (allowlistNotes.length) {
  console.log("  allowlisted optional fields: " + allowlistNotes.length);
  for (const a of allowlistNotes) console.log("    - " + a);
}

if (failures.length) {
  console.log("");
  console.log("BROKEN CONTRACTS: " + failures.length);
  for (const f of failures) {
    console.log("");
    console.log("  route:    " + f.url);
    console.log("  caller:   " + f.callerRef);
    console.log("  handler:  " + f.handlerRel);
    console.log("  missing:  " + f.missing.join(", "));
    console.log("  consequence: the handler reads these fields from the request body, but this");
    console.log("               caller never sends them. At runtime they arrive as undefined, so");
    console.log("               every submission from this caller fails the handler's check (400 /");
    console.log("               403) while the unit suite stays green - the tests hand-write their");
    console.log("               own payload and never exercise the real client. This is exactly the");
    console.log("               scan-request outage of 2026-07-31. Fix the caller, or add the field");
    console.log("               to ALLOWLIST in this script with a written REASON.");
  }
  console.log("");
  process.exit(1);
}

console.log("");
console.log("RESULT: PASS - every checked caller sends every field its handler reads.");
console.log("");
console.log("NOT COVERED - a green run here does NOT mean all contracts are safe:");
console.log("  1. VALUE TYPES. This checks presence only, never the type or shape of a value.");
console.log('     The same broken payload also sent subscribedPlatform as the STRING "yes" against');
console.log("     a server test of `=== true`, so the disclosure rule silently never applied. That");
console.log("     field was present, so this script would have called it fine.");
console.log('  2. FormData SERVER ACTIONS. Only fetch("/api/...") JSON call sites are inspected.');
console.log("     Server actions taking FormData are invisible here - which is how a second blocker");
console.log("     in app/_components/enterprise-form.tsx stayed hidden.");
console.log("  3. SPREADS AND CONDITIONAL BODIES. Payloads built with a spread, computed keys, or");
console.log("     fields added inside an if-branch cannot be resolved statically; they are listed");
console.log("     as skipped above and are NOT verified.");
console.log("  4. HANDLER READS IT CANNOT SEE. Fields consumed via destructuring, a validation");
console.log("     schema, or a helper that receives the body are not counted as `body.X` reads.");
console.log("  5. ALLOWLISTED FIELDS are trusted on the strength of their written REASON only.");
console.log("");
console.log("  The only proof a form works is submitting the real form and reading the response.");
process.exit(0);
