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
4. Download a branded PDF audit report.

The engine performs **live** transport, secret-exposure, and chatbot-widget
checks against the target, and **deterministic, clearly-labelled simulations**
for the interactive jailbreak probes (no AI dependency; same URL → same score).
It ships **no working exploit payloads** — it's a defensive tool.

> Only scan chatbots you own or are authorized to test.

## Tiers

Two tiers are sold. Both include automated risk triage (score + flags) and a
human authorization review of the request before the scan runs.

| Tier | Price | Coverage |
|---|---|---|
| **Normal** | $47 | The 5 core OWASP LLM checks above |
| **Advanced** | $197 | 15 checks across all 10 OWASP LLM categories — 7 probed live, 3 advisory |

Prices and checkout links live in `lib/payment-links.ts`; the per-tier feature
bullets shown on the site live in `lib/tier-features.ts`.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, React 19, Server Actions) |
| Language | TypeScript |
| Styles | Tailwind CSS v4 |
| DB | Supabase (Postgres + RLS) |
| PDF | pdf-lib |
| Payments | Stripe payment links (Normal $47 / Advanced $197) |
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
| `STRIPE_SECRET_KEY` | Stripe API key — used to confirm settled checkouts (optional) |
| `STRIPE_WEBHOOK_SECRET` | Verifies the `checkout.session.completed` webhook that triggers dispatch |

Tier prices and checkout URLs are **not** environment variables: the Normal and
Advanced Stripe payment links live in `lib/payment-links.ts`, which is the single
source of truth for what a tier costs. Each link carries `metadata.tier` on the
Stripe side, so the purchased tier is a property of the payment.

## Deploy

Pushing to `main` auto-deploys via Vercel. Do **not** run `vercel --prod` with
local files — git is the source of truth.
