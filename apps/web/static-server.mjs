// Serves the built `dist/` directory for production hosts (CapRover, etc.).
// Every route is prerendered, so a path that doesn't resolve to a file gets the
// site's 404 page with a 404 status. Cache headers keep hashed assets forever
// and revalidate everything else, so deploys take effect immediately.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sendFeed } from "./feed.mjs";
import { sendTraffic } from "./search.mjs";

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

// The build writes compressed copies beside each text file (precompress in
// vite.config.ts): the best one this client takes, or the file itself.
async function encodedCopy(path, accept = "") {
  const takes = new Map(
    accept.split(",").map((part) => {
      const [name, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return [name, q ? Number(q.slice(2)) : 1];
    }),
  );
  for (const [encoding, ext] of [["br", ".br"], ["gzip", ".gz"]]) {
    if (!(takes.get(encoding) > 0)) continue;
    const copy = await tryFile(`${path}${ext}`);
    if (copy) return { file: copy, encoding };
  }
  return { file: path };
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

    // Visits are counted and read at stats.zaur.app now.
    if (req.method === "GET" && url.pathname === "/stats") {
      res.writeHead(301, { location: "https://stats.zaur.app/s/zaur" });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/ics") {
      await sendFeed(url, res);
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
    // og.png and the rest keep their names across deploys. A miss is never kept:
    // during a deploy a new page can ask the old server for a chunk it doesn't
    // have yet, and a 404 cached for a year would leave that browser broken.
    const cache = status === 404
      ? "no-store"
      : url.pathname.startsWith("/_app/immutable/")
        ? "public, max-age=31536000, immutable"
        : "no-cache";
    const { file, encoding } = await encodedCopy(resolved, req.headers["accept-encoding"]);
    // "no-cache" means revalidate, which takes something to revalidate against.
    const { size, mtimeMs } = await stat(file);
    const etag = `W/"${size}-${Math.round(mtimeMs)}"`;
    const headers = {
      "content-type": type,
      "cache-control": cache,
      vary: "accept-encoding",
      etag,
      ...(encoding && { "content-encoding": encoding }),
    };
    if (status === 200 && req.headers["if-none-match"] === etag) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    res.writeHead(status, headers);
    res.end(await readFile(file));
  } catch (err) {
    console.error("[static] handler error:", err);
    res.writeHead(500);
    res.end("internal error");
  }
});

server.listen(PORT, () => {
  console.log(`[static] serving ${ROOT} on :${PORT}`);
});
