// Anonymous visits for static-server.mjs (src/lib/visit.ts beacons them):
// /api/hit appends one JSON line per beacon, /stats reads them back for
// whoever has STATS_KEY. No IP, no visitor id. Opening /stats leaves the
// zaur_owner cookie on that device, so its later visits arrive marked `me`
// and the page shows them apart from everyone else's.
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

const STATS_FILE = process.env.STATS_FILE ?? "/data/visits.jsonl";
const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|inspect|fetch|curl|wget|python|java\/|monitor/i;
const OWNER = "zaur_owner=1";
const str = (v, max) => (typeof v === "string" && v ? v.slice(0, max) : undefined);
const num = (v) => (Number.isFinite(v) ? Math.round(v) : undefined);
// The user agent is read for these two words and never stored. An app's
// in-app browser is named, as it sends no referrer.
const browser = (ua) =>
  [[/LinkedInApp/, "LinkedIn app"], [/FBAN|FBAV/, "Facebook app"], [/Instagram/, "Instagram app"], [/GSA\//, "Google app"], [/Edg/, "Edge"], [/OPR\//, "Opera"], [/SamsungBrowser/, "Samsung"], [/Firefox|FxiOS/, "Firefox"], [/Chrome|CriOS/, "Chrome"], [/Safari/, "Safari"]].find(([re]) => re.test(ua))?.[1] ?? "other";
const os = (ua) => [[/iPhone|iPad|iPod/, "iOS"], [/Android/, "Android"], [/Windows/, "Windows"], [/Mac OS X/, "macOS"], [/CrOS/, "ChromeOS"], [/Linux/, "Linux"]].find(([re]) => re.test(ua))?.[1] ?? "other";

export async function recordHit(req, res) {
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
  if (!/^[\w-]{6,16}$/.test(h.id ?? "") || !["view", "end", "owner"].includes(h.k)) return;
  const me = (req.headers.cookie ?? "").split(/;\s*/).includes(OWNER) ? 1 : 0;
  // `owner` is the /stats page saying what this device looks like; only a
  // device that holds the cookie may say it.
  if (h.k === "owner" && !me) return;
  // A real browser knows its time zone; headless Chrome in a container does not.
  if (h.tz === "Etc/Unknown") return;
  const line = {
    t: new Date().toISOString(),
    id: h.id,
    k: h.k,
    ...(h.k !== "end"
      ? {
          tag: str(h.tag, 40),
          ref: str(h.ref, 100),
          tz: str(h.tz, 40),
          lang: str(h.lang, 20),
          w: num(h.w),
          h: num(h.h),
          screen: /^\d{2,5}x\d{2,5}$/.test(h.screen) ? h.screen : undefined,
          dpr: Number.isFinite(h.dpr) ? Math.round(h.dpr * 100) / 100 : undefined,
          dark: h.dark === 1 ? 1 : h.dark === 0 ? 0 : undefined,
          hash: str(h.hash, 40),
          device: /Mobi|Android|iPhone|iPad/.test(ua) ? "phone" : "desktop",
          browser: browser(ua),
          os: os(ua),
          me,
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

// Where a visit came from, as one word: the ?r= tag first, then the
// referrer's host. Host suffixes, so l.facebook.com matches facebook.com; AI
// before search, as gemini.google.com is not a Google search.
const AI = ["chatgpt.com", "openai.com", "perplexity.ai", "claude.ai", "gemini.google.com", "copilot.microsoft.com", "deepseek.com", "grok.com", "mistral.ai"];
const MAIL = ["mail.google.com", "outlook.live.com", "outlook.office.com", "outlook.office365.com", "mail.yahoo.com", "mail.proton.me", "poczta.onet.pl", "poczta.wp.pl", "poczta.interia.pl"];
const SEARCH = ["bing.com", "duckduckgo.com", "search.yahoo.com", "ecosia.org", "yandex.ru", "yandex.com", "search.brave.com", "qwant.com", "startpage.com", "com.google.android.googlequicksearchbox"];
const SOCIAL = ["linkedin.com", "lnkd.in", "com.linkedin.android", "facebook.com", "messenger.com", "instagram.com", "t.co", "x.com", "twitter.com", "youtube.com", "reddit.com", "threads.net", "threads.com", "bsky.app", "news.ycombinator.com", "wykop.pl"];
const GOOGLE = /^(www\.)?google\.[a-z.]+$/;
const under = (host, sites) => sites.some((s) => host === s || host.endsWith(`.${s}`));
export const SOURCES = { tagged: "tagged link", mail: "mail", social: "social", search: "search", ai: "AI chat", own: "own sites", other: "other sites", direct: "direct" };

export function source({ tag, ref, browser }) {
  if (tag) return "tagged";
  if (!ref) return /LinkedIn|Facebook|Instagram/.test(browser) ? "social" : "direct";
  const host = ref.toLowerCase().replace(/:\d+$/, "");
  if (host.split(".").slice(-2).join(".") === "zaur.app") return "own";
  if (under(host, AI)) return "ai";
  if (under(host, MAIL)) return "mail";
  if (GOOGLE.test(host) || under(host, SEARCH)) return "search";
  if (under(host, SOCIAL)) return "social";
  return "other";
}

// A device's look: the base every line has, and the screen, density and
// system that lines since 2026-10-21 add. With those, the window's width is
// left out, as a desktop window changes it.
const base = (v) => [v.tz, v.lang, v.w, v.device].join("|");
const detail = (v) => (v.screen ? [v.screen, v.dpr, v.os].join("|") : "");
const full = (v) => [v.tz, v.lang, v.device, detail(v)].join("|");

// Views newest first, each joined with its last end. A view without the
// cookie is still the owner's when it looks like a marked view or a device
// /stats was opened on: the cookie came later, or the visit was in another
// browser on the same phone (an app's in-app view). Time zone, language,
// width and device must match; screen, density and system too once both
// sides carry them.
// ponytail: a stranger with an identical device still counts as mine; add a
// per-device random mark in the owner cookie if that ever shows up.
export function visits(text) {
  const byId = new Map();
  const owner = new Map(); // base → details seen with it ("" = none)
  const fulls = new Set();
  const claim = (v) => {
    owner.set(base(v), (owner.get(base(v)) ?? new Set()).add(detail(v)));
    if (detail(v)) fulls.add(full(v));
  };
  const claimed = (v) => {
    if (detail(v) && fulls.has(full(v))) return true;
    const seen = owner.get(base(v));
    return !!seen && (!detail(v) || [...seen].every((d) => d === ""));
  };
  for (const l of text.split("\n")) {
    if (!l) continue;
    let h;
    try {
      h = JSON.parse(l);
    } catch {
      continue;
    }
    if (h.k === "owner") claim(h);
    else if (h.k === "view") byId.set(h.id, h);
    else if (byId.has(h.id)) Object.assign(byId.get(h.id), { secs: h.secs, depth: h.depth, clicks: h.clicks });
  }
  const all = [...byId.values()];
  for (const v of all) if (v.me === 1) claim(v);
  for (const v of all) {
    // A ?r= link was handed to someone else, so only the cookie claims it.
    v.mine = v.me === 1 || (!v.tag && claimed(v));
    v.src = source(v);
  }
  return all.reverse();
}

// Days and hours are Warsaw's.
const TZ = "Europe/Warsaw";
export const day = (t) => new Date(t).toLocaleDateString("sv-SE", { timeZone: TZ });
const hour = (t) => Number(new Date(t).toLocaleString("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }));
const addDays = (d, n) => new Date(Date.parse(`${d}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};
const count = (xs, key) => {
  const m = new Map();
  for (const x of xs) for (const k of [key(x)].flat()) if (k) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
};
export const DAYS = [1, 7, 30, 90];

// One period of one audience: `who` is others, mine or all; a tag reads its
// visits from all time.
export function report(all, { days = 30, who = "others", tag = null, now = Date.now() } = {}) {
  const today = day(now);
  const from = addDays(today, 1 - days);
  const prevFrom = addDays(from, -days);
  const whose = (v) => who === "all" || v.mine === (who === "mine");
  const inPeriod = (v) => (tag ? v.tag === tag : day(v.t) >= from);
  const period = all.filter(inPeriod);
  const shown = period.filter(whose);
  const prev = tag ? [] : all.filter((v) => whose(v) && day(v.t) >= prevFrom && day(v.t) < from);
  const first = all.length ? day(all.at(-1).t) : null;
  const pct = (n) => (shown.length ? Math.round((100 * n) / shown.length) : 0);

  // Today by the hour, longer periods by the day.
  const bars =
    days === 1 && !tag
      ? Array.from({ length: hour(now) + 1 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, n: 0 }))
      : Array.from({ length: days }, (_, i) => ({ label: addDays(from, i), n: 0 }));
  if (!tag) for (const v of shown) (bars[days === 1 ? hour(v.t) : bars.findIndex((b) => b.label === day(v.t))] ?? {}).n++;

  return {
    days,
    who,
    tag,
    from,
    today,
    mineCount: period.filter((v) => v.mine).length,
    othersCount: period.filter((v) => !v.mine).length,
    visits: shown.length,
    // Only a previous period the log saw whole is worth a comparison.
    was: !tag && first && first <= prevFrom ? prev.length : null,
    median: median(shown.map((v) => v.secs)),
    depth: shown.some((v) => v.depth != null) ? Math.round(shown.reduce((a, v) => a + (v.depth ?? 0), 0) / shown.filter((v) => v.depth != null).length) : null,
    clicked: pct(shown.filter((v) => v.clicks?.length).length),
    phones: pct(shown.filter((v) => v.device === "phone").length),
    bars: tag ? [] : bars,
    sources: count(shown, (v) => v.src),
    refs: count(shown, (v) => v.ref).slice(0, 12),
    places: count(shown, (v) => (v.tz ? v.tz.split("/").pop().replace(/_/g, " ") : null)).slice(0, 12),
    langs: count(shown, (v) => v.lang?.split("-")[0]).slice(0, 8),
    systems: count(shown, (v) => v.os && `${v.os} · ${v.browser}`).slice(0, 10),
    screens: count(shown, (v) => v.screen && `${v.device} ${v.screen.replace("x", "×")}`).slice(0, 10),
    dark: shown.some((v) => v.dark != null) ? pct(shown.filter((v) => v.dark === 1).length) : null,
    // What was opened, each target once per visit.
    opened: count(shown, (v) => [...new Set(v.clicks ?? [])]).slice(0, 15),
    tags: count(all.filter(whose), (v) => v.tag).map(([t, n]) => [t, n, all.find((v) => v.tag === t).t]),
    recent: shown.slice(0, 300),
  };
}

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const secs = (s) => (s == null ? "—" : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`);
const when = (t) => new Date(t).toLocaleString("en-GB", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
const device = (v) => (v.device === "phone" || v.w < 768 ? "phone" : v.w < 1100 ? "tablet" : "desktop");
const PERIOD = { 1: "Today", 7: "7 days", 30: "30 days", 90: "90 days" };

function barList(title, rows, total, label = (k) => esc(k)) {
  const peak = Math.max(1, ...rows.map((r) => r[1]));
  return `<section><h2>${title}</h2>${
    rows
      .map(([k, n]) => `<div class="row"><span>${label(k)}</span><span class="bar"><i style="--w:${(100 * n) / peak}%"></i></span><span class="n">${n} <small>${total ? Math.round((100 * n) / total) + "%" : ""}</small></span></div>`)
      .join("") || '<p class="none">Nothing yet.</p>'
  }</section>`;
}

// ponytail: reads the whole log on every request; fine for thousands of
// lines, roll it by month if it ever reaches the hundreds of thousands.
export async function sendStats(url, res) {
  if (!process.env.STATS_KEY || url.searchParams.get("key") !== process.env.STATS_KEY) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const p = url.searchParams;
  const asked = Number(p.get("days"));
  const r = report(visits(await readFile(STATS_FILE, "utf8").catch(() => "")), {
    days: DAYS.includes(asked) ? asked : 30,
    who: ["mine", "all"].includes(p.get("who")) ? p.get("who") : "others",
    tag: p.get("tag"),
  });
  const link = (set) => {
    const q = new URLSearchParams({ key: p.get("key"), days: r.days, who: r.who });
    for (const [k, v] of Object.entries(set)) v == null ? q.delete(k) : q.set(k, v);
    return `?${esc(q)}`;
  };
  const delta = r.was == null ? "" : r.was === 0 ? "first visits" : `${r.visits >= r.was ? "+" : "−"}${Math.abs(Math.round((100 * (r.visits - r.was)) / r.was))}% vs ${r.was} before`;
  const peak = Math.max(1, ...r.bars.map((b) => b.n));
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>zaur.app visits</title>
<style>
:root{--ink:#0b0a09;--paper:#f8f6f1;--line:#0b0a0922;--soft:#0b0a0999;--accent:#6f5fe0;--tint:#b8aff355}
body{font:14px/1.45 system-ui,sans-serif;margin:0 auto;padding:1rem;max-width:1200px;color:var(--ink);background:var(--paper)}
a{color:inherit}h1{font-size:1.25rem;margin:0}h2{font-size:.8rem;text-transform:uppercase;letter-spacing:.06em;margin:0 0 .5rem;color:var(--soft)}
small,.hint{color:var(--soft)}.n{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.top{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;align-items:center;margin-bottom:1rem}
.seg{display:flex;border:1px solid var(--line);border-radius:6px;overflow:hidden}.seg a{padding:.25rem .6rem;text-decoration:none}.seg a+a{border-left:1px solid var(--line)}.seg a[aria-current]{background:var(--ink);color:var(--paper)}
.figs{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));border:1px solid var(--line);overflow:hidden;margin-bottom:1rem}
.figs>div{padding:.75rem;border:0 solid var(--line);border-width:0 1px 1px 0;margin:0 -1px -1px 0}.fig{font-size:1.6rem;font-variant-numeric:tabular-nums;line-height:1.1}.figs .accent{color:var(--accent)}
.days{display:flex;align-items:flex-end;gap:2px;height:90px;border-bottom:1px solid var(--line)}.days i{flex:1;height:max(var(--h),1px);background:var(--accent);opacity:.85}.days i:hover{opacity:1}
.axis{display:flex;justify-content:space-between;font-size:12px;color:var(--soft);margin:.25rem 0 1.25rem}
.band{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.25rem 2rem;margin-bottom:1.5rem}
.row{display:grid;grid-template-columns:minmax(0,1.4fr) 1fr auto;gap:.5rem;align-items:center;padding:.15rem 0}.row>span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar{height:6px;background:var(--line)}.bar i{display:block;height:100%;width:var(--w);background:var(--accent)}
.none{color:var(--soft);margin:0}
.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:900px}td,th{padding:.3rem .5rem;border-top:1px solid var(--line);text-align:left;vertical-align:top}th{font-weight:600}tr.tag{background:var(--tint)}tr.mine td:first-child{box-shadow:inset 3px 0 var(--accent)}
</style>
<div class="top">
<h1>zaur.app visits</h1>
<nav class="seg" aria-label="Whose">${[["others", `Others · ${r.othersCount}`], ["mine", `Mine · ${r.mineCount}`], ["all", "All"]].map(([w, l]) => `<a href="${link({ who: w })}"${r.who === w ? ' aria-current="true"' : ""}>${l}</a>`).join("")}</nav>
<nav class="seg" aria-label="Period">${DAYS.map((d) => `<a href="${link({ days: d, tag: null })}"${!r.tag && r.days === d ? ' aria-current="true"' : ""}>${PERIOD[d]}</a>`).join("")}</nav>
<span class="hint">${r.tag ? `tag ${esc(r.tag)}, all time · <a href="${link({ tag: null })}">clear</a>` : `${r.from} – ${r.today}`}</span>
</div>
<div class="figs">
<div><div class="fig accent">${r.visits}</div><small>visits${delta ? ` · ${delta}` : ""}</small></div>
<div><div class="fig">${secs(r.median)}</div><small>typical time in view</small></div>
<div><div class="fig">${r.depth == null ? "—" : r.depth + "%"}</div><small>read, on average</small></div>
<div><div class="fig">${r.clicked}%</div><small>opened something</small></div>
<div><div class="fig">${r.phones}%</div><small>on a phone</small></div>
</div>
${
  r.bars.length
    ? `<div class="days" role="img" aria-label="Visits per ${r.days === 1 ? "hour" : "day"}, at most ${peak}">${r.bars.map((b) => `<i style="--h:${(100 * b.n) / peak}%" title="${b.label}: ${b.n}"></i>`).join("")}</div><div class="axis"><span>${r.bars[0].label}</span><span>at most ${peak} a ${r.days === 1 ? "hour" : "day"}</span><span>${r.bars.at(-1).label}</span></div>`
    : ""
}
<div class="band">
${barList("Came from", r.sources, r.visits, (k) => SOURCES[k])}
${barList("Referrers", r.refs, r.visits)}
${barList("Opened", r.opened, r.visits)}
${barList("Time zones", r.places, r.visits)}
${barList("Languages", r.langs, r.visits)}
${barList("Systems", r.systems, r.visits)}
${barList(`Screens${r.dark == null ? "" : ` · ${r.dark}% in dark mode`}`, r.screens, r.visits)}
<section><h2>Tagged links</h2>${
    r.tags.map(([t, n, last]) => `<div class="row"><a href="${link({ tag: t })}">${esc(t)}</a><span class="hint">${when(last)}</span><span class="n">${n}</span></div>`).join("") ||
    '<p class="none">None yet. Hand out zaur.app/?r=company</p>'
  }</section>
</div>
<h2>Latest visits${r.visits > r.recent.length ? ` · ${r.recent.length} of ${r.visits}` : ""}</h2>
<div class="scroll"><table><tr><th>When</th><th>From</th><th>Where</th><th>Device</th><th class="n">Time</th><th class="n">Read</th><th>Opened</th></tr>${
    r.recent
      .map(
        (v) =>
          `<tr class="${[v.tag && "tag", r.who === "all" && v.mine && "mine"].filter(Boolean).join(" ")}"><td>${when(v.t)}</td><td>${v.tag ? `<a href="${link({ tag: v.tag })}">${esc(v.tag)}</a>` : esc(v.ref || (v.src === "social" ? v.browser : SOURCES[v.src]))}${v.hash ? ` <small>${esc(v.hash)}</small>` : ""}</td><td>${esc(v.tz)} · ${esc(v.lang)}</td><td>${device(v)} <small>${v.w ?? ""}${v.h ? `×${v.h}` : ""}${v.screen ? ` of ${v.screen.replace("x", "×")} @${v.dpr}` : ""}${v.os ? `<br>${esc(v.os)} · ${esc(v.browser)}${v.dark ? " · dark" : ""}` : ""}</small></td><td class="n">${secs(v.secs)}</td><td class="n">${v.depth == null ? "—" : v.depth + "%"}</td><td>${esc(v.clicks?.join(" · "))}</td></tr>`,
      )
      .join("") || '<tr><td colspan="7" class="hint">No visits in this period.</td></tr>'
  }</table></div>
<p class="hint">This device is now marked as yours. A visit counts under Mine when it came from a marked device, or looks like one: the same time zone, language, width and device type, and the same screen, density and system where both visits recorded them.</p>
<script>try{sessionStorage.zaurOwner||navigator.sendBeacon("/api/hit",JSON.stringify({k:"owner",id:crypto.randomUUID().slice(0,12),tz:Intl.DateTimeFormat().resolvedOptions().timeZone,lang:navigator.language,w:innerWidth,screen:screen.width+"x"+screen.height,dpr:devicePixelRatio}));sessionStorage.zaurOwner=1}catch{}
setInterval(()=>document.visibilityState==="visible"&&location.reload(),15000)</script>`;
  res.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "set-cookie": `${OWNER}; Path=/; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`,
  });
  res.end(html);
}
