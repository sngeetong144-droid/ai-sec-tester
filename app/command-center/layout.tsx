import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/command-center/access";

// Private admin console: never indexed, never linked from the public site.
// Belt-and-braces with robots.ts (disallow) and middleware (X-Robots-Tag).
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function CommandCenterLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
