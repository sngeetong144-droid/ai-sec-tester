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
      <body className={`${jakarta.className} antialiased min-h-screen bg-[#F0EEFF] text-slate-800`}>
        <div className="bg-white/70 backdrop-blur-sm border-b border-violet-100 px-6 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <a
              href="https://thesoulsofai.com"
              className="text-sm font-semibold text-violet-700 hover:text-violet-900 transition-colors"
            >
              ← The Souls of AI
            </a>
            <span className="text-xs text-slate-400">AI Security Tools</span>
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}
