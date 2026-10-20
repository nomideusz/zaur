import assert from "node:assert/strict";
import { test } from "node:test";
import { report, source, visits } from "./stats.mjs";

const line = (o) => JSON.stringify({ k: "view", tz: "Europe/Warsaw", lang: "pl", w: 1920, device: "desktop", ...o });

test("owner visits are told apart, old ones by their signature", () => {
  const all = visits(
    [
      line({ t: "2026-10-19T10:00:00Z", id: "old-mine" }), // before the cookie, same signature as a marked one
      line({ t: "2026-10-19T11:00:00Z", id: "old-other", w: 393, device: "phone" }),
      line({ t: "2026-10-20T10:00:00Z", id: "marked", me: 1 }),
      line({ t: "2026-10-20T11:00:00Z", id: "new-other", me: 0, tag: "acme" }),
      JSON.stringify({ k: "end", id: "new-other", secs: 40, depth: 80, clicks: ["mail", "mail"] }),
    ].join("\n"),
  );
  assert.deepEqual(all.map((v) => [v.id, v.mine]), [["new-other", false], ["marked", true], ["old-other", false], ["old-mine", true]]);
  const r = report(all, { days: 7, now: Date.parse("2026-10-20T12:00:00Z") });
  assert.equal(r.visits, 2);
  assert.equal(r.mineCount, 2);
  assert.deepEqual(r.opened, [["mail", 1]]);
  assert.equal(report(all, { tag: "acme" }).visits, 1);
});

test("sources", () => {
  assert.equal(source({ tag: "acme", ref: "google.com" }), "tagged");
  assert.equal(source({}), "direct");
  assert.equal(source({ ref: "www.linkedin.com" }), "social");
  assert.equal(source({ ref: "mail.google.com" }), "mail");
  assert.equal(source({ ref: "www.google.pl" }), "search");
  assert.equal(source({ ref: "gemini.google.com" }), "ai");
  assert.equal(source({ ref: "festivals.zaur.app" }), "own");
  assert.equal(source({ ref: "github.com" }), "other");
});
