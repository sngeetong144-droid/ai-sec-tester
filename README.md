# AI Sec Tester

A front-end security scanner for AI chatbots. Paste your chatbot's public URL,
run 5 standard prompt-injection & jailbreak checks, and get a Pass/Fail security
scorecard — with a downloadable PDF audit report.

Aligned with the [OWASP Top-10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

## What it does

1. Enter a chatbot URL and confirm you're authorized to test it.
2. A live progress bar runs 5 checks:
   - **System Prompt Disclosure** (LLM07)
   - **Prompt Injection / Instruction Override** (LLM01)
   - **Jailbreak & Persona Bypass** (LLM01)
   - **Sensitive Data Exposure** (LLM02)
   - **Unsafe Content Generation** (LLM05)
3. Get a Pass/Fail scorecard, severity, evidence, and remediation per check.
4. Download a PDF audit report, or upgrade to an Enterprise deep scan.

The engine performs **live** transport, secret-exposure, and chatbot-widget
checks against the target, and **deterministic, clearly-labelled simulations**
for the interactive jailbreak probes (no AI dependency; same URL → same score).
It ships **no working exploit payloads** — it's a defensive tool.

> Only scan chatbots you own or are authorized to test.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript |
| Styles | Tailwind CSS v4 |
| DB | Supabase (Postgres + RLS) |
| PDF | pdf-lib |
| Payments | Stripe (optional — Enterprise upsell) |
| Deploy | Vercel (git auto-deploy) |

## Local development

```bash
bun install
vercel env pull .env.local   # or copy .env.example and fill Supabase keys
bun dev                      # http://localhost:3000
```

## Database

Schema lives in `supabase/migrations/`. Two tables: `scans` (a tested URL +
overall verdict/score) and `scan_results` (one row per check). RLS is enabled
with demo-first public policies; tighten to per-user at the "lock it down"
sprint before onboarding real accounts.

## Configuration

| Env var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `STRIPE_SECRET_KEY` | Enables the Enterprise deep-scan checkout (optional) |
| `DEEP_SCAN_PRICE_CENTS` | Deep-scan price in cents (default `49900` = $499) |

Without a Stripe key the upsell button stays visible and reports that payments
aren't configured yet — it goes live the moment `STRIPE_SECRET_KEY` is set.

## Deploy

Pushing to `main` auto-deploys via Vercel. Do **not** run `vercel --prod` with
local files — git is the source of truth.
