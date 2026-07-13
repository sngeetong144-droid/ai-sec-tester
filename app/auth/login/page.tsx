import type { Metadata } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import { COLORS } from "@/app/command-center/_ui";
import { signInWithGoogle } from "./actions";

// The gate itself is public, but must never be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// Gate to the Ops Console — wears the console's palette and type, not the public
// site theme (the public chrome is suppressed here by isConsoleSurface).
const head = Archivo({ subsets: ["latin"], weight: ["700", "800"] });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600"] });

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const denied = (await searchParams).denied === "1";

  return (
    <main
      className={body.className}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: COLORS.appBg,
        color: COLORS.ink,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: COLORS.surface,
          border: `1px solid ${COLORS.cardBorder}`,
          borderRadius: 16,
          padding: 32,
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: COLORS.faint,
            marginBottom: 10,
          }}
        >
          Ops Console
        </p>
        <h1
          className={head.className}
          style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 8 }}
        >
          Admin sign in
        </h1>
        <p style={{ fontSize: 14, color: COLORS.ink3, marginBottom: 24 }}>
          The command center is restricted to authorized admins.
        </p>

        {denied && (
          <div
            style={{
              marginBottom: 16,
              borderRadius: 12,
              padding: 14,
              fontSize: 13,
              color: "#e2453d",
              background: "rgba(226,69,61,0.10)",
            }}
          >
            This Google account is not authorized for admin access.
          </div>
        )}

        <form action={signInWithGoogle}>
          <button
            type="submit"
            style={{
              width: "100%",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#ffffff",
              background: COLORS.accent,
              border: "none",
              cursor: "pointer",
            }}
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}
