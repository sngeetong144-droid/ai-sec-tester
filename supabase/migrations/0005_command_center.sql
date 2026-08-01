-- Sprint — Command Center data layer.
-- Additive only. APPLIED in prod as 20260710124121_0005_command_center
-- [VERIFIED: Supabase list_migrations, 2026-08-01].
--
-- The console's single source of truth is a CASE record that threads an intake
-- (scan_requests) through approval -> payment -> scan (scans) -> report ->
-- disclosure. We REUSE scan_requests (PII + triage + jurisdiction) and scans
-- (engine results) — cc_cases only holds the console-mutation state the 6-value
-- case machine drives (lib/command-center/state.ts). No intake/scan columns are
-- duplicated here.
--
-- All three tables below are SERVICE-ROLE ONLY: RLS is enabled with NO policies,
-- so the public anon/authenticated keys can neither read nor write them (same
-- lock-down as scan_requests, migration 0004). The console reads/writes through
-- the service-role client in lib/command-center/queries.ts.

-- ── cc_cases — the joined lifecycle record ───────────────────────────────────
create table if not exists public.cc_cases (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- intake source (reused; not duplicated)
  scan_request_id     uuid references public.scan_requests (id) on delete set null,
  tier                text,
  -- case state machine (6 values — must match CASE_STATUS in state.ts)
  status              text not null default 'intake'
                        check (status in ('intake','approval','approved','scanning','complete','rejected')),
  -- payment gate (set true on activate = Stripe webhook sim)
  paid                boolean not null default false,
  -- scan link (created on activate) + report
  scan_id             uuid references public.scans (id) on delete set null,
  report_delivered_at timestamptz,
  rescan_used         boolean not null default false,
  -- third-party disclosure
  subscribed          boolean not null default false,
  platform            text,
  disclosure_state    text check (disclosure_state in ('informed','requested','pending')),
  -- rejection
  rejection_reason    text
);
create index if not exists cc_cases_status_idx  on public.cc_cases (status);
create index if not exists cc_cases_created_idx on public.cc_cases (created_at desc);

drop trigger if exists cc_cases_updated_at on public.cc_cases;
create trigger cc_cases_updated_at
  before update on public.cc_cases
  for each row execute function update_updated_at_column(); -- defined in 0002

-- ── cc_audit_log — append-only case audit trail ──────────────────────────────
-- Distinct from scan_audit_log (which is scan/target-centric). This is keyed on
-- the case and carries the console event types (REQUEST_APPROVED, GATE_ACTIVATED,
-- REPORT_DELIVERED, REQUEST_REJECTED, DISCLOSURE_REQUESTED, ...). Append-only is
-- guaranteed by having no update/delete policy — nothing but the service role
-- can touch it, and the app never issues an update or delete against it.
create table if not exists public.cc_audit_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  case_id     uuid references public.cc_cases (id) on delete set null,
  event_type  text not null,
  detail      text,
  ref         text
);
create index if not exists cc_audit_log_case_idx on public.cc_audit_log (case_id);

-- ── cc_email_log — email automations sent log ────────────────────────────────
-- One row per email the console fires (approval / reject / report / disclosure).
-- Composition/SES send lives in the send route; this is the recorded history the
-- automations view reads back.
create table if not exists public.cc_email_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  case_id     uuid references public.cc_cases (id) on delete set null,
  kind        text not null check (kind in ('approval','reject','report','disclosure')),
  to_email    text,
  subject     text,
  body        text
);
create index if not exists cc_email_log_case_idx on public.cc_email_log (case_id);

-- ── Row Level Security — service-role only (no anon/authenticated policies) ───
alter table public.cc_cases     enable row level security;
alter table public.cc_audit_log enable row level security;
alter table public.cc_email_log enable row level security;
