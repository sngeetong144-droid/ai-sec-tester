/**
 * scan-authorization.test.ts — the single scan-execution gate
 * (lib/command-center/admin.ts decideScanAuthorization). Pure logic, no DB.
 * Proves scan execution is denied by default and allowed ONLY for an admin
 * session on an activated + paid case.
 *
 * Run: bun test __tests__/scan-authorization.test.ts
 */
import { test, expect } from "bun:test";
import {
  decideScanAuthorization,
  isAdminEmail,
} from "../lib/command-center/admin";

const activatedPaid = { status: "scanning", paid: true } as const;

test("allows an admin session on an activated + paid case", () => {
  const d = decideScanAuthorization({ isAdmin: true, caseRecord: activatedPaid });
  expect(d.authorized).toBe(true);
});

test("denies an unactivated case even for an admin", () => {
  for (const status of ["intake", "approval", "approved", "complete", "rejected"] as const) {
    const d = decideScanAuthorization({
      isAdmin: true,
      caseRecord: { status, paid: true },
    });
    expect(d.authorized).toBe(false);
  }
});

test("denies a scanning case that is not paid", () => {
  const d = decideScanAuthorization({
    isAdmin: true,
    caseRecord: { status: "scanning", paid: false },
  });
  expect(d.authorized).toBe(false);
});

test("denies a non-admin caller even on an activated + paid case", () => {
  const d = decideScanAuthorization({ isAdmin: false, caseRecord: activatedPaid });
  expect(d.authorized).toBe(false);
});

test("denies when there is no case", () => {
  const d = decideScanAuthorization({ isAdmin: true, caseRecord: null });
  expect(d.authorized).toBe(false);
});

test("fails closed on garbage / non-boolean isAdmin", () => {
  const junk: unknown[] = ["true", 1, {}, null, undefined];
  for (const j of junk) {
    const d = decideScanAuthorization({
      // deliberately bypass the type to prove runtime identity checks hold
      isAdmin: j as boolean,
      caseRecord: activatedPaid,
    });
    expect(d.authorized).toBe(false);
  }
});

test("admin allowlist is deny-by-default and case-insensitive", () => {
  const prev = process.env.ADMIN_EMAILS;
  try {
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("owner@thesoulsofai.com")).toBe(false); // empty allowlist → nobody

    process.env.ADMIN_EMAILS = "owner@thesoulsofai.com, ops@thesoulsofai.com";
    expect(isAdminEmail("OWNER@thesoulsofai.com")).toBe(true);
    expect(isAdminEmail("stranger@example.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
  }
});
