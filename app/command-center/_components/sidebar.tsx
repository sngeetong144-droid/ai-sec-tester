"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { COLORS } from "@/app/command-center/_ui";
import type { Counts } from "@/app/command-center/_data";

/**
 * Fixed 242px console sidebar (PRD SIDEBAR NAV). Client component only because it
 * highlights the active link via usePathname; counts are computed server-side and
 * passed in. Nav order is exact per the PRD navItems[].
 */

interface NavItem {
  label: string;
  href: string;
  count?: number;
}

export function Sidebar({ counts }: { counts: Counts }) {
  const pathname = usePathname();

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: "Monitor",
      items: [
        { label: "Overview", href: "/command-center" },
        { label: "Workflow", href: "/command-center/workflow" },
      ],
    },
    {
      title: "Pipeline",
      items: [
        { label: "Intake queue", href: "/command-center/intake", count: counts.intake },
        { label: "Approval queue", href: "/command-center/approval", count: counts.approval },
        { label: "Scan cases", href: "/command-center/cases", count: counts.scanning },
        { label: "Report history", href: "/command-center/reports" },
      ],
    },
    {
      title: "Records",
      items: [
        { label: "Customers & tests", href: "/command-center/customers" },
        { label: "Disclosure records", href: "/command-center/disclosure", count: counts.disclosure },
        { label: "Audit log", href: "/command-center/audit" },
      ],
    },
    {
      title: "Configuration",
      items: [
        { label: "Email automations", href: "/command-center/emails" },
        { label: "Products & links", href: "/command-center/products" },
        { label: "Gate status", href: "/command-center/gate" },
        { label: "Access & security", href: "/command-center/security" },
      ],
    },
  ];

  return (
    <aside
      style={{
        width: 242,
        flexShrink: 0,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.cardBorder}`,
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      <div style={{ padding: "20px 18px 12px", fontWeight: 800, fontSize: 15, color: COLORS.ink }}>
        AI Sec Tester
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", color: COLORS.accent, textTransform: "uppercase", marginTop: 2 }}>
          Command Center
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>
        {groups.map((g) => (
          <div key={g.title} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: COLORS.faint,
                padding: "0 10px 6px",
              }}
            >
              {g.title}
            </div>
            {g.items.map((item) => {
              const active =
                item.href === "/command-center"
                  ? pathname === "/command-center"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "7px 10px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? COLORS.accent : COLORS.ink2,
                    background: active ? COLORS.accentBg : "transparent",
                    textDecoration: "none",
                    marginBottom: 1,
                  }}
                >
                  <span>{item.label}</span>
                  {typeof item.count === "number" && item.count > 0 && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: active ? COLORS.accent : COLORS.ink3,
                        background: active ? "rgba(90,69,230,0.14)" : COLORS.inset2,
                        borderRadius: 100,
                        padding: "1px 8px",
                        minWidth: 20,
                        textAlign: "center",
                      }}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 18px 18px", borderTop: `1px solid ${COLORS.hairline}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: COLORS.ink2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 100, background: "#0f9d6b", display: "inline-block" }} />
          All systems connected
        </div>
        <div style={{ fontSize: 11, color: COLORS.ink3, marginTop: 6, lineHeight: 1.4 }}>
          Open access during build. Locks behind admin login + MFA before production.
        </div>
      </div>
    </aside>
  );
}
