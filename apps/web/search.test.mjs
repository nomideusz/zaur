import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize } from "./search.mjs";

const row = (date, clicks, impressions, position) => ({ keys: [date], clicks, impressions, position });

test("weeks end on the newest day, a missing day counts as nothing", () => {
  const s = summarize(
    [
      row("2026-10-01", 4, 100, 10), // 20 days back: third week from the end
      row("2026-10-14", 1, 10, 30), // second week from the end
      row("2026-10-15", 2, 30, 10), // first day of the last week
      row("2026-10-21", 3, 60, 4), // the newest day
    ],
    "2026-10-21",
  );
  assert.equal(s.weeks.length, 12);
  assert.deepEqual(s.weeks.at(-1), ["2026-10-15", 5, 6]); // (10·30 + 4·60) / 90
  assert.deepEqual(s.weeks.at(-2), ["2026-10-08", 1, 30]);
  assert.deepEqual(s.weeks.at(-3), ["2026-10-01", 4, 10]);
  assert.deepEqual(s.weeks[0], ["2026-07-30", 0, null]);
  assert.equal(s.clicks28, 10);
  assert.equal(s.position28, 9.2); // by impressions: (1000 + 300 + 300 + 240) / 200
});

test("a site nobody saw has no clicks and no position", () => {
  const s = summarize([], "2026-10-21");
  assert.equal(s.clicks28, 0);
  assert.equal(s.position28, null);
  assert.ok(s.weeks.every(([, c, p]) => c === 0 && p === null));
});
