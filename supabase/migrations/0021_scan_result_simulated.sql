-- 0021_scan_result_simulated.sql
--
-- Applied 2026-08-01 on Creator instruction.
--
-- WHY
-- The engine computes, per check, whether the verdict came from a LIVE probe sent
-- to the customer's chat endpoint or from a static/simulated evaluation. It is on
-- the in-memory result object as `simulated` and was dropped on the floor at
-- insert time (lib/scan-persistence.ts), so nothing on disk records it. For a paid
-- security product that means there is no way, after the fact, to prove to a
-- customer that their PASS came from actually attacking their bot. It was
-- recoverable only by string-matching the evidence prose.
--
-- NULLABLE ON PURPOSE. Rows written before this migration genuinely do not know,
-- and backfilling them to false would assert "these were simulated" about scans
-- nothing can vouch for. NULL means unknown and must be read as unknown.

alter table public.scan_results
  add column if not exists simulated boolean;

comment on column public.scan_results.simulated is
  'FALSE = the verdict came from a live probe sent to the target endpoint. TRUE = static/simulated evaluation. NULL = unknown; the row predates 0021 and must NOT be presented as either.';

-- Finding the rows that can actually be defended as live testing.
create index if not exists scan_results_simulated_idx
  on public.scan_results (simulated)
  where simulated is not null;