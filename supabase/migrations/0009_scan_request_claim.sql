-- 0009_scan_request_claim.sql — atomic dispatch claim for scan_requests
--
-- THE RACE THIS CLOSES. The dispatcher selected every `paid_scanning` row, then
-- guarded against a double-run by READING the linked scan's status ("running" →
-- in_flight). Read-then-act is not atomic: two dispatchers (the Vercel cron and a
-- self-chained kick, or two chained kicks) could both read "not running" for the
-- same row and both execute the paid scan. The customer is billed once and
-- scanned twice, and the second run races the first's finalize.
--
-- The in-flight guard NARROWED that window; it never closed it. Only a single
-- conditional UPDATE can, because Postgres serialises concurrent writers on the
-- row: the second UPDATE re-evaluates its WHERE against the winner's committed
-- value and matches zero rows. Zero rows returned IS the "someone else has it"
-- signal — no advisory lock, no extra table, no external queue.
--
-- WHY A TTL AND NOT A BOOLEAN. A plain `claimed boolean` leaks: a platform kill
-- (the 300s maxDuration) can never write the release, so the row would stay
-- claimed forever and the request would be stranded exactly like the "running"
-- bug this replaces. A TIMESTAMP lets the claim EXPIRE, so recovery needs no
-- cleanup job. The TTL lives in code (lib/command-center/claim.ts, CLAIM_TTL_MS)
-- and is deliberately longer than the dispatch route's maxDuration, so a scan
-- that is genuinely still running is never stolen.
--
-- Additive + non-destructive:
--   - both columns are NULLABLE with no default, so every existing row reads as
--     "unclaimed" and no backfill runs;
--   - no drops, no type changes, no rewrites of existing values;
--   - code that ignores these columns is unaffected, so this is safe to apply
--     BEFORE the reading code deploys (and safe to leave applied if it rolls back).
alter table public.scan_requests
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by text;

-- The dispatcher's hot path is "unclaimed-or-expired rows in this status".
-- Composite (status, claimed_at) serves both the batch SELECT and the claiming
-- UPDATE's predicate.
create index if not exists scan_requests_claim_idx
  on public.scan_requests (status, claimed_at);

comment on column public.scan_requests.claimed_at is
  'When a dispatcher claimed this row for execution. NULL = unclaimed. Expires after CLAIM_TTL_MS (lib/command-center/claim.ts) so a platform-killed run self-recovers.';
comment on column public.scan_requests.claimed_by is
  'Opaque id of the dispatcher invocation holding the claim. Diagnostic only — the claim predicate keys on claimed_at.';
