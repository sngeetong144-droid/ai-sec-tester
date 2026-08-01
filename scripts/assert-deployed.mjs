#!/usr/bin/env node
/**
 * assert-deployed.mjs - prove a push actually reached production.
 *
 * WHY: twice now Vercel has REFUSED a deployment with no build, no deployment
 * record and no error anywhere. Most recently a cron schedule the plan does not
 * allow: commit 58c9d11 sat on origin/main, `git push` reported success, and
 * production quietly kept serving the previous build - taking a customer-facing
 * reporting fix down with it. Nothing in the normal workflow surfaces that.
 *
 * Usage:  node scripts/assert-deployed.mjs [--base url] [--timeout 300]
 * Exit 0 when /api/health reports a commit matching local HEAD. Exit 1 otherwise.
 */
import { execSync } from "node:child_process";

const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const BASE = arg("--base", "https://scan.thesoulsofai.com").replace(/\/+$/, "");
const TIMEOUT_S = Number(arg("--timeout", "300"));

const head = execSync("git rev-parse HEAD").toString().trim();
console.log(`local HEAD : ${head}`);
console.log(`target     : ${BASE}/api/health`);

const deadline = Date.now() + TIMEOUT_S * 1000;
let last = "(never reached)";

while (Date.now() < deadline) {
  try {
    const res = await fetch(`${BASE}/api/health`, { cache: "no-store" });
    const bodyJson = await res.json();
    last = String(bodyJson.commit ?? "absent");
    if (last === head) {
      console.log(`deployed   : ${last}`);
      console.log("OK - production is serving this commit.");
      process.exit(0);
    }
    console.log(`deployed   : ${last}  (waiting...)`);
  } catch (err) {
    console.log(`health unreachable: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 10000));
}

console.error(`
FAIL - after ${TIMEOUT_S}s production still reports "${last}", not ${head}.`);
console.error("The push did NOT reach production. Check for a REFUSED deployment:");
console.error("  npx vercel ls     (is there any deployment for this commit?)");
console.error("A rejected vercel.json (cron schedule, function config) produces no build");
console.error("and no error - the commit simply never ships. Do not report it as live.");
process.exit(1);
