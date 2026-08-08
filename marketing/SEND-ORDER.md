# AIST marketing - SEND ORDER (Creator executes; Nova cannot)

Everything below is WRITTEN and STAGED. Nova cannot transmit any of it: public posting, outbound
email and DMs are Live gate 1, STOP_REQUIRED, and that gate exists precisely so an automated agent
never publishes on Creator's behalf. This file makes the send a short, ordered task instead of a
research task.

## Before anything goes out - 3 decisions, ~5 minutes

| # | Decision | Why it blocks | Where it lands |
|---|---|---|---|
| 1 | Refund / guarantee terms, or "none" | No policy exists anywhere in code. Copy currently says nothing rather than inventing one | landing-copy.md FAQ, email 2 |
| 2 | Review-time SLA, or "no SLA" | The approval step is MANUAL. Promising "within 24h" is unenforceable | landing-copy.md, email-outreach.md |
| 3 | Which of the 5 headlines ships | Only affects the landing page | landing-copy.md |

Any promise made here must be one the pipeline can keep. A form that promised an email it never
sent is already on this workspace's record (T-20260713-73).

## Order to send, highest leverage first

**1. Landing page copy** - `marketing/landing-copy.md`
Not a "send" at all: it replaces copy on a page that already exists and already converts to a
working checkout. Costs nothing, risks nothing, and every later channel points at it. Do this first.
Route it to whoever edits `app/_components/landing.tsx`.

**2. The sample report** - `marketing/sample-report-spec.md`
The revenue audit ranked this the highest-value MISSING asset: nobody spends $197 without seeing
what they get. It is a SPEC, not a PDF - the file has to be produced from a real scan against a
target Creator owns, then redacted per section 4. Until it exists, do not promise it anywhere.

**3. Technical-forum posts** - `marketing/launch-posts.md`, the 5 HN/Reddit ones
Each leads with a genuine LLM-security finding and mentions the product in one line. Post ONE, to
ONE forum, and read the response before posting another. A promotional post buried on HN costs more
than the traffic it would have earned.

**4. LinkedIn + X** - `marketing/launch-posts.md`, 10 posts
Lower risk than the forums. Space them; do not dump ten in a day.

**5. Email sequences** - `marketing/email-outreach.md`
The 4-email "requested but did not pay" sequence goes to a REAL list of people who asked for a scan.
Send only to people who actually requested one. The 3-email cold nurture needs a list that does not
exist yet - do not send it until it does.

**6. SEO articles** - `marketing/seo-content-plan.md`
12 titles, each with the one thing it must contain to be useful. Slowest channel, start last, but
it compounds and the others do not.

## What Nova already did that removes the usual blockers

- The site's soft-404 is fixed in source: a Firebase catch-all rewrite served the 404 body with
  HTTP 200, so robots.txt and sitemap.xml did not really exist. Also added robots.txt (AI crawlers
  allowed), a sitemap and Organization + WebSite JSON-LD. All SOURCE ONLY - `firebase deploy` is
  gated, so this is unverified in production until Creator deploys.
- The paid pipeline was re-derived live and is armed: request, approval, payment link, Stripe
  webhook, auto-dispatch, PDF delivered. Nothing in it is broken. The missing input was always traffic.

## The honest constraint

Nova can write, stage, verify and order this. Nova cannot press send, and should not be able to.
Every item above is one human action away from live.
