import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Scoped Content-Security-Policy — only the origins this app actually loads from.
// No wildcard '*'. Directive-by-directive rationale:
//   script-src  'self' 'unsafe-inline' — Next.js injects un-nonced inline bootstrap
//               & hydration scripts in prod; without a nonce pipeline they need
//               'unsafe-inline'. No external script hosts (Scalendo/Stripe links are
//               plain <a> navigations, not client scripts — no js.stripe.com loaded).
//   style-src   'self' 'unsafe-inline' + fonts.googleapis.com — Next/CSS-in-JS emit
//               inline styles; Google Fonts stylesheet is linked in landing.tsx.
//   font-src    fonts.gstatic.com — where the Google Fonts stylesheet pulls woff2 from.
//   connect-src Supabase (REST + realtime wss) + the client geo-UX probes
//               (ipapi.co, api.ipify.org, dns.google). fetch to /api/* is 'self'.
//   img-src     'self' data: https: — watermark is self; https: kept broad for any
//               remote imagery (low-risk sink; tighten to named hosts if ever needed).
//   frame-ancestors/frame-src/object-src 'none' — this app embeds nothing and must
//               not be embeddable (clickjacking). base-uri/form-action 'self'.
//
// ponytail: 'unsafe-inline' in script-src is the one soft spot — it lets an injected
// inline <script> execute. A nonce-based CSP (per-request nonce in middleware, stamped
// on Next's inline scripts) would let us drop 'unsafe-inline' from script-src and close
// that hole. Upgrade when middleware nonce plumbing exists — do it before this console
// handles real customer PII at volume. Until then robots noindex + admin gate contain it.
const PROD_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ipapi.co https://api.ipify.org https://dns.google",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    // Dev keeps the loose frame-ancestors so the localhost:8787 preview tool can
    // still embed the app; a strict CSP/HSTS would break HMR and the preview iframe.
    const headers = isDev
      ? [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors http://localhost:8787 http://127.0.0.1:8787",
          },
        ]
      : [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: PROD_CSP },
        ];

    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },
};

export default nextConfig;
