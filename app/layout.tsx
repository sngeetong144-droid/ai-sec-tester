import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
