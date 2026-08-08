import Script from "next/script";

// GA4 measurement ID is PUBLIC by design (it ships in every page's HTML source),
// so it lives in a NEXT_PUBLIC_ var, not a secret. This is the SAME GA4 property
// ("The Souls of AI") the marketing site reports into, so Creator gets one
// unified funnel from an SEO page through to checkout instead of a blind spot
// at the money step. When the env var is unset (e.g. local dev without Vercel
// env pulled), this renders nothing — no tag, no console error, no broken page.
export function GoogleAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
