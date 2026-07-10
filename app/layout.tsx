import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/login/actions";

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
        {/* Site header */}
        <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100 px-4 py-3 shrink-0 sm:px-6">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <a
              href="https://thesoulsofai.com"
              className="text-sm font-semibold text-violet-700 hover:text-violet-900 transition-colors"
            >
              ← The Souls of AI
            </a>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
              <a href="/" className="hover:text-slate-600 transition-colors">Scanner</a>
              <a href="/enterprise" className="hover:text-slate-600 transition-colors">Enterprise</a>
              {user && (
                <div className="flex items-center gap-3">
                  <span className="max-w-[45vw] truncate text-slate-500 sm:max-w-none">{user.email}</span>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="rounded-full border border-violet-200 px-3 py-1 text-xs text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1">
          {children}
        </div>

        {/* Site footer */}
        <footer className="bg-white/50 border-t border-violet-100 px-6 py-6 shrink-0">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <a
              href="https://thesoulsofai.com"
              className="text-sm font-semibold text-violet-700 hover:text-violet-900 transition-colors"
            >
              The Souls of AI
            </a>
            <p className="text-xs text-slate-400">
              Checks aligned with OWASP Top-10 for LLM Applications. Only scan chatbots you own or are authorized to test.
            </p>
            <p className="text-xs text-slate-400">© 2026 The Souls of AI</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
