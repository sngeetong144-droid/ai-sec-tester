-- 0020_scan_request_settlement.sql
--
-- NUMBERING HAZARD (why this is 0020 and not 0010):
-- this Supabase project is SHARED. `supabase_migrations.schema_migrations` already
-- contains 0010_store_pricing .. 0017_guest_checkout from the agenticrm CRM merge
-- (see migration `merge_agenticrm_crm_schema_into_db1`), even though this repo's
-- own migrations dir stops at 0009. agenticrm has a pending 0018 and ReadyGRC a
-- pending 0019, so 0020 is the first free number across all three consumers.
-- Check the live registry, not this folder, before numbering the next one.
--
-- NOT YET APPLIED. Applying this is a Creator-gated action (Live gate 4: DB
-- migrations require per-batch approval). Do not run it to "check if it works".
--
-- WHY
-- `scan_requests` records that a payment LINK was sent (payment_link_sent_at) and
-- carries the Stripe correlation id (stripe_client_reference_id), but it has no
-- column recording that money actually ARRIVED. Settlement exists only as a status
-- transition, and status is also writable by hand from the console. The table
-- therefore cannot distinguish a genuinely paid scan from one advanced manually —
-- which is exactly the ambiguity that let five `complete` rows with report URLs
-- read as delivered sales when none of them was a purchase (Creator ruling R-14,
-- 2026-08-01).
--
-- Additive and non-destructive: three nullable columns and one partial index. No
-- existing row changes, no constraint tightened, no data moved. Safe to apply on a
-- live table; safe to leave unapplied.

alter table public.scan_requests
  -- When Stripe told us the checkout settled. NULL = never evidenced as paid.
  add column if not exists paid_at timestamptz,
  -- Gross amount in the smallest currency unit, as reported by Stripe
  -- (amount_total + total_details.amount_discount), so a fully-discounted
  -- checkout is still auditable rather than looking like a zero payment.
  add column if not exists paid_amount_cents integer,
  -- The Stripe Checkout Session id that settled this request. Makes every claimed
  -- sale traceable back to a specific object in the Stripe dashboard, and makes a
  -- duplicate webhook delivery detectable rather than merely idempotent-by-status.
  add column if not exists stripe_session_id text;

comment on column public.scan_requests.paid_at is
  'Set ONLY by the Stripe webhook on a settled checkout.session.completed. A NULL here means the request was never evidenced as paid, whatever its status says.';
comment on column public.scan_requests.paid_amount_cents is
  'Gross settled amount (charge + merchant discount) in the smallest currency unit, from Stripe.';
comment on column public.scan_requests.stripe_session_id is
  'Stripe Checkout Session id that settled this request; the audit link back to the dashboard.';

-- One settlement per Stripe session. A replayed webhook cannot manufacture a
-- second paid request, and two requests cannot claim the same payment.
create unique index if not exists scan_requests_stripe_session_id_key
  on public.scan_requests (stripe_session_id)
  where stripe_session_id is not null;

-- Finding genuinely-paid work without trusting the status text.
create index if not exists scan_requests_paid_at_idx
  on public.scan_requests (paid_at)
  where paid_at is not null;