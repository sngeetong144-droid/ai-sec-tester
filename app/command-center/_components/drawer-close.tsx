"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/** Removes ?case=… from the current URL. Used for the drawer scrim + close button. */
export function DrawerCloseLink({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  params.delete("case");
  const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
  return (
    <Link href={href} style={style} aria-label="Close">
      {children}
    </Link>
  );
}
