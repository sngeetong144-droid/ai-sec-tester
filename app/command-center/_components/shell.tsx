import type { ReactNode } from "react";
import { Archivo, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/app/command-center/_components/sidebar";
import { Drawer } from "@/app/command-center/_components/drawer";
import { COLORS, Eyebrow } from "@/app/command-center/_ui";
import { loadCounts, loadCase } from "@/app/command-center/_data";

/**
 * Console shell (PRD LAYOUT): fixed 242px sidebar + scrollable main (max 1080px)
 * + header (eyebrow / h1 / subtitle + admin chip). Each screen wraps its content
 * in <Shell>. When ?case=<id> is present the detail drawer renders over a scrim.
 * Fonts (Archivo / DM Sans / JetBrains Mono) are scoped here so the console owns
 * its type system without touching the app-wide root layout.
 */

const head = Archivo({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-head" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const DATE_LINE = "UTC+8";

export async function Shell({
  eyebrow,
  title,
  subtitle,
  caseParam,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  caseParam?: string;
  children: ReactNode;
}) {
  const counts = await loadCounts();
  const drawerView = caseParam ? await loadCase(caseParam) : null;

  return (
    <div
      className={`${body.className} ${head.variable} ${mono.variable}`}
      style={{ display: "flex", minHeight: "100vh", background: COLORS.appBg, color: COLORS.ink }}
    >
      <Sidebar counts={counts} />

      <main style={{ flex: 1, overflowX: "hidden" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 36px 80px" }}>
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              marginBottom: 22,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Eyebrow>{eyebrow}</Eyebrow>
              <h1
                style={{
                  fontFamily: "var(--font-head), system-ui, sans-serif",
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  margin: "4px 0 0",
                  color: COLORS.ink,
                }}
              >
                {title}
              </h1>
              <div style={{ marginTop: 4, fontSize: 13.5, color: COLORS.ink3 }}>{subtitle}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 100,
                    background: COLORS.accentBg,
                    color: COLORS.accent,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  A
                </span>
                <span style={{ fontSize: 12.5, color: COLORS.ink2 }}>Admin · owner@thesoulsofai.com</span>
                <span style={{ width: 7, height: 7, borderRadius: 100, background: "#0f9d6b" }} />
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 11.5,
                  color: COLORS.ink3,
                  fontFamily: "var(--font-mono), monospace",
                }}
              >
                {DATE_LINE}
              </div>
            </div>
          </header>

          {children}
        </div>
      </main>

      {drawerView && <Drawer view={drawerView} />}
    </div>
  );
}
