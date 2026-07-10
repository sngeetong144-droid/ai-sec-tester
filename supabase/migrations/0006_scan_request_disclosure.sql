-- Scan-request intake — third-party-disclosure + client geo + payment lifecycle.
-- ADDITIVE ONLY. Extends scan_requests (migration 0004) to the §2.1 shape.
-- Every statement is idempotent (ADD COLUMN IF NOT EXISTS / CREATE ... IF NOT
-- EXISTS / DROP CONSTRAINT IF EXISTS). No column is ever dropped or renamed.
--
-- NOT YET APPLIED — applying to the live DB is a gated deploy step.
--
-- NAMING NOTE (flagged for reconciliation, NOT silently resolved): the §2.1
-- target names `name` and `declared_country` already exist on the table under
-- `full_name` and `country_declared` (migration 0004). Renaming would break every
-- caller (app/api/scan-request/route.ts, lib/jurisdiction-review.ts), so those two
-- columns are LEFT AS-IS and NO duplicate is added. Callers keep using the 0004
-- names; the §2.1 names are satisfied semantically by the existing columns.

-- ── third-party disclosure (design: subscribedSelect + disclosure block) ──────
alter table public.scan_requests add column if not exists subscribed_platform boolean not null default false;
alter table public.scan_requests add column if not exists provider_name        text;
alter table public.scan_requests add column if not exists provider_notify_ref  text;
alter table public.scan_requests add column if not exists provider_notified    boolean not null default false;

-- ── client-side geo preview (soft UX signal; server re-resolves independently) ─
-- Stored as-submitted for the audit trail. The authoritative jurisdiction check
-- still runs server-side in route.ts + lib/jurisdiction-review.ts — these are the
-- client's best-effort ipapi.co/dns.google readouts, never trusted for the gate.
alter table public.scan_requests add column if not exists requestor_geo jsonb;
alter table public.scan_requests add column if not exists target_geo    jsonb;

-- ── payment + report lifecycle ───────────────────────────────────────────────
alter table public.scan_requests add column if not exists rejection_reason           text;
alter table public.scan_requests add column if not exists stripe_client_reference_id text;
alter table public.scan_requests add column if not exists payment_link_sent_at       timestamptz;
alter table public.scan_requests add column if not exists report_url                 text;
alter table public.scan_requests add column if not exists updated_at                 timestamptz not null default now();

-- ── status CHECK — union of the existing 0004 values and the §2.1 lifecycle ───
-- CONFLICT FLAGGED: 0004 constrains status to (pending|due_diligence_hold|
-- rejected|approved); §2.1 wants (pending_review|approved_awaiting_payment|
-- paid_scanning|complete|rejected). These are two different lifecycle vocabularies
-- and live code (jurisdiction-review.ts) still writes the 0004 values. Narrowing to
-- only the §2.1 set would break those inserts, so this migration UNIONS both sets:
-- additive and non-breaking. Reconcile to a single vocabulary before go-live.
alter table public.scan_requests drop constraint if exists scan_requests_status_check;
alter table public.scan_requests add constraint scan_requests_status_check
  check (status in (
    -- 0004 (in use today)
    'pending', 'due_diligence_hold', 'approved', 'rejected',
    -- §2.1 payment lifecycle
    'pending_review', 'approved_awaiting_payment', 'paid_scanning', 'complete'
  ));

-- ── indexes (§2.1: index stripe_client_reference_id and status) ───────────────
-- status index already exists as scan_requests_status_idx (migration 0004).
create index if not exists scan_requests_stripe_ref_idx
  on public.scan_requests (stripe_client_reference_id);

-- ── updated_at auto-touch (reuses update_updated_at_column() from migration 0002) ─
drop trigger if exists scan_requests_updated_at on public.scan_requests;
create trigger scan_requests_updated_at
  before update on public.scan_requests
  for each row execute function update_updated_at_column();

-- ── Row Level Security — service-role only (no anon/authenticated policies) ───
-- Idempotent re-assert; 0004 already enabled RLS with zero policies. This table
-- holds PII + disclosure + payment refs; the public anon key can neither read nor
-- write it. All writes go through the service-role client in the server route.
alter table public.scan_requests enable row level security;
