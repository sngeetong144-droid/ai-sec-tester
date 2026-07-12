-- 0008_scan_attempts.sql — bounded auto-retry for paid scan dispatch
--
-- Adds a per-request attempt counter so the cron dispatcher can retry a
-- transient engine failure a bounded number of times instead of skipping a
-- failed scan forever (a paid customer previously never got a retry — the
-- linked scan sat in 'failed' and every cron tick short-circuited).
--
-- Additive + non-destructive: nullable-free with a default, so existing rows
-- backfill to 0 and old code that ignores the column is unaffected. Safe to
-- apply before the reading code deploys.
alter table public.scan_requests
  add column if not exists scan_attempts int not null default 0;
