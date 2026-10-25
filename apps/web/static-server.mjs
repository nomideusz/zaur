// Serves the built `dist/` directory for production hosts (CapRover, etc.).
// Every route is prerendered, so a path that doesn't resolve to a file gets the
// site's 404 page with a 404 status. Cache headers keep hashed assets forever
// and revalidate everything else, so deploys take effect immediately.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sendTraffic } from "./search.mjs";
import { recordHit, sendStats } from "./stats.mjs";

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

function safeJoin(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
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
    // Prerendered pages without a trailing slash are files: /pl is dist/pl.html.
    let resolved = (await tryFile(target)) ?? (await tryFile(`${target}.html`));
    let status = 200;
    if (!resolved) {
      status = 404;
      resolved = await tryFile(join(ROOT, "404.html"));
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
    res.writeHead(status, { "content-type": type, "cache-control": cache });
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
