-- ai-sec-tester — core schema
-- Objects (from PRD): scans (a tested chatbot URL + overall verdict/score),
-- scan_results (one row per the 5 prompt-injection tests, each Pass/Fail).
-- Demo-first v1: no auth. RLS enabled with permissive anon policies; the
-- "lock it down" sprint tightens these to per-user (auth.uid() = user_id).

-- ── scans ────────────────────────────────────────────────────────────────────
create table if not exists public.scans (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  -- what was tested
  target_url    text not null,
  target_label  text,
  -- v1 has no login; we still capture an optional email (PRD tracks "user
  -- email accounts") and a per-browser session id to group anonymous demo runs.
  email         text,
  session_id    text,
  -- the user attests they own / are authorized to test this target
  authorized    boolean not null default false,
  -- lifecycle: pending -> running -> complete | failed
  status        text not null default 'pending'
                  check (status in ('pending','running','complete','failed')),
  -- results rollup
  score         int  check (score between 0 and 100),
  tests_total   int  not null default 5,
  tests_passed  int  not null default 0,
  verdict       text check (verdict in ('pass','warn','fail')),
  -- engine notes (reachability, detected widget, etc.)
  summary       text
);

create index if not exists scans_session_idx on public.scans (session_id);
create index if not exists scans_created_idx on public.scans (created_at desc);

-- ── scan_results ─────────────────────────────────────────────────────────────
create table if not exists public.scan_results (
  id           uuid primary key default gen_random_uuid(),
  scan_id      uuid not null references public.scans (id) on delete cascade,
  created_at   timestamptz not null default now(),
  test_key     text not null,
  test_name    text not null,
  category     text,
  severity     text check (severity in ('low','medium','high','critical')),
  status       text not null default 'pending'
                 check (status in ('pending','running','pass','fail')),
  detail       text,   -- what the test checks for
  evidence     text,   -- what was observed on the target
  remediation  text,   -- how to fix if failed
  sort_order   int not null default 0
);

create index if not exists scan_results_scan_idx on public.scan_results (scan_id);

-- ── Row Level Security (demo-first: public access, no auth yet) ───────────────
alter table public.scans        enable row level security;
alter table public.scan_results enable row level security;

drop policy if exists "demo public access on scans" on public.scans;
create policy "demo public access on scans"
  on public.scans for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "demo public access on scan_results" on public.scan_results;
create policy "demo public access on scan_results"
  on public.scan_results for all
  to anon, authenticated
  using (true) with check (true);
