-- 0007_scope_scans_rls.sql — lock down scans / scan_results RLS
--
-- ============================================================================
-- ⚠️  DO NOT APPLY YET — THIS BREAKS THE LIVE APP AS-IS. AUTHOR-ONLY. ⚠️
-- ============================================================================
--
-- This migration REPLACES the demo-first anon `using(true) with check(true)`
-- policies on public.scans and public.scan_results (created in
-- 0001_init_scans.sql) with per-owner (auth.uid() = user_id) + service-role
-- access.
--
-- BLOCKING PRECONDITION — read before applying:
--   The app today reads/writes scans and scan_results through the ANON Supabase
--   client with NO logged-in user (demo-first, no auth wall — see CLAUDE.md).
--   Under the policies below, anon is granted NOTHING: there is no anon policy,
--   so every anon insert (executeScan create), update (executeScan reuse),
--   read (dashboard/console), and delete (deleteScan) will fail with an RLS
--   violation the instant this lands. The live demo goes dark.
--
--   BEFORE APPLYING, you MUST move the scans/scan_results data path OFF the anon
--   client and ONTO the SERVICE-ROLE server client (server-only; the service key
--   must never reach the browser) — OR require login and stamp every scan with a
--   real auth.uid() owner. Apply this migration only AFTER that cutover is
--   deployed and verified.
--
--   CUTOVER STATUS (2026-07-11): AUTHORED IN CODE. All scans/scan_results
--   reads/writes now go through the service-role client, each behind an
--   app-level gate: executeScan/deleteScan (admin/cron gate), runAdminSelfScan
--   (admin gate), runEngineAndPersist (callers gate), getScans (identity
--   eq-filter, fail-closed), getScan (callers gate via scanOwnedByCaller /
--   HMAC token / ownership-domain match), auth-callback claim (verified user +
--   own session cookie). That cutover code is UNCOMMITTED as of 2026-07-11.
--
--   MANDATORY APPLY ORDER (violating it breaks live scans mid-run):
--     1. Commit + deploy the service-role cutover (lib/queries.ts,
--        lib/scan-persistence.ts, app/actions/scans.ts,
--        app/actions/admin-scan.ts, app/auth/callback/route.ts).
--     2. Verify a live scan run + Ops Console read against production.
--     3. ONLY THEN apply this migration. Applying first drops
--        "demo public access on scan_results" while deployed code still
--        inserts scan_results via the anon client → scans stuck in
--        'running' with silently-empty reports.
--
--   Live policy drift note: the live scans table does NOT carry the 0001
--   policy name; it carries out-of-band "anon session access" and "auth users
--   own scans" (see drops below). Both are dropped explicitly.
--
-- Owner column note: public.scans has no user_id column in the committed
-- migrations (0001 never added one; the app writes user_id at runtime). This
-- migration adds it idempotently so the owner policy is valid on a clean DB.
-- Non-destructive: nullable, no backfill, existing rows keep user_id = NULL
-- (and therefore become service-role-only until an owner is set — intended).

-- ── ensure the owner column exists (idempotent, non-destructive) ─────────────
alter table public.scans
  add column if not exists user_id uuid references auth.users (id);

create index if not exists scans_user_idx on public.scans (user_id);

-- ── RLS stays enabled ────────────────────────────────────────────────────────
alter table public.scans        enable row level security;
alter table public.scan_results enable row level security;

-- ── scans: per-owner (authenticated) + service-role ──────────────────────────
-- Drop ALL known-live and migration-defined anon/legacy policies. Live DB
-- (xgpywicrgcqnmkvahoke, pg_policies verified 2026-07-11) carries out-of-band
-- policies "anon session access" (anon, ALL, using true) and "auth users own
-- scans" (authenticated) — NOT "demo public access on scans". Dropping only
-- the 0001 name would be a silent no-op and leave anon with full table access.
drop policy if exists "demo public access on scans" on public.scans;
drop policy if exists "anon session access"         on public.scans;
drop policy if exists "auth users own scans"        on public.scans;

drop policy if exists "scans owner access" on public.scans;
create policy "scans owner access"
  on public.scans for all
  to authenticated
  using      (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- service_role bypasses RLS, but an explicit policy documents the intended
-- server-side full-access path (the client the app must migrate to).
drop policy if exists "scans service role access" on public.scans;
create policy "scans service role access"
  on public.scans for all
  to service_role
  using (true) with check (true);

-- ── scan_results: owner via parent scan + service-role ───────────────────────
-- scan_results has no user_id; ownership is derived from the parent scan.
drop policy if exists "demo public access on scan_results" on public.scan_results;

drop policy if exists "scan_results owner access" on public.scan_results;
create policy "scan_results owner access"
  on public.scan_results for all
  to authenticated
  using (
    exists (
      select 1 from public.scans s
      where s.id = scan_results.scan_id
        and s.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.scans s
      where s.id = scan_results.scan_id
        and s.user_id = (select auth.uid())
    )
  );

drop policy if exists "scan_results service role access" on public.scan_results;
create policy "scan_results service role access"
  on public.scan_results for all
  to service_role
  using (true) with check (true);
