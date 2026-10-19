// Serves the built `dist/` directory for production hosts (CapRover, etc.).
// Single-page app routing: any path that doesn't resolve to a real file
// falls back to index.html. Cache headers keep hashed assets forever
// and revalidate everything else, so deploys take effect immediately.

import { createSign } from "node:crypto";
import { createServer } from "node:http";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT ?? 4173);
const ROOT = resolve(fileURLToPath(new URL("./dist", import.meta.url)));

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// Google Search numbers for the sites the page charts, read with the yoga
// panel's Search Console service account (GSC_SERVICE_ACCOUNT_JSON, readonly
// scope). Established sites are measured in clicks; new ones, where clicks are
// still near zero, in impressions. Cached for six hours, so Google sees at most
// four rounds a day.
const GSC_SITES = {
  szkolyjogi: { property: "sc-domain:szkolyjogi.pl", metric: "clicks" },
  fixtar: { property: "https://fixtar.pl/", metric: "clicks", pages: "/(products|blog)" },
  kino: { property: "sc-domain:kino.net.pl", metric: "impressions" },
  kompi: { property: "sc-domain:kompi.pl", metric: "impressions" },
  festivals: { property: "sc-domain:zaur.app", metric: "impressions", pages: "^https://festivals\\.zaur\\.app/" },
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

// Google returns only final days (the newest one or two are missing, not
// zero), so weeks are counted back in returned rows, not calendar dates. Each
// week is the median day, which a single spike or a quiet Sunday cannot move.
function weekly(rows, metric) {
  const weeks = [];
  for (let end = rows.length; end >= 7 && weeks.length < WEEKS; end -= 7) {
    const week = rows.slice(end - 7, end);
    const sorted = week.map((r) => r[metric]).sort((a, b) => a - b);
    weeks.unshift([week[0].keys[0], sorted[3]]);
  }
  return weeks;
}

async function fetchSite(token, { property, metric, pages }) {
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
  const weeks = weekly(rows, metric);
  if (!weeks.length) throw new Error(`${property}: too few rows`);
  const sum = (k) => Math.round(rows.slice(-28).reduce((a, r) => a + r[k], 0));
  return { metric, perDay: weeks.at(-1)[1], weeks, clicks28: sum("clicks"), impressions28: sum("impressions"), through: rows.at(-1).keys[0] };
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

async function sendTraffic(res) {
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

// Anonymous visits (src/lib/visit.ts): one JSON line per beacon, no IP, no
// cookie. STATS_FILE should sit on a volume so deploys keep it; /stats shows
// it to whoever has STATS_KEY. A crawler is dropped by its user agent.
const STATS_FILE = process.env.STATS_FILE ?? "/data/visits.jsonl";
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|inspect|fetch|curl|wget|python|java\/|monitor/i;
const str = (v, max) => (typeof v === "string" && v ? v.slice(0, max) : undefined);
const num = (v) => (Number.isFinite(v) ? Math.round(v) : undefined);

async function recordHit(req, res) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 4096) break;
  }
  res.writeHead(204, { "cache-control": "no-store" });
  res.end();
  const ua = req.headers["user-agent"] ?? "";
  if (!ua || BOT.test(ua)) return;
  let h;
  try {
    h = JSON.parse(body);
  } catch {
    return;
  }
  if (!/^[\w-]{6,16}$/.test(h.id ?? "") || !["view", "end"].includes(h.k)) return;
  const line = {
    t: new Date().toISOString(),
    id: h.id,
    k: h.k,
    ...(h.k === "view"
      ? {
          tag: str(h.tag, 40),
          ref: str(h.ref, 100),
          tz: str(h.tz, 40),
          lang: str(h.lang, 20),
          w: num(h.w),
          device: /Mobi|Android|iPhone|iPad/.test(ua) ? "phone" : "desktop",
        }
      : {
          secs: num(h.secs),
          depth: num(h.depth),
          clicks: Array.isArray(h.clicks) ? h.clicks.slice(0, 40).map((c) => str(c, 80)).filter(Boolean) : undefined,
        }),
  };
  // The reply is already sent, so a failed write is only logged.
  try {
    await mkdir(dirname(STATS_FILE), { recursive: true });
    await appendFile(STATS_FILE, JSON.stringify(line) + "\n");
  } catch (err) {
    console.error("[stats]", err.message);
  }
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

// Visits newest first, each view joined with its last end. ?tag= narrows it.
async function sendStats(url, res) {
  if (!process.env.STATS_KEY || url.searchParams.get("key") !== process.env.STATS_KEY) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const lines = (await readFile(STATS_FILE, "utf8").catch(() => "")).split("\n").filter(Boolean);
  const visits = new Map();
  for (const l of lines) {
    let h;
    try {
      h = JSON.parse(l);
    } catch {
      continue;
    }
    if (h.k === "view") visits.set(h.id, h);
    else if (visits.has(h.id)) Object.assign(visits.get(h.id), { secs: h.secs, depth: h.depth, clicks: h.clicks });
  }
  const only = url.searchParams.get("tag");
  const all = [...visits.values()].reverse();
  const shown = only ? all.filter((v) => v.tag === only) : all;
  const when = (t) => new Date(t).toLocaleString("en-GB", { timeZone: "Europe/Warsaw", dateStyle: "short", timeStyle: "short" });
  const days = new Map();
  for (const v of all) days.set(v.t.slice(0, 10), (days.get(v.t.slice(0, 10)) ?? 0) + 1);
  const tags = new Map();
  for (const v of all) if (v.tag) tags.set(v.tag, [...(tags.get(v.tag) ?? []), v]);
  const key = encodeURIComponent(url.searchParams.get("key"));
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex">
<title>zaur.app visits</title>
<style>body{font:14px/1.4 system-ui,sans-serif;margin:1rem;color:#0b0a09;background:#f8f6f1}table{border-collapse:collapse;width:100%}td,th{padding:.3rem .5rem;border-top:1px solid #0002;text-align:left;vertical-align:top}th{font-weight:600}tr.tag{background:#b8aff355}a{color:inherit}.n{font-variant-numeric:tabular-nums;text-align:right}h2{margin:1.5rem 0 .5rem;font-size:1rem}</style>
<h1 style="font-size:1.25rem">zaur.app visits · ${all.length}</h1>
<h2>Tagged links</h2>
<table><tr><th>Tag</th><th class="n">Visits</th><th>Last</th></tr>${[...tags]
    .map(([t, vs]) => `<tr><td><a href="?key=${key}&tag=${encodeURIComponent(t)}">${esc(t)}</a></td><td class="n">${vs.length}</td><td>${when(vs[0].t)}</td></tr>`)
    .join("") || '<tr><td colspan="3">None yet. Hand out zaur.app/?r=company</td></tr>'}</table>
<h2>Last 30 days</h2>
<table><tr><th>Day</th><th class="n">Visits</th></tr>${[...days].slice(0, 30).map(([d, n]) => `<tr><td>${d}</td><td class="n">${n}</td></tr>`).join("")}</table>
<h2>${only ? `Visits from ${esc(only)} · <a href="?key=${key}">all</a>` : "Latest visits"}</h2>
<table><tr><th>When</th><th>Tag</th><th>From</th><th>Where</th><th>Device</th><th class="n">Time</th><th class="n">Read</th><th>Opened</th></tr>${shown
    .slice(0, 300)
    .map(
      (v) => `<tr${v.tag ? ' class="tag"' : ""}><td>${when(v.t)}</td><td>${esc(v.tag)}</td><td>${esc(v.ref)}</td><td>${esc(v.tz)} · ${esc(v.lang)}</td><td>${v.device} ${v.w ?? ""}</td><td class="n">${v.secs == null ? "" : v.secs < 60 ? `${v.secs}s` : `${Math.floor(v.secs / 60)}m ${v.secs % 60}s`}</td><td class="n">${v.depth == null ? "" : v.depth + "%"}</td><td>${esc(v.clicks?.join(", "))}</td></tr>`,
    )
    .join("")}</table>`;
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(html);
}

function safeJoin(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = resolve(join(root, normalize(decoded)));
  if (!target.startsWith(root)) return null;
  return target;
}

async function tryFile(path) {
  try {
    const s = await stat(path);
    return s.isFile() ? path : null;
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/hit") {
      await recordHit(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/stats") {
      await sendStats(url, res);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/traffic") {
      await sendTraffic(res);
      return;
    }

    let target = safeJoin(ROOT, url.pathname === "/" ? "/index.html" : url.pathname);
    if (!target) {
      res.writeHead(400);
      res.end("bad request");
      return;
    }
    let resolved = await tryFile(target);
    if (!resolved) {
      // SPA fallback — let the client handle unknown routes.
      resolved = await tryFile(join(ROOT, "index.html"));
    }
    if (!resolved) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = extname(resolved).toLowerCase();
    const type = TYPES[ext] ?? "application/octet-stream";
    // Only Kit's hashed build output is safe to cache forever; __data.json,
    // og.png and the rest keep their names across deploys.
    const cache = url.pathname.startsWith("/_app/immutable/")
      ? "public, max-age=31536000, immutable"
      : "no-cache";
    const body = await readFile(resolved);
    res.writeHead(200, { "content-type": type, "cache-control": cache });
    res.end(body);
  } catch (err) {
    console.error("[static] handler error:", err);
    res.writeHead(500);
    res.end("internal error");
  }
});

server.listen(PORT, () => {
  console.log(`[static] serving ${ROOT} on :${PORT}`);
});
