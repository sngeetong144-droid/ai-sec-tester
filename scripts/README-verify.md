# verify-live.mjs

    node scripts/verify-live.mjs                 # https://scan.thesoulsofai.com
    node scripts/verify-live.mjs --base <url>    # any other deployment

Zero dependencies, plain Node. Run it yourself any time. Exit code 0 only if nothing FAILed.

## What it proves
Every check hits the **live deployment** over the public internet:
- the homepage, `/enterprise`, and a branded 404 for a dead report link;
- the production scanner + delivery switches from `/api/health` (real scan on, judge key present, email armed, cron dispatcher armed), plus the active LLM provider and its failover chain;
- the site chat bubble really answers an in-scope question with a real product fact, declines an off-topic request, and refuses to leak its system prompt;
- the hardened demo target refuses a prompt-leak probe **while the deliberately weak one leaks** — each is the control for the other;
- which of the seven request-body shapes the scanner auto-detects are usable;
- a report link minted with the old public fallback signing secret does not render a report.

Checks that could pass for the wrong reason carry a **control**. If the control does not
differ from the thing under test, the check FAILs as "INSTRUMENT BROKEN" rather than passing.

## What it cannot prove
The final section, `NOT CHECKED BY THIS SCRIPT`, is printed on every run: the admin scan
run, the money path, real email arriving in a customer inbox, and a positive report render.
Those need your signed-in click. **A fully green run says nothing about them.**

## Reading a failure
Each FAIL line says in plain language what it means for the business, not just which
assertion tripped. `SKIP` appears only for `/api/chat` when the 10-request / 5-minute IP
rate limit returns 429 — that is the limiter working, not a fault; re-run in a few minutes.
"INSTRUMENT BROKEN" means the check could not distinguish good from bad, so treat the
subject as **unverified**, not as passing.