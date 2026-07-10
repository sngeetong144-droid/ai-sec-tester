import type { CSSProperties, ReactNode } from "react";
import type { BadgeKind } from "@/app/command-center/_data";

/**
 * Shared presentational primitives for the console, styled to the "Ops Dashboard
 * v3" design system (PRD DESIGN SYSTEM COLORS / TYPOGRAPHY). Pure server
 * components — no client state. Colors are inline so the console owns its palette
 * without touching the app-wide globals.css.
 */

export const COLORS = {
  ink: "#151321",
  ink2: "#3b3950",
  ink3: "#6d6a83",
  faint: "#a7a49a",
  appBg: "#f8f8f5",
  surface: "#ffffff",
  inset: "#f8f8f5",
  inset2: "#f1f0ec",
  cardBorder: "#e6e4dc",
  hairline: "#efeee8",
  accent: "#5a45e6",
  accentBg: "rgba(90,69,230,0.08)",
  darkCard: "#151321",
} as const;

const BADGE: Record<BadgeKind, { color: string; bg: string }> = {
  ok: { color: "#0f9d6b", bg: "rgba(15,157,107,0.12)" },
  warn: { color: "#a87d1e", bg: "rgba(201,154,46,0.16)" },
  bad: { color: "#e2453d", bg: "rgba(226,69,61,0.10)" },
  info: { color: "#5a45e6", bg: "rgba(90,69,230,0.08)" },
  subtle: { color: "#6d6a83", bg: "#f1f0ec" },
};

export function Badge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  const b = BADGE[kind];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 100,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        color: b.color,
        background: b.bg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 16,
        boxShadow: "0 1px 2px rgba(21,19,33,.04), 0 2px 8px rgba(21,19,33,.05)",
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        color: COLORS.accent,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.ink }}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: COLORS.ink3,
      }}
    >
      {children}
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        fontFamily:
          "var(--font-mono, 'JetBrains Mono'), ui-monospace, SFMono-Regular, monospace",
        fontSize: 12.5,
        color: COLORS.ink2,
      }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      style={{
        border: `1px dashed ${COLORS.cardBorder}`,
        borderRadius: 14,
        padding: "40px 24px",
        textAlign: "center",
        background: COLORS.inset,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.ink2 }}>{title}</div>
      {hint && <div style={{ marginTop: 6, fontSize: 12.5, color: COLORS.ink3 }}>{hint}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: number | string;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <Card style={{ padding: 20 }}>
      <Label>{label}</Label>
      <div
        style={{
          marginTop: 8,
          fontSize: 40,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: accent ?? COLORS.ink,
          fontFamily: "var(--font-head, 'Archivo'), system-ui, sans-serif",
        }}
      >
        {value}
      </div>
    </Card>
  );
  return href ? (
    <a href={href} style={{ textDecoration: "none", display: "block" }}>
      {inner}
    </a>
  ) : (
    inner
  );
}

/** "QUEUED — NOT SENT" honesty tag shown wherever emails surface. */
export function QueuedTag() {
  return <Badge kind="warn">QUEUED — NOT SENT</Badge>;
}
