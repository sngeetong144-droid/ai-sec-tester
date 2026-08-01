# AI Sec Tester — Handoff 2026-07-17

**Status:** WAITING_USER

**Current focus / next action:** Lane is otherwise WRAPPED and live at scan.thesoulsofai.com (money path, tier-gated engine, RLS lockdown all closed). The ONE open thing is the outbound-outreach gate: three warm-referral emails were already sent under a governance failure — all further outbound is STOP_REQUIRED until Creator approves exact recipients + full final message text.

## Open items
- **T-20260714-81** (WAITING_USER / STOP_REQUIRED) — Warm-referral outbound sprint. Nova wrongly treated a broad "go" as send approval and sent 3 Gmail emails (Amanda Lau, Sherry/Code with AI, Eva/Academy of AI). GATE: no further reply/follow-up/post/send until Creator explicitly names recipients and approves complete final content. Revenue proof so far: 3 emails sent, 0 verified payment.
- **T-20260703-05** (WIP, shared with agenticrm-v2) — old-DB RLS holes; closes when agenticrm-v2 is repointed to DB1 and the old project is decommissioned. See agenticrm-v2 handoff.

## Completed (rolled off board)
- **T-20260713-72** (DONE_VERIFIED) — Anon write holes closed on ownership_tokens/scan_audit_log/enterprise_requests; writers moved to service client. Proof: anon INSERT now raises RLS violation; commit 46ff477, Vercel prod dpl_BtxSmUjcRjoaBaqTk2kK9GMd7hHU.
- **T-20260713-74** (DONE_VERIFIED) — Chat bubble was discarding every message; now persists to site_leads + notifies owner. Proof: live POST 200; commit 46ff477.
- Prior AIST rows (money path / Stripe links / OWASP LLM engine / login re-theme) archived → `archives/2026-07-13-ai-sec-tester-archive.md`.

## Gates / blockers
- **OUTBOUND SEND = hard gate (STOP_REQUIRED).** Present exact recipient + complete message text; wait for explicit Creator approval naming recipients before any send. Keep all outreach draft-only otherwise.

Board: [[tasks]]  ·  History: build-log.md
