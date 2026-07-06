# Code Review — Ownership + Audit Gate (local uncommitted)

**Reviewed:** 2026-07-01 [Claude] · **Branch:** main (uncommitted) · **Scope:** Sprint 2 SAFE guardrail
**Decision:** BLOCK — do not apply migration `0003` to live or deploy until CRITICAL items fixed.

## Summary
The ownership-verification + audit-log gate is well-structured (SSRF guard reused, random tokens, additive migration, honest dev-only local scanner). But the gate that authorizes *active third-party scanning* — the diff's whole purpose — is bypassable two independent ways, and the "immutable" audit log leaks all users' emails/targets to anon. Typecheck passes; the flaws are authz/RLS, not types.

## Findings

### CRITICAL
1. **RLS forges ownership.** `0003_ownership_audit.sql:36-39` grants anon `for all ... using(true) with check(true)` on `ownership_tokens`. The public anon key can therefore `UPDATE ownership_tokens SET verified_at=now(), proof_hash='x'` on any row → any domain "verified" without DNS/well-known proof. Defeats the deep-scan gate entirely. **Fix:** anon gets INSERT + SELECT only; `verified_at`/`proof_hash` writable only server-side (service-role) inside `/api/ownership/verify`. No anon UPDATE policy.
2. **Deep-scan proof not bound to target.** `app/api/deep-scan/route.ts:44-56` requires *a* verified proof to exist but never checks `proof.target_domain` against the scan's actual target. Verify a domain you own → pass that `ownership_proof_id` with a `scanId` pointing at any victim target → gate passes. (Local-scan does this check at `local-scan/route.ts:98`; deep-scan omits it.) This is the exact legal exposure the gate exists to prevent. **Fix:** load the scan, assert `proof.target_domain === extractDomain(scan.target_url)`.

### HIGH
3. **Audit log is world-readable.** `0003:48-52` grants anon SELECT `using(true)` on `scan_audit_log`, which stores `email` + `target_url` for every scan. Anyone with the public anon key reads the full log. **Fix:** remove anon SELECT; reads go through service-role/`getScanWithAudit` server-side only. (Immutability itself is fine — no update/delete policy = denied.)
4. **Proof not tied to a user.** `ownership_tokens` has no `user_id`; `getVerifiedOwnership` looks up by `proof_id` alone. Any holder of a `proof_id` reuses it. Compounds #2. **Fix:** add `user_id`, set it at challenge time, filter by `auth.uid()` in verify/consume.

### MEDIUM
5. **Audit write is fire-and-forget.** `lib/audit-log.ts:13-24` swallows insert errors (`console.error`, never throws). Spec acceptance #4 = "every scan writes an audit record"; a DB error lets the scan/payment proceed with no trail. **Fix:** fail-closed on the deep-scan path (no audit row → no Stripe session), or at minimum surface the failure.
6. **well-known verify TOCTOU.** `ownership-verification.ts:65-72` calls `assertPublicTarget(url)` then `fetch(url)` — DNS can rebind between check and fetch. Dev-gated today, but this code is the prod-intended verifier. **Fix:** resolve once, fetch by pinned IP, or re-assert on the resolved address.

## Validation
| Check | Result |
|---|---|
| Type check (`tsc --noEmit`) | Pass (exit 0) |
| Lint | Skipped |
| Tests | None for new code |
| Build | Skipped (dev server holds `.next`) |

## Note
Local scanner (`/api/local-scan`) is correctly dev-only (404 in prod) and localhost is treated as inherently owned — that part is sound. The CRITICAL items land on the **prod** deep-scan + shared RLS, which is why this blocks deploy, not just the dev path.
