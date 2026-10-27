import assert from "node:assert/strict";
import { test } from "node:test";
import { feedUrl, isCalendar, isPublicAddress } from "./feed.mjs";

test("only public https hosts are feed addresses", () => {
  assert.equal(feedUrl("webcal://p01-calendars.icloud.com/published/2/x")?.href, "https://p01-calendars.icloud.com/published/2/x");
  assert.ok(feedUrl("https://calendar.google.com/calendar/ical/a/private-b/basic.ics"));
  for (const bad of ["http://example.com/a.ics", "file:///etc/passwd", "https://127.0.0.1/a.ics", "https://[::1]/a.ics", "https://u:p@example.com/", "https://example.com:8443/", "nonsense", ""])
    assert.equal(feedUrl(bad), null, bad);
});

test("private, loopback and mapped addresses are refused", () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.5", "192.168.1.1", "100.64.0.1", "0.0.0.0", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
    assert.equal(isPublicAddress(ip), false, ip);
  for (const ip of ["142.250.74.46", "2a00:1450:4001:82b::200e"]) assert.equal(isPublicAddress(ip), true, ip);
});

test("only an iCalendar body passes", () => {
  assert.ok(isCalendar("﻿BEGIN:VCALENDAR\r\nEND:VCALENDAR"));
  assert.equal(isCalendar("<html>"), false);
});
