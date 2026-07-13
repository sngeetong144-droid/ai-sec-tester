"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

// The console (/command-center*) ships its own sidebar+content shell, and its
// gate (/auth/login) is a private admin surface — neither wears the public chrome.
function isConsoleSurface(pathname: string): boolean {
  return (
    pathname === "/command-center" ||
    pathname.startsWith("/command-center/") ||
    pathname === "/auth/login"
  );
}

// Hides the global layout header on the anonymous public landing ("/"), which
// ships its own fixed emerald nav. `active` is false for authenticated users, so
// the authed home view (working scanner) keeps the global header + Sign out.
export function HideOnHome({ active, children }: { active: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  if ((active && isHome) || isConsoleSurface(pathname)) return null;
  return <>{children}</>;
}

// The public landing ("/") ships its own cohesive footer (LandingFooter), so the
// global thin footer is suppressed there to avoid a double footer. Every other
// route (authed dashboard, /enterprise, command-center, …) keeps this footer.
export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  if (isConsoleSurface(pathname)) return null;

  return (
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
  );
}
