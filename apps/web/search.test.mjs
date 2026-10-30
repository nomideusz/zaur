import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize } from "./search.mjs";

const row = (date, clicks, impressions, position) => ({ keys: [date], clicks, impressions, position });

test("ninety days end on the newest day, a missing day counts as nothing", () => {
  const s = summarize(
    [
      row("2026-08-01", 9, 90, 3), // before the ninety days: left out
      row("2026-09-20", 4, 100, 10), // 31 days back: the 28 before
      row("2026-10-14", 1, 10, 30),
      row("2026-10-15", 2, 30, 10),
      row("2026-10-21", 3, 60, 4.04), // the newest day
    ],
    "2026-10-21",
  );
  assert.equal(s.days.length, 90);
  assert.deepEqual(s.days.at(-1), ["2026-10-21", 3, 60, 4]);
  assert.deepEqual(s.days.at(-2), ["2026-10-20", 0, 0, null]);
  assert.equal(s.days[0][0], "2026-07-24");
  assert.deepEqual(s.now, { clicks: 6, impressions: 100, position: 8.4 }); // (300 + 300 + 240) / 100
  assert.deepEqual(s.before, { clicks: 4, impressions: 100, position: 10 });
});

test("a site nobody saw has no clicks and no position", () => {
  const s = summarize([], "2026-10-21");
  assert.deepEqual(s.now, { clicks: 0, impressions: 0, position: null });
  assert.ok(s.days.every(([, c, i, p]) => c === 0 && i === 0 && p === null));
});
