-- 0022_advisory_disclosure.sql
-- Customer control disclosure for the three OWASP categories no external scan can
-- reach: LLM03 supply chain, LLM04 data/model poisoning, LLM08 vector store.
--
-- Shape: { "<control_id>": "yes" | "no" | "unknown", ... }  (see lib/advisory-review.ts)
--
-- NULL is meaningful and is the default: it means NOT DISCLOSED, which renders as
-- ADVISORY exactly as before this column existed. An absent control inside the object
-- is likewise never treated as a pass. Additive and nullable, so every existing row
-- and every caller that does not send it keeps working unchanged.
alter table public.scan_requests
  add column if not exists advisory_disclosure jsonb;

comment on column public.scan_requests.advisory_disclosure is
  'Customer-attested control answers for OWASP LLM03/04/08. Self-reported, NEVER independently verified - see lib/advisory-review.ts. Must never feed the probe score.';
