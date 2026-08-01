#!/usr/bin/env node
/**
 * sync-doc-center.mjs — regenerate docs/doc-center.html from its source markdown.
 *
 * doc-center.html embeds a SNAPSHOT of each doc inside <script id="docdata">,
 * with the source file recorded as `path`. Editing a .md therefore silently
 * leaves the viewer showing stale prose — that is how the "report is plain text"
 * claim survived in the viewer after the code shipped real PDFs. This re-reads
 * every `path` and rewrites its `md`, so the mirror cannot drift again.
 *
 * Run after editing any doc in /docs:  node scripts/sync-doc-center.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "docs/doc-center.html");
const OPEN = '<script id="docdata" type="application/json">';
const CLOSE = "</script>";

const html = readFileSync(target, "utf8");
const start = html.indexOf(OPEN);
if (start === -1) throw new Error(`docdata block not found in ${target}`);
const from = start + OPEN.length;
const to = html.indexOf(CLOSE, from);
if (to === -1) throw new Error("unterminated docdata block");

const docs = JSON.parse(html.slice(from, to));
let changed = 0;
for (const doc of docs) {
  if (!doc.path) continue;
  const md = readFileSync(resolve(root, doc.path), "utf8");
  if (md !== doc.md) {
    doc.md = md;
    changed++;
    console.log(`synced ${doc.path}`);
  }
}

writeFileSync(target, html.slice(0, from) + JSON.stringify(docs) + html.slice(to));
console.log(`doc-center: ${changed} of ${docs.length} docs re-synced`);
