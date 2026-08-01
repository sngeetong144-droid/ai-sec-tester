/**
 * queue-countdown.test.ts — the operator-facing queue sentence. Covers the
 * display LOGIC only; the visual render still needs a signed-in click, because
 * /command-center/scan is behind requireAdmin.
 */
import { test, expect } from "bun:test";
import {
  countdownLabel,
  formatCountdown,
} from "../app/command-center/_components/queue-countdown";

test("clamps a passed deadline to zero instead of rendering negatives", () => {
  expect(formatCountdown(-5_000)).toBe("00:00:00");
  expect(formatCountdown(0)).toBe("00:00:00");
});

test("formats hours, minutes and seconds zero-padded", () => {
  expect(formatCountdown(3_661_000)).toBe("01:01:01");
  expect(formatCountdown(23 * 3_600_000 + 59 * 60_000 + 59_000)).toBe("23:59:59");
});

test("an empty queue says so and never shows a countdown", () => {
  const s = countdownLabel(0, false, 5_000);
  expect(s).toBe("0 paid scans queued — queue empty.");
  expect(s).not.toContain("next dispatch");
});

test("singular for exactly one queued scan", () => {
  expect(countdownLabel(1, false, 0)).toContain("1 paid scan queued");
  expect(countdownLabel(2, false, 0)).toContain("2 paid scans queued");
});

test("draining suppresses the daily countdown — it would be misleading", () => {
  const s = countdownLabel(3, true, 3_600_000);
  expect(s).toContain("draining now");
  expect(s).not.toContain("next dispatch");
});

test("a waiting queue shows the countdown to the daily cron", () => {
  expect(countdownLabel(3, false, 3_661_000)).toBe(
    "3 paid scans queued — next dispatch in 01:01:01 (daily cron, 00:00 UTC).",
  );
});
