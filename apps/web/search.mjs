// Google Search numbers for the sites the page charts, read with the yoga
// panel's Search Console service account (GSC_SERVICE_ACCOUNT_JSON, readonly
// scope). Every site gets the same two, good or bad: clicks and average
// position, week by week. Cached for six hours, so Google sees at most four
// rounds a day.
import { createSign } from "node:crypto";

const GSC_SITES = {
  szkolyjogi: { property: "sc-domain:szkolyjogi.pl" },
  fixtar: { property: "https://fixtar.pl/", pages: "/(products|blog)" },
  kino: { property: "sc-domain:kino.net.pl" },
  kompi: { property: "sc-domain:kompi.pl" },
  festivals: { property: "sc-domain:zaur.app", pages: "^https://festivals\\.zaur\\.app/" },
};
const WEEKS = 12;
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
const ago = (d, through) => Math.round((Date.parse(through) - Date.parse(d)) / 86_400_000);
const total = (rows, k) => rows.reduce((a, r) => a + r[k], 0);
// A day's position is already the mean over its impressions, so a longer
// span weighs each day by them. A span nobody saw has none.
const position = (rows) => {
  const seen = total(rows, "impressions");
  return seen ? Math.round((10 * rows.reduce((a, r) => a + r.position * r.impressions, 0)) / seen) / 10 : null;
};

// Weeks are counted back from `through`, the newest final day. Google leaves
// out a day nobody saw the site (it is not a zero row), so a missing day is
// simply nothing. Each week: its first day, clicks, average position.
export function summarize(rows, through) {
  const span = (from, to) => rows.filter((r) => ago(r.keys[0], through) >= from && ago(r.keys[0], through) < to);
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const back = WEEKS - i;
    const week = span(7 * (back - 1), 7 * back);
    return [addDays(through, 1 - 7 * back), Math.round(total(week, "clicks")), position(week)];
  });
  const last = span(0, 28);
  return { weeks, clicks28: Math.round(total(last, "clicks")), position28: position(last), through };
}

async function fetchSite(token, { property, pages }) {
  const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const body = { startDate: day(7 * WEEKS + 6), endDate: day(1), dimensions: ["date"] };
  if (pages) body.dimensionFilterGroups = [{ filters: [{ dimension: "page", operator: "includingRegex", expression: pages }] }];
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
  // quiet site's newest row can be older, and its weeks still end there.
  const newest = rows.reduce((d, r) => (r.keys[0] > d ? r.keys[0] : d), day(3));
  return summarize(rows, newest);
}

// One site failing leaves the others standing.
async function fetchTraffic() {
  const token = await gscToken(JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON));
  const ids = Object.keys(GSC_SITES);
  const got = await Promise.allSettled(ids.map((id) => fetchSite(token, GSC_SITES[id])));
  const out = {};
  got.forEach((r, i) => (r.status === "fulfilled" ? (out[ids[i]] = r.value) : console.error("[traffic]", r.reason.message)));
  if (!Object.keys(out).length) throw new Error("no site answered");
  return out;
}

export async function sendTraffic(res) {
  if (!process.env.GSC_SERVICE_ACCOUNT_JSON) {
    res.writeHead(503, { "cache-control": "no-store" });
    res.end();
    return;
  }
  if (Date.now() - traffic.at > TRAFFIC_TTL) {
    // Store the promise so concurrent visitors share one Google round trip;
    // a failure is cached for ten minutes instead of the full TTL.
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
