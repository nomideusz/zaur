# Stats

One dashboard for every site, at **stats.zaur.app**: one sign-in, one small beacon, one SQLite file.

- `static/s.js` is the tracker. No cookie, and no id that outlives a page.
- `POST /api/hit` takes its beacons. The site is read from the request's `Origin`, and an origin that isn't in `src/lib/sites.ts` is dropped.
- `/` stacks every site's line on one scale, `/s/<site>` is a report (`/s/all` for everything, `?view=visits` for its visit log), and `/s/<site>/live` streams the last hour and day. Whose visits and the period are `?who=` and `?days=` on all of them, and a site's number key opens it.
- The look is its own, in `DESIGN.md`, and doesn't use `@zaur/ui`. Fonts are self-hosted through `@fontsource-variable`.
- Signing in goes through Zaur (mail2 is the OIDC issuer), and only addresses in `STATS_ADMINS` get in.

## Adding a site

Add a line to `SITES` in `src/lib/sites.ts`, then put the tag on the site:

```html
<script defer src="https://stats.zaur.app/s.js"></script>
```

If the site has a CSP, add `https://stats.zaur.app` to its `script-src` and `connect-src`.

Paths in an address that hold a secret go in the entry's `skip` and again in the tag's `data-skip`. The server drops them whatever the tag does. A signed-in app gets `detail: false`, and serves its own copy of `s.js` with `data-api` and `data-detail="off"`, so a stats compromise can't run code on that origin. `tests/ingest.test.ts` checks the copies stay identical.

## What is kept

A row is a page opened: path, source, referrer host, language, screen, browser and OS names, and how long it stayed in view. Places and networks come from DB-IP's free databases, downloaded to `GEO_DIR` (about 140 MB, held in memory; CC BY 4.0, credited in the footer). The address itself is never stored. zaur.app alone also sends addresses to ipapi.is (`lookup` in `sites.ts`), as it did before this app. Rows are kept for 90 days, except zaur.app's.

**Mine** is decided when a view arrives: `?stats=me` on the site, a site's own owner cookie (`data-me-cookie`), an address an admin opened this dashboard from in the last 60 days (held as a keyed hash), or a network in `OWN_NETWORKS`.

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
