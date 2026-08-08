import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
// Every rule in landing.css is scoped under `.aist-landing`, so importing it at
// the root is inert for other markup — it only lights up the shared SiteNav (and
// the landing itself), which is what makes one nav possible on every route.
import "./landing.css";
import { Analytics } from "@vercel/analytics/next";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/login/actions";
import { SiteFooter } from "@/app/_components/site-footer";
import { SiteNav, SiteNavOffset } from "@/app/_components/site-nav";
import { GoogleAnalytics } from "@/app/_components/google-analytics";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

const SITE_URL = "https://scan.thesoulsofai.com";
const DESCRIPTION =
  "Scan your AI chatbot for prompt-injection & jailbreak flaws. Run OWASP LLM Top-10 aligned checks and get a Pass/Fail security scorecard with remediation guidance in seconds.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Sec Tester — Scan your chatbot for prompt-injection flaws",
    template: "%s — AI Sec Tester",
  },
  description: DESCRIPTION,
  keywords: [
    "chatbot security scanner",
    "prompt injection testing",
    "LLM jailbreak testing",
    "OWASP LLM Top 10",
    "AI security assessment",
    "prompt injection scanner",
    "system prompt leakage",
    "LLM red teaming",
  ],
  applicationName: "AI Sec Tester",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    title: "AI Sec Tester — Scan your chatbot for prompt-injection flaws",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "AI Sec Tester",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "AI Sec Tester — AI Chatbot Security Scanner" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Sec Tester — Scan your chatbot for prompt-injection flaws",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${jakarta.className} antialiased bg-[#F0EEFF] text-slate-800 flex flex-col min-h-screen`}
      >
        {/* The ONE site header — the emerald fixed nav, on every public route.
            SiteNav suppresses itself on the console surfaces (/auth/login and
            /command-center**), which ship their own chrome. The sign-out control
            is passed in as a slot so the nav never has to touch Supabase: the
            token-gated customer report is unauthenticated and must render for
            anonymous visitors. */}
        <SiteNav
          signOut={
            user ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="btn btn-ghost"
                  style={{ padding: "10px 18px", fontSize: 14.5 }}
                >
                  Sign out
                </button>
              </form>
            ) : null
          }
        />

        {/* Page content — offset below the 70px fixed nav where one is shown. */}
        <SiteNavOffset>{children}</SiteNavOffset>

        {/* Site footer — suppressed on the public landing ("/"), which ships its own. */}
        <SiteFooter />
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
