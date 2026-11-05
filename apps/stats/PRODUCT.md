# Product

<!-- impeccable:product-schema 1 -->

Scope: **Stats** (`apps/stats`), at stats.zaur.app. It has its own product record because it reports on sites outside the Zaur suite as well as inside it. It also has its own look, chosen deliberately on 2026-11-05: the suite's `DESIGN.md` and `@zaur/ui` don't bind it.

## Platform

web

## Users

**The owner.** Only addresses listed in `STATS_ADMINS` can read it, and a Zaur account alone isn't enough. The reader owns the sites being counted.

The owner comes for four jobs:

- **A quick check across sites:** is anything moving, and which site changed against the month before.
- **Digging into one site:** where people came from, which pages they opened, where they are and how long pages stayed in view, to decide what to work on.
- **Checking tagged links:** whether a specific link handed out (`?r=company`) brought anyone.
- **Watching live:** keeping `/s/<site>/live` open during a launch or a post while visits arrive.

## Product Purpose

One dashboard for every site the owner runs: one sign-in, one small beacon, one SQLite file. It replaced separate counters on each site.

Success means the owner can answer "what happened on my sites?" here, without a third-party analytics service and without following anyone from page to page.

## Positioning

- **Self-run and first-party.** The dashboard, the beacon and the store all run on the owner's own server. Places and networks come from offline DB-IP databases.
- **It keeps little.** There is no cookie and no id that outlives a page. The visitor's address is read to find a place and network, then dropped; only an admin's address is kept, as a keyed hash for 60 days, to mark their visits as Mine. Rows last 90 days, except zaur.app's.
- **It separates the owner's visits from everyone else's.** The Mine and Others split is decided when a view arrives, so the owner's own browsing doesn't inflate the numbers.

## Operating Context

- **`/` is the overview:** one row per site, ranked by traffic, with its line through the period on one shared scale, where its visits came from, its change, today and the last 5 minutes. Totals sit at the foot.
- **`/s/<site>` is the report,** and `/s/all` covers everything. Its Summary holds a stack of days through their hours, or a column a day, figures, and lists of sources, pages, tagged links, referrers, places, networks, opened links, languages, systems and screens. Its Visits tab holds the latest visits.
- **`/s/<site>/live` streams** the last hour and day.
- **Sites report through a tag.** A site joins by adding a line to `SITES` in `src/lib/sites.ts` and putting the tag on its pages.

## Capabilities and Constraints

- **Where it's read:** mostly at a desk, so wide screens lead. On a phone, the overview and live pages have to be excellent for a glance; the report only has to be readable.
- **The visit log:** the owner looks at it now and then. Totals and lists come first, and the log stays one step away instead of lengthening the page.
- **Stack:** SvelteKit with Svelte 5 and Tailwind v4, using SQLite. Sign-in is OIDC, with mail2 as the issuer.
- **Sites counted:** zaur.app, szkolyjogi.pl, thebest.travel, kompi.pl, kino.net.pl, festivals.zaur.app, kurcz.pl, Zaur Mail, Zaur Music and Zaur Register. A beacon from an origin not in `SITES` is dropped.
- **What a row holds:** a page opened, with its path, source, referrer host, time zone, language, window and screen size, dark mode, device, browser and OS names, how long it stayed in view and how far it was read, plus a city, region, country and network. Never the address itself. Sites with detail on also keep the tag, the hash, clicks and the time each section was in view.
- **Secrets in addresses:** paths that hold a secret or belong to an owner's panel are skipped by the tag (`data-skip`) and again by the server (`skip`). `mask` keeps a page but hides what it names, such as Music's albums and playlists.
- **Signed-in apps report less:** Mail, Music and Register run with `detail: false`, because a click's label or link could be somebody's mail. They serve their own copy of `s.js`, so a compromise of Stats can't run code on their origins.
- **The one third-party exception:** zaur.app alone sends addresses to ipapi.is (`lookup` in `sites.ts`). Every other site stays on the offline databases.
- **Terminology:**
  - *Pages opened* is the count; it does not claim to count people.
  - *Arrivals from outside* are views that weren't a move within the site, direct visits included.
  - *Mine* and *Others* divide the owner's visits from everyone else's.
  - A *tag* is the marker on a handed-out link.

## Brand Commitments

- **Name:** Stats.
- **Voice:** the suite's plain, specific English with British spelling, describing what was measured: "pages opened", "typical time in view", "Counted as yours".
- **Attribution:** DB-IP's CC BY 4.0 credit stays in the footer.

## Evidence on Hand

- The dashboard's own visit data, and `scripts/import.ts` for bringing in the old counters' visits.
- `tests/ingest.test.ts` covers what a beacon becomes.
- Do not invent visit figures or benchmarks; read them from the dashboard.

## Product Principles

1. **Keep less than you could.** A new measure has to be worth what it records about a visitor, and a visitor's address is never kept.
2. **Count what happened, and name it.** Labels say what was measured. Don't dress a page count up as people, or a guess as a fact.
3. **Answer from the first screen.** Is anything moving, and where? The overview answers that before anything is opened.
4. **Mail stays out of it.** Nothing from a signed-in app that could reveal someone's mail or library ever reaches a row.

## Accessibility & Inclusion

The suite's standard applies: text holds at least 4.5:1 in both themes, every action works by keyboard and is named for screen readers, light and dark follow the system, and reduced motion is respected.
