// Serves the built `dist/` directory for production hosts (CapRover, etc.).
// Single-page app routing: any path that doesn't resolve to a real file
// falls back to index.html. Cache headers favour long-lived hashed assets
// and a no-cache HTML shell so deploys take effect immediately.

import { createSign } from "node:crypto";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
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
};

// Daily Google Search clicks for szkolyjogi.pl, read with the yoga panel's
// Search Console service account (GSC_SERVICE_ACCOUNT_JSON, readonly scope).
// Cached for six hours, so Google sees at most four queries a day.
const GSC_PROPERTY = "sc-domain:szkolyjogi.pl";
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

// Last seven final days against the same week a month earlier. Google returns
// only final days (the newest one or two are missing, not zero), so the
// windows are counted in returned rows, not calendar dates.
async function fetchTraffic() {
  const key = JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON);
  const day = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_PROPERTY)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${await gscToken(key)}`, "content-type": "application/json" },
      body: JSON.stringify({ startDate: day(40), endDate: day(1), dimensions: ["date"] }),
    },
  );
  if (!res.ok) throw new Error(`search analytics ${res.status}`);
  const rows = (await res.json()).rows ?? [];
  if (rows.length < 7) throw new Error("too few rows");
  const perDay = (week) => Math.round(week.reduce((a, r) => a + r.clicks, 0) / week.length);
  return {
    clicksPerDay: perDay(rows.slice(-7)),
    monthAgo: rows.length >= 35 ? perDay(rows.slice(-35, -28)) : null,
    through: rows.at(-1).keys[0],
  };
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
    const isHtml = ext === ".html";
    const cache = isHtml
      ? "no-cache"
      : "public, max-age=31536000, immutable";
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
