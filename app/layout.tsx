import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Sec Tester — Scan your chatbot for prompt-injection flaws",
  description:
    "Paste your AI chatbot's URL and run 5 standard prompt-injection & jailbreak checks. Get a Pass/Fail security scorecard in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} antialiased bg-[#F0EEFF] text-slate-800 flex flex-col min-h-screen`}>
        {/* Site header */}
        <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100 px-6 py-3 shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <a
              href="https://thesoulsofai.com"
              className="text-sm font-semibold text-violet-700 hover:text-violet-900 transition-colors"
            >
              ← The Souls of AI
            </a>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <a href="/" className="hover:text-slate-600 transition-colors">Scanner</a>
              <a href="/enterprise" className="hover:text-slate-600 transition-colors">Enterprise</a>
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
