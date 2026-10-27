import assert from "node:assert/strict";
import { test } from "node:test";
import { network, report, source, visits } from "./stats.mjs";

const line = (o) => JSON.stringify({ k: "view", tz: "Europe/Warsaw", lang: "pl", w: 1920, device: "desktop", ...o });

test("owner visits are told apart, old ones by their signature", () => {
  const all = visits(
    [
      line({ t: "2026-10-19T10:00:00Z", id: "old-mine" }), // before the cookie, same signature as a marked one
      line({ t: "2026-10-19T11:00:00Z", id: "old-other", w: 393, device: "phone" }),
      line({ t: "2026-10-20T10:00:00Z", id: "marked", me: 1 }),
      line({ t: "2026-10-20T11:00:00Z", id: "new-other", me: 0, tag: "acme" }),
      line({ t: "2026-10-20T11:30:00Z", id: "phone-before", me: 0, tz: "Europe/Warsaw", lang: "en-GB", w: 393, device: "phone" }),
      line({ t: "2026-10-20T11:31:00Z", id: "stats-opened", k: "owner", lang: "en-GB", w: 393, device: "phone" }), // /stats on that phone
      JSON.stringify({ k: "end", id: "new-other", secs: 40, depth: 80, clicks: ["mail", "mail"] }),
    ].join("\n"),
  );
  assert.deepEqual(all.map((v) => [v.id, v.mine]), [["phone-before", true], ["new-other", false], ["marked", true], ["old-other", false], ["old-mine", true]]);
  const r = report(all, { days: 7, now: Date.parse("2026-10-20T12:00:00Z") });
  assert.equal(r.visits, 2);
  assert.equal(r.mineCount, 3);
  assert.deepEqual(r.opened, [["mail", 1]]);
  assert.equal(report(all, { tag: "acme" }).visits, 1);
});

test("screen, density and system tell look-alikes apart once both have them", () => {
  const phone = { tz: "Europe/Warsaw", lang: "en-GB", w: 393, device: "phone" };
  const all = visits(
    [
      line({ ...phone, t: "2026-10-21T08:00:00Z", id: "old-phone", me: 0 }), // no detail: base is enough
      line({ ...phone, t: "2026-10-21T09:00:00Z", id: "marked", me: 1, screen: "393x852", dpr: 3, os: "iOS" }),
      line({ ...phone, t: "2026-10-21T10:00:00Z", id: "in-app", me: 0, screen: "393x852", dpr: 3, os: "iOS" }),
      line({ ...phone, t: "2026-10-21T11:00:00Z", id: "look-alike", me: 0, screen: "393x873", dpr: 2.75, os: "Android" }),
      line({ t: "2026-10-21T12:00:00Z", id: "desk", me: 1, w: 2560, screen: "2560x1440", dpr: 1, os: "macOS" }),
      line({ t: "2026-10-21T13:00:00Z", id: "desk-narrow", me: 0, w: 1253, screen: "2560x1440", dpr: 1, os: "macOS" }), // same screen, smaller window
    ].join("\n"),
  );
  assert.deepEqual(all.map((v) => [v.id, v.mine]), [["desk-narrow", true], ["desk", true], ["look-alike", false], ["in-app", true], ["marked", true], ["old-phone", true]]);
});

test("sources", () => {
  assert.equal(source({ browser: "LinkedIn app" }), "social");
  assert.equal(source({ tag: "acme", ref: "google.com" }), "tagged");
  assert.equal(source({}), "direct");
  assert.equal(source({ ref: "www.linkedin.com" }), "social");
  assert.equal(source({ ref: "mail.google.com" }), "mail");
  assert.equal(source({ ref: "www.google.pl" }), "search");
  assert.equal(source({ ref: "gemini.google.com" }), "ai");
  assert.equal(source({ ref: "festivals.zaur.app" }), "own");
  assert.equal(source({ ref: "github.com" }), "other");
});

test("ipapi.is answers, keyless and keyed", () => {
  assert.deepEqual(network({ ip: "8.8.8.8", company: "Google LLC", city: "Mountain View", country: "United States" }), {
    org: "Google LLC", orgType: undefined, city: "Mountain View", region: undefined, country: "United States", hosting: undefined, vpn: undefined, mobile: undefined,
  });
  const keyed = network({ is_datacenter: true, company: { name: "Hetzner Online GmbH", type: "hosting" }, location: { city: "Falkenstein", country: "Germany" } });
  assert.equal(keyed.org, "Hetzner Online GmbH");
  assert.equal(keyed.city, "Falkenstein");
  assert.equal(keyed.hosting, 1);
});

test("the home network is always mine, and so is its device elsewhere", () => {
  const all = visits(
    [
      line({ t: "2026-10-22T08:00:00Z", id: "home-tagged", me: 0, tag: "acme", org: "Jakub Skorek trading as MCG", screen: "2560x1440", dpr: 1, os: "Linux" }),
      line({ t: "2026-10-22T09:00:00Z", id: "laptop-away", me: 0, org: "Orange Polska", screen: "2560x1440", dpr: 1, os: "Linux" }),
      line({ t: "2026-10-22T10:00:00Z", id: "stranger", me: 0, org: "Orange Polska", screen: "1920x1080", dpr: 1, os: "Windows" }),
      JSON.stringify({ k: "end", id: "stranger", secs: 50, seen: { top: 4, work: 30, packages: 2 } }),
    ].join("\n"),
  );
  assert.deepEqual(all.map((v) => [v.id, v.mine]), [["stranger", false], ["laptop-away", true], ["home-tagged", true]]);
  const r = report(all, { days: 7, now: Date.parse("2026-10-22T12:00:00Z") });
  assert.deepEqual(r.read, [["top", 1], ["work", 1]]);
});

test("ipapi.is region and flags", () => {
  const n = network({ is_vpn: true, is_mobile: true, company: { name: "Play", type: "isp" }, location: { city: "Kraków", state: "Lesser Poland", country: "Poland" } });
  assert.equal(n.region, "Lesser Poland");
  assert.equal(n.vpn, 1);
  assert.equal(n.mobile, 1);
  assert.equal(network({ company: "Google LLC", region: "California" }).region, "California");
});

test("a desktop window the size of its screen is a headless browser, not a visit", () => {
  const all = visits(
    [
      line({ t: "2026-10-27T05:43:00Z", id: "headless", w: 1920, h: 1080, screen: "1920x1080" }),
      JSON.stringify({ k: "end", id: "headless", secs: 28 }),
      line({ t: "2026-10-27T05:44:00Z", id: "person", w: 1920, h: 945, screen: "1920x1080" }),
      line({ t: "2026-10-27T05:45:00Z", id: "phone", w: 390, h: 844, screen: "390x844", device: "phone" }),
    ].join("\n"),
  );
  assert.deepEqual(all.map((v) => v.id), ["phone", "person"]);
});
