"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isConsoleSurface } from "@/app/_components/site-footer";

/**
 * The ONE site header. Extracted verbatim from the landing's emerald fixed nav
 * so every public surface (landing, /scans/[id], /enterprise*, the customer
 * report) wears identical chrome instead of the old violet Tailwind bar.
 *
 * Styling comes from app/landing.css, whose every rule is scoped under
 * `.aist-landing` — hence the wrapper div. landing.css is imported once in
 * app/layout.tsx so the scoped rules are available on every route.
 *
 * Auth: this component NEVER queries Supabase. /enterprise/report/[token] is an
 * unauthenticated, token-gated customer page and must render fine anonymously.
 * The server layout resolves the session and passes the sign-out control in as
 * a slot (`signOut`), which is simply absent for anonymous visitors.
 */
export function SiteNav({ signOut }: { signOut?: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Fixed-nav scroll state (ported from soul-site.js via RevealScripts): solid
  // backdrop appears as soon as content scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The console (/command-center*) ships its own sidebar shell and its gate
  // (/auth/login) is a private admin surface — neither wears the public chrome.
  if (isConsoleSurface(pathname)) return null;

  // Section anchors live on the landing. Off "/" they must be absolute so the
  // link navigates home first instead of hunting for a missing #id.
  const base = pathname === "/" ? "" : "/";

  return (
    <div className="aist-landing">
      <nav className={scrolled ? "nav scrolled" : "nav"} data-nav>
        <div className="nav-in">
          <a href="https://thesoulsofai.com" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/thesoulsofai_watermark.png" alt="The Souls of AI" />
            <span>
              AI Sec <b>Tester</b>
            </span>
          </a>
          {/* CSS-only mobile hamburger (checkbox hack — no client JS) */}
          <input type="checkbox" id="nav-toggle" className="nav-toggle" aria-hidden="true" />
          <label htmlFor="nav-toggle" className="nav-burger" aria-label="Open menu">
            <span />
            <span />
            <span />
          </label>
          <div className="nav-links">
            <a href={`${base}#how`}>How it works</a>
            <a href={`${base}#checks`}>What we check</a>
            <a href={`${base}#pricing`}>Pricing</a>
          </div>
          <div className="nav-cta">
            <a href={`${base}#pricing`} className="btn btn-accent" style={{ padding: "11px 20px" }}>
              Scan my chatbot
            </a>
            {signOut}
          </div>
        </div>
      </nav>
    </div>
  );
}

/**
 * The nav is `position: fixed` at 70px tall, so in-flow page content would slide
 * underneath it. The landing's hero already carries its own 150px top padding,
 * and console surfaces render no nav at all — every other route gets the offset.
 */
export function SiteNavOffset({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const needsOffset = pathname !== "/" && !isConsoleSurface(pathname);
  return <div className="flex-1" style={needsOffset ? { paddingTop: 70 } : undefined}>{children}</div>;
}
