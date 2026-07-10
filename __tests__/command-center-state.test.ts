/**
 * command-center-state.test.ts — case state machine (lib/command-center/state.ts).
 * Pure logic; no DB. Proves the happy path advances, the rejected path is
 * reachable from intake and approval, terminals are dead-ends, and garbage
 * inputs fail closed.
 *
 * Run: bun test __tests__/command-center-state.test.ts
 */
import { test, expect } from "bun:test";
import { canTransition, CASE_STATUS } from "../lib/command-center/state";

test("happy path advances one step at a time", () => {
  expect(canTransition("intake", "approval")).toBe(true);
  expect(canTransition("approval", "approved")).toBe(true);
  expect(canTransition("approved", "scanning")).toBe(true);
  expect(canTransition("scanning", "complete")).toBe(true);
});

test("rejected is reachable from intake and approval, nowhere else", () => {
  expect(canTransition("intake", "rejected")).toBe(true);
  expect(canTransition("approval", "rejected")).toBe(true);
  expect(canTransition("approved", "rejected")).toBe(false);
  expect(canTransition("scanning", "rejected")).toBe(false);
});

test("terminal states have no successors", () => {
  for (const to of CASE_STATUS) {
    expect(canTransition("complete", to)).toBe(false);
    expect(canTransition("rejected", to)).toBe(false);
  }
});

test("skipping steps and going backwards is denied", () => {
  expect(canTransition("intake", "approved")).toBe(false); // skips approval
  expect(canTransition("approved", "complete")).toBe(false); // skips scanning
  expect(canTransition("scanning", "approved")).toBe(false); // backwards
  expect(canTransition("intake", "intake")).toBe(false); // self-loop
});

test("garbage / non-status inputs fail closed", () => {
  const junk: unknown[] = ["INTAKE", "done", "", null, undefined, 1, {}, ["approval"]];
  for (const j of junk) {
    expect(canTransition(j, "approval")).toBe(false);
    expect(canTransition("intake", j)).toBe(false);
  }
});
