-- Scan-request intake + jurisdiction due-diligence (public landing form).
-- Additive only. Backs POST /api/scan-request. No scan or payment happens here;
-- this is the authorization-request record the approval flow acts on.
--
-- APPLIED in prod as 20260706225506_0004_scan_requests
-- [VERIFIED: Supabase list_migrations, 2026-08-01]. The previous "NOT YET
-- APPLIED" header here was stale and had propagated into docs/PRD.md.

create table if not exists public.scan_requests (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  -- intake
  plan                  text,
  full_name             text not null,
  email                 text not null,
  company               text,
  target_url            text not null,
  context               text,
  -- jurisdiction due diligence
  country_declared      text not null,   -- ISO-3166 alpha-2 the user selected
  country_declared_name text,
  ip_address            text,
  ip_country            text,            -- resolved from IP (may be null)
  network_type          text,            -- residential | hosting | vpn | proxy | datacenter | unknown
  browser_timezone      text,
  browser_locale        text,
  due_diligence_consent boolean not null default false,
  -- review outcome
  status                text not null default 'pending'
                          check (status in ('pending','due_diligence_hold','rejected','approved')),
  review_reason         text,
  user_agent            text,
  -- target-side triage snapshot (from lib/triage.ts), plus merged geo flags
  triage_score          int,
  triage_verdict        text,
  triage_flags          jsonb default '[]',
  triage_recommendation text
);

create index if not exists scan_requests_created_idx on public.scan_requests (created_at desc);
create index if not exists scan_requests_status_idx on public.scan_requests (status);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- This row holds PII + due-diligence signals. Writes go through the server route
-- using the service-role client (bypasses RLS), so anon/authenticated get NO
-- policies at all — the public anon key can neither read nor write this table.
alter table public.scan_requests enable row level security;
