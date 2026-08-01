/**
 * queue-countdown-render.test.ts - the countdown's actual DOM output.
 *
 * queue-countdown.test.ts covers the two PURE functions. Nothing covered the
 * component, so the handoff carried "countdown not browser-verified" as an open
 * item for days. The live page cannot close it either: /command-center/* sits
 * behind Google admin sign-in.
 *
 * This renders the real component to markup and asserts what a viewer would see.
 * It does NOT prove the 1s interval ticks in a browser - that needs a session.
 *
 * Run: bun test __tests__/queue-countdown-render.test.ts
 */
import { test, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueueCountdown } from "../app/command-center/_components/queue-countdown";

function render(props: { queued: number; draining: boolean; nextRunIso: string }): string {
  return renderToStaticMarkup(createElement(QueueCountdown, props));
}

const FAR = new Date(Date.now() + 3 * 3600_000 + 25 * 60_000).toISOString();

test("renders a paragraph a viewer can actually read", () => {
  const html = render({ queued: 2, draining: false, nextRunIso: FAR });
  expect(html).toContain("<p");
  expect(html).toContain("2 paid scans queued");
  // Guards the guard: an empty render would satisfy most "not contains" checks.
  expect(html.length).toBeGreaterThan(20);
});

test("a waiting queue renders a real hh:mm:ss countdown, not a placeholder", () => {
  const html = render({ queued: 1, draining: false, nextRunIso: FAR });
  expect(html).toContain("1 paid scan queued");
  expect(html).toMatch(/\d{2}:\d{2}:\d{2}/);
  expect(html).toContain("daily cron");
});

test("draining suppresses the countdown in the rendered output", () => {
  const html = render({ queued: 3, draining: true, nextRunIso: FAR });
  expect(html).toContain("draining now");
  // The daily clock is moot while self-chaining; showing it would mislead.
  expect(html).not.toMatch(/\d{2}:\d{2}:\d{2}/);
});

test("an empty queue never renders a countdown", () => {
  const html = render({ queued: 0, draining: false, nextRunIso: FAR });
  expect(html).toContain("queue empty");
  expect(html).not.toMatch(/\d{2}:\d{2}:\d{2}/);
});

test("a deadline already passed renders zeroes, never a negative", () => {
  const past = new Date(Date.now() - 90 * 60_000).toISOString();
  const html = render({ queued: 1, draining: false, nextRunIso: past });
  expect(html).toContain("00:00:00");
  // Not a bare "-" check: the className itself contains hyphens. What must never
  // appear is a NEGATIVE clock.
  expect(html).not.toMatch(/-\d+:\d{2}:\d{2}/);
});

test("suppressHydrationWarning is present, so a clock-skewed first paint is not an error", () => {
  // The server renders a different second than the client; without this the
  // console fills with hydration errors on every console page load.
  const src = require("node:fs").readFileSync(
    require("node:path").join(import.meta.dir, "..", "app", "command-center", "_components", "queue-countdown.tsx"),
    "utf8",
  );
  expect(src).toContain("suppressHydrationWarning");
});