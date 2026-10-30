// The page's live numbers, served at /api/traffic. Google Search for
// everything on the page that Search Console has, read with the yoga panel's
// service account (GSC_SERVICE_ACCOUNT_JSON, readonly scope): every site gets
// the same three, good or bad, clicks, impressions and average position, day
// by day. npm downloads for every package. Cached for six hours, so Google and
// npm see at most four rounds a day.
import { createSign } from "node:crypto";

// The whole property unless `pages` narrows it or `skip` cuts a part out; the
// Zaur suite, Friendly Festivals and the package hub share zaur.app.
const GSC_SITES = {
  szkolyjogi: { property: "sc-domain:szkolyjogi.pl" },
  zaur: { property: "sc-domain:zaur.app", skip: "^https://(festivals|svelte)\\.zaur\\.app/" },
  thebest: { property: "sc-domain:thebest.travel" },
  kino: { property: "sc-domain:kino.net.pl" },
  kompi: { property: "sc-domain:kompi.pl" },
  festivals: { property: "sc-domain:zaur.app", pages: "^https://festivals\\.zaur\\.app/" },
  fixtar: { property: "https://fixtar.pl/" },
  pikastro: { property: "sc-domain:pikastro.eu" },
  wibroakustyka: { property: "sc-domain:wibroakustyka.ai" },
  intertech: { property: "https://intertechpoland.pl/" },
  polaczenie: { property: "sc-domain:gabinet-polaczenie.pl" },
  kurcz: { property: "sc-domain:kurcz.pl" },
};
// Each svelte-* package's page on the hub, svelte.zaur.app/<name> and its docs.
// svelte-calendar.xyz redirects there since 2026-10-30.
const HUB = ["calendar", "search", "i18n", "geometrize", "qr", "media", "scheduler", "payments", "notify"];
for (const n of HUB) GSC_SITES[`svelte-${n}`] = { property: "sc-domain:zaur.app", pages: `^https://svelte\\.zaur\\.app/${n}(/|$)` };
const DAYS = 90;
const TRAFFIC_TTL = 6 * 3600_000;
let traffic = { at: 0, value: null };
async function gscToken(key) {
  const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const aud = "https://oauth2.googleapis.com/token";
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud,
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  const res = await fetch(aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return (await res.json()).access_token;
}

const addDays = (d, n) => new Date(Date.parse(d) + n * 86_400_000).toISOString().slice(0, 10);
const total = (days, i) => days.reduce((a, d) => a + d[i], 0);
// A day's position is already the mean over its impressions, so a longer
// span weighs each day by them. A span nobody saw has none.
const position = (days) => {
  const seen = total(days, 2);
  return seen ? Math.round((10 * days.reduce((a, d) => a + (d[3] ?? 0) * d[2], 0)) / seen) / 10 : null;
};
const sum = (days) => ({ clicks: total(days, 1), impressions: total(days, 2), position: position(days) });

// Ninety days through `through`, the newest final day. Google leaves out a day
// nobody saw the site (it is not a zero row), so a missing day is zero clicks,
// zero impressions and no position. `now` is the last 28 days, `before` the 28
// ahead of them.
export function summarize(rows, through) {
  const byDate = new Map(rows.map((r) => [r.keys[0], r]));
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = addDays(through, i + 1 - DAYS);
    const r = byDate.get(d);
    return r ? [d, Math.round(r.clicks), r.impressions, Math.round(r.position * 10) / 10] : [d, 0, 0, null];
  });
  return { through, days, now: sum(days.slice(-28)), before: sum(days.slice(-56, -28)) };
}

async function fetchSite(token, { property, pages, skip }) {
  const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const body = { startDate: day(DAYS + 10), endDate: day(1), dimensions: ["date"] };
  const filters = [];
  if (pages) filters.push({ dimension: "page", operator: "includingRegex", expression: pages });
  if (skip) filters.push({ dimension: "page", operator: "excludingRegex", expression: skip });
  if (filters.length) body.dimensionFilterGroups = [{ filters }];
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`${property} ${res.status}`);
  const rows = (await res.json()).rows ?? [];
  // Google returns only final days, usually through two or three days ago; a
  // quiet site's newest row can be older, and its days still end there.
  const newest = rows.reduce((d, r) => (r.keys[0] > d ? r.keys[0] : d), day(3));
  return summarize(rows, newest);
}

// npm's downloads for each package, day by day over the same ninety days. A
// package's demo gets next to no search traffic, so this is its number. One at
// a time, and a 429 waits and asks again: npm turns a burst away.
const PACKAGES = [
  "zaur-world",
  "svelte-calendar",
  "svelte-search",
  "svelte-i18n",
  "svelte-geometrize",
  "svelte-qr",
  "svelte-media",
  "svelte-scheduler",
  "svelte-payments",
  "svelte-notify",
];
async function fetchDownloads() {
  const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const out = {};
  for (const id of PACKAGES) {
    try {
      const url = `https://api.npmjs.org/downloads/range/${day(DAYS)}:${day(1)}/@nomideusz/${id}`;
      let res = await fetch(url);
      for (let wait = 1000; res.status === 429 && wait <= 4000; wait *= 2) {
        await new Promise((r) => setTimeout(r, wait));
        res = await fetch(url);
      }
      if (!res.ok) throw new Error(`${id} ${res.status}`);
      const { end, downloads } = await res.json();
      out[id] = { through: end, days: downloads.map((d) => d.day), values: downloads.map((d) => d.downloads) };
    } catch (err) {
      console.error("[traffic]", err.message);
    }
  }
  return out;
}

// One site failing leaves the others standing; without the Search Console key
// the packages still get their downloads.
async function fetchSearch() {
  if (!process.env.GSC_SERVICE_ACCOUNT_JSON) return {};
  const token = await gscToken(JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON));
  const ids = Object.keys(GSC_SITES);
  const got = await Promise.allSettled(ids.map((id) => fetchSite(token, GSC_SITES[id])));
  const out = {};
  got.forEach((r, i) => (r.status === "fulfilled" ? (out[ids[i]] = r.value) : console.error("[traffic]", r.reason.message)));
  return out;
}

async function fetchTraffic() {
  const [search, npm] = await Promise.all([fetchSearch().catch((err) => (console.error("[traffic]", err.message), {})), fetchDownloads()]);
  if (!Object.keys(search).length && !Object.keys(npm).length) throw new Error("nothing answered");
  // A round missing a package is served, but asked again in ten minutes.
  if (Object.keys(npm).length < PACKAGES.length) traffic.at = Date.now() - TRAFFIC_TTL + 600_000;
  return { search, npm };
}

export async function sendTraffic(res) {
  if (Date.now() - traffic.at > TRAFFIC_TTL) {
    // Store the promise so concurrent visitors share one round trip; a
    // failure is cached for ten minutes instead of the full TTL.
    const value = fetchTraffic().catch((err) => {
      console.error("[traffic]", err.message);
      traffic.at = Date.now() - TRAFFIC_TTL + 600_000;
      return null;
    });
    traffic = { at: Date.now(), value };
  }
  const body = await traffic.value;
  res.writeHead(body ? 200 : 503, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": body ? "public, max-age=3600" : "no-store",
  });
  res.end(body ? JSON.stringify(body) : "");
}
