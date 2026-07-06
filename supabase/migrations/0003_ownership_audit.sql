-- Sprint 2 — SAFE guardrail: prove domain ownership + append-only audit trail.
-- Additive only. Active scans (local/deep) gate on a verified ownership token.

-- ── ownership_tokens ─────────────────────────────────────────────────────────
create table if not exists public.ownership_tokens (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  email          text,
  target_domain  text not null,
  challenge_type text not null default 'dns_txt'
                   check (challenge_type in ('dns_txt','well_known')),
  token          text not null,
  verified_at    timestamptz,
  proof_hash     text,
  -- Ties a proof to whoever requested it, so a leaked/guessed proof_id can't be
  -- reused by someone else (demo has no login wall, so anon session_id covers
  -- the unauthenticated case; user_id covers the logged-in case).
  user_id        uuid references auth.users (id),
  session_id     text
);
create index if not exists ownership_tokens_domain_idx on public.ownership_tokens (target_domain);

-- ── scan_audit_log (append-only) ─────────────────────────────────────────────
create table if not exists public.scan_audit_log (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  scan_id            uuid,
  email              text,
  target_url         text not null,
  tier               text,
  ownership_proof_id uuid references public.ownership_tokens (id) on delete set null,
  result_hash        text
);
create index if not exists scan_audit_log_scan_idx on public.scan_audit_log (scan_id);

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.ownership_tokens enable row level security;
alter table public.scan_audit_log   enable row level security;

-- CRITICAL fix: anon previously had "for all using(true) with check(true)",
-- which let the public anon key UPDATE verified_at/proof_hash directly and
-- self-certify ownership of any domain. Anon now gets INSERT only; reads are
-- service-role only (mirrors scan_requests/scan_audit_log). A broad SELECT
-- policy would have let anyone holding the public anon key read every row
-- (email, target_domain, DNS token, verified_at, user_id/session_id) over
-- REST. verified_at/proof_hash are stamped exclusively by the service-role
-- client inside /api/ownership/verify, after the real DNS/well-known check
-- passes. No update/delete/select policy for anon/authenticated → the whole
-- table is opaque from the client's perspective, and app reads go through the
-- service-role client (challenge/verify routes, lib/queries getVerifiedOwnership).
drop policy if exists "anon manage ownership_tokens" on public.ownership_tokens;

drop policy if exists "anon insert ownership_tokens" on public.ownership_tokens;
create policy "anon insert ownership_tokens"
  on public.ownership_tokens for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anon select ownership_tokens" on public.ownership_tokens;

-- HIGH fix: scan_audit_log stored email + target_url per scan and was
-- readable by anyone holding the public anon key. Insert stays open (the
-- append-only guarantee only needs no update/delete policy); reads are
-- service-role only (see lib/queries.ts getScanWithAudit).
drop policy if exists "anon insert scan_audit_log" on public.scan_audit_log;
create policy "anon insert scan_audit_log"
  on public.scan_audit_log for insert
  to anon, authenticated
  with check (true);

drop policy if exists "anon read scan_audit_log" on public.scan_audit_log;
