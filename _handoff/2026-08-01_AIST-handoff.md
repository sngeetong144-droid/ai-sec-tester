# AIST handoff — 2026-08-01 (session 2)

> Supersedes the Aug-1 content written into `2026-07-29_AIST-handoff.md`. That file
> was updated on Aug 1 rather than a new dated file being cut, which broke the
> "newest dated file = current state" rule. Fixed here.

## Status
Queue concurrency BUILT locally, NOT applied to prod. Money path unchanged and still working.

## Shipped this session (local, all gates green)
- **Atomic queue-claim** — `supabase/migrations/0009_scan_request_claim.sql` (`claimed_at`,
  `claimed_by`, composite index). TTL-based, not boolean: a platform kill can never write a
  release, so a boolean would strand rows exactly like the old "running" bug.
  `lib/command-center/claim.ts` + dispatcher wired: claimable-only SELECT, claim-before-run,
  release on any non-dispatch outcome. Fail-closed on query error.
- **storeReportArtifact regression cover** — extracted to `lib/command-center/report-artifact.ts`
  (`run-scan.ts` imports `server-only`, which bun cannot resolve). Pins `application/pdf` + upsert,
  and null-not-throw on upload error and on renderer throw.
- **Queue countdown** — `/command-center/scan` shows depth, draining state, and a live countdown
  to 00:00 UTC. Typechecks; NOT browser-verified.
- **Doc staleness swept** — 8 "report is plain text" claims corrected; `scripts/sync-doc-center.mjs`
  added so the doc-center snapshot cannot silently drift from its sources again.
- **Migration-state claims corrected** — 0004/0005/0006/0007 ARE applied in prod
  [VERIFIED: Supabase list_migrations]. PRD claimed 0007 NOT APPLIED; four source files carried
  stale "NOT YET APPLIED" headers. 0009 is free (registry jumps 0008 to 0010; 0010-0017 belong to
  agenticrm-v2, which shares this Supabase project).

## Proof
typecheck 0 · bun test 181 pass / 0 fail (was 176, +5) · check:contracts 0

## Gates — Creator decision required
1. Apply 0009 to the prod DB (additive, `if not exists`, no backfill). Live gate 4.
2. `/api/chat` cap: `CHAT_IP_MAX_PER_WINDOW` = 10 / 5 min, `lib/rate-limit.ts:18`. Rate-limit
   control = hard gate. Left untouched deliberately. Until raised or allow-listed, self-scans
   return PARTIAL and no self-scan result should be read as a verdict.
3. Deploy. AIST has no standing push exception (that is agenticrm-v2 only).

## Unproven / open
- Self-chaining drain has never run under real burst load.
- Admin bypass positive case needs Creator's signed-in click.
- Countdown not browser-verified.
- Claim tests prove the predicate we SEND and the zero-rows reading; they do not prove
  Postgres-level atomicity. Only a real concurrent run against the DB does that.
- `npm run build` fails locally at HEAD — pre-existing [VERIFIED: stash + rebuild]. Cause:
  `vercel env pull` wrote the Supabase keys as empty strings. Prod unaffected, but local build
  is not a usable gate until the keys are restored.
- Repo working tree carries unrelated pre-existing deletions (stripe skill files, .gitignore).
  A deploy would carry them; review before any commit.

## Next
1. Approve + apply 0009, then verify a real concurrent dispatch.
2. Decide the `/api/chat` cap.
3. Re-verify tier reporting on a scan that actually completes its full check-set.