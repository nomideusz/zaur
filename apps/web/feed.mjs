// GET /api/ics?url=… — a calendar subscription fetched for the page. Google,
// Outlook and iCloud send no CORS headers, so the calendar demo can't read
// their feeds itself. Only public https hosts are dialled (checked on the
// address actually connected to, so a DNS answer can't swap in a private one
// later), and only an iCalendar body goes back: this is no general proxy.
// Feed URLs are secrets (Google's "secret address"), so none is logged or cached.
import { lookup as dnsLookup } from "node:dns";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3],
]) blocked.addSubnet(net, bits, "ipv4");
// IPv4-mapped IPv6 (::ffff:a.b.c.d) is checked against the IPv4 rules by BlockList itself.
for (const [net, bits] of [["::", 127], ["64:ff9b::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8]])
  blocked.addSubnet(net, bits, "ipv6");

export const isPublicAddress = (address) => {
  const family = isIP(address);
  return family !== 0 && !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
};

/** The feed's https URL (webcal:// reads as https://), or null when it can't be one. */
export function feedUrl(raw) {
  let url;
  try {
    url = new URL(String(raw ?? "").trim().replace(/^webcals?:\/\//i, "https://"));
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
  if (isIP(url.hostname.replace(/^\[|\]$/g, ""))) return null;
  return url;
}

export const isCalendar = (text) => /^﻿?\s*BEGIN:VCALENDAR/i.test(text);

// The connect-time check: every address the host resolves to must be public.
function publicLookup(hostname, options, callback) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const bad = addresses.find((a) => !isPublicAddress(a.address));
    if (bad || !addresses.length) return callback(new Error("private address"));
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function get(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      { lookup: publicLookup, timeout: TIMEOUT_MS, headers: { accept: "text/calendar, */*;q=0.1", "user-agent": "zaur.app calendar" } },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          const next = feedUrl(new URL(res.headers.location, url).href);
          if (!next || redirects >= MAX_REDIRECTS) return reject(new Error("bad redirect"));
          return resolve(get(next, redirects + 1));
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`upstream ${status}`));
        }
        const chunks = [];
        let size = 0;
        res.on("data", (c) => {
          size += c.length;
          if (size > MAX_BYTES) return req.destroy(new Error("too large"));
          chunks.push(c);
        });
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

export async function sendFeed(url, res) {
  const target = feedUrl(url.searchParams.get("url"));
  const send = (status, body, type = "text/plain; charset=utf-8") => {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-content-type-options": "nosniff" });
    res.end(body);
  };
  if (!target) return send(400, "an https:// or webcal:// calendar address");
  try {
    const text = await get(target);
    if (!isCalendar(text)) return send(422, "not an iCalendar feed");
    send(200, text, "text/calendar; charset=utf-8");
  } catch (err) {
    send(502, err.message === "private address" ? "not a public address" : "the feed could not be read");
  }
}
