# Claude Code prompt — integrate updated scan-request landing page

Copy the prompt below into Claude Code, run from the `AI Sec Tester` repo root.
This package folder contains the 4 static files (already updated — treat them as the source of truth).

---

## PROMPT (copy from here)

I have an updated static landing page package in a folder called `handoff_landing_form/`
(files: `ai-security-scanner.html`, `site.css`, `soul-site.js`, `assets/thesoulsofai_watermark.png`).
It's the public scan-request landing page for scan.thesoulsofai.com. Integrate it into this Next.js app:

1. **Serve the static page as-is.** Move the 4 files into `public/` preserving relative paths
   (`public/ai-security-scanner.html`, `public/site.css`, `public/soul-site.js`,
   `public/assets/thesoulsofai_watermark.png`). Verify it renders at `/ai-security-scanner.html`
   with styles, watermark image, and the `#request` form working.

2. **Wire the form's submit to a real endpoint.** The form's inline script currently has a TODO
   and only writes a local `rec` object. Create `app/api/scan-request/route.ts` (POST) and change
   the inline script to POST `rec` as JSON to it. The payload now includes these NEW fields
   (added for jurisdiction due diligence — do not drop them):
   - `countryDeclared` (ISO code from the required "Country of residence" select)
   - `countryDeclaredName`
   - `browserTimezone` (from `Intl.DateTimeFormat().resolvedOptions().timeZone`)
   - `browserLocale` (from `navigator.language`)
   - `dueDiligenceConsent: true` (new required checkbox)

3. **Server-side cross-check (the important part).** In the new route, reuse the existing libs:
   - Resolve the requester's IP country (same lookup used by `lib/jurisdiction-policy.ts` /
     `assertJurisdictionAllowed`). Never trust `countryDeclared` alone — and never trust IP alone
     either: a sanctioned-country user can submit through a US VPN.
   - Apply the STRICTER of declared country vs IP country against the existing sanctions /
     license-restricted lists in `lib/jurisdiction-policy.ts`.
   - Add a mismatch check: if declared country ≠ IP country, or the IP is a datacenter/VPN/proxy
     ASN, or `browserTimezone`/`browserLocale` conflict with the declared country (e.g. declared
     US + `Asia/Pyongyang` timezone), do NOT auto-approve: mark the request status
     `due_diligence_hold` and add a triage flag (extend `lib/triage.ts` flags with
     `PROXY_DETECTED` / `GEO_SIGNAL_CONFLICT`). Sanctioned hits still auto-reject.
   - Persist everything (declared + resolved country, tz, locale, consent, IP, user-agent,
     timestamp) with the request record and write an audit-log entry via `lib/audit-log.ts`.

4. **Keep consistency with the existing compliance gate.** `app/_components/compliance-gate.tsx`
   already has a country-of-residence selector and OFAC/license lists — reuse its country list and
   blocked-country logic on the server route rather than duplicating constants; lift shared
   constants into `lib/jurisdiction-policy.ts` if needed.

5. Add/extend tests in `__tests__/` for the new route: declared-vs-IP mismatch → hold,
   sanctioned declared country → reject, sanctioned IP with clear declared country → reject,
   clear match → pending intake.

Do not redesign the page or change its copy/styling — only wire the submit and the server logic.

## END PROMPT
