# Stats

One dashboard for every site, at **stats.zaur.app**: one sign-in, one small beacon, one SQLite file.

- `static/s.js` is the tracker. No cookie, and no id that outlives a page.
- `POST /api/hit` takes its beacons. The site is read from the request's `Origin`, and an origin that isn't in `src/lib/sites.ts` is dropped.
- `/` stacks every site's line on one scale, `/s/<site>` is a report (`/s/all` for everything, `?view=visits` for its visit log), and `/s/<site>/live` streams the last hour and day. Whose visits and the period are `?who=` and `?days=` on all of them, `?chart=days` draws the overview and reports as a line stepping once a day. O opens the overview, A all sites and a site's number key that site. Rows on the overview can be dragged into your own order or ranked by any figure column from its head, both kept in the `prefs` table.
- A row of a report's list narrows the report to it (`?under=` for a page and all under it, `?path=`, `?source=`, `?ref=`, `?place=`, `?network=`, `?lang=`, `?system=`, `?screen=`, together if several). The visit log is ordered from its column heads (`?sort=` and `?dir=`) over the whole period, 100 visits to a `?page=`.
- The look is its own, in `DESIGN.md`, and doesn't use `@zaur/ui`. Fonts are self-hosted through `@fontsource-variable`.
- Signing in goes through Zaur (mail2 is the OIDC issuer), and only addresses in `STATS_ADMINS` get in.

## Adding a site

Add a line to `SITES` in `src/lib/sites.ts`, then put the tag on the site:

```html
<script defer src="https://stats.zaur.app/s.js"></script>
```

If the site has a CSP, add `https://stats.zaur.app` to its `script-src` and `connect-src`.

A site made of parts worth reading apart, as svelte.zaur.app is of its packages, lists them in the entry's `parts`: a name and a path each. It stays one site with one tag and one row on the overview; its report lists the parts, and a row narrows the report to the pages at and under that path (`?under=/calendar`).

Paths in an address that hold a secret go in the entry's `skip` and again in the tag's `data-skip`. The server drops them whatever the tag does. A signed-in app gets `detail: false`, and serves its own copy of `s.js` with `data-api` and `data-detail="off"`, so a stats compromise can't run code on that origin. `tests/ingest.test.ts` checks the copies stay identical.

The headline figure everywhere is **visits**: arrivals from outside the site, by people (not yours, not bots, unless the tab says so). A click from one page to another is the same visit, and so is the same browser coming back from outside within half an hour of its last page (`again`, `src/lib/server/visits.ts`: told by address and user agent, hashed in memory for the half hour and never written; rows from before 2026-11-14, and the half hour after a restart, by what the row holds). Pages opened are the detail under it, and the Log lists each.

## What is kept

A row is a page opened: path, source, referrer host, language, screen, browser and OS names, and how long it stayed in view. Places and networks come from DB-IP's free databases, downloaded to `GEO_DIR` (about 140 MB, held in memory; CC BY 4.0, credited in the footer). The address itself is never stored. zaur.app alone also sends addresses to ipapi.is (`lookup` in `sites.ts`), as it did before this app. Rows are kept for 90 days, except zaur.app's.

**Mine** is decided when a view arrives: `?stats=me` on the site, a site's own owner cookie (`data-me-cookie`), an address an admin opened this dashboard from in the last 60 days (held as a keyed hash), or a network in `OWN_NETWORKS`.

**Bots** are taken out of Others and All and get a tab of their own. The ones that announce themselves never get in (`isBot` in `ingest.ts`); the rest run real browsers, so `src/lib/server/bots.ts` looks for a browser that doesn't fit where it is: a clock on UTC, a big cloud's address with a clock outside Europe (Microsoft's Safe Links, crawlers), a clock no one in the address's country keeps on a view that never sent its end beacon (residential proxies, like kurcz.pl's), and Puppeteer's 800×600 screen. A row's verdict is its `bot` column, written on arrival and again when its end or its place comes in, and every boot runs the current rules over every row. `src/lib/server/zones.json`, which countries keep which time zone, comes from the system's tzdata through `node scripts/zones.mjs`.

## Running

```bash
cp .env.example .env   # set STATS_DEV_USER to skip the sign-in locally
pnpm dev               # http://localhost:5177
pnpm test
pnpm check
```

`s.js` does nothing on localhost, so test beacons need a real origin.

Deploy from the repo root with `apps/stats/Dockerfile` and context `.`, with a volume on `/data`. Register a `stats` client with redirect `https://stats.zaur.app/auth/callback` in mail2's `OIDC_PROVIDER_CLIENTS`.

`scripts/import.ts` brings in the visits of the old counters; its header has the commands.
