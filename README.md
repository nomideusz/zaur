# Zaur

Monorepo for the Zaur communications suite — Mail, Chat, Discuss.

> The pixel-dinosaur app (`dino` / `dino-archive` / `music`) was extracted to
> its own repo at `../dino`. The shared `@zaur/sprite` mascot frames stay here.

The suite lives across subdomains: **Mail** (`register.zaur.app` + `webmail.zaur.app`),
**Chat** (`chat.zaur.app`, Once Campfire), and **Discuss** (`discourse.zaur.app`, Discourse).
The apex `zaur.app` is the marketing landing site (`@zaur/web`).

## Apps

| App | Package | URL | Deploy |
|-----|---------|-----|--------|
| **Web** (landing) | `@zaur/web` | [zaur.app](https://zaur.app) | CapRover |
| **Webmail** | `@zaur/webmail` | [webmail.zaur.app](https://webmail.zaur.app) | CapRover |
| **Register** | `@zaur/register` | [register.zaur.app](https://register.zaur.app) | CapRover |

Mail server (`mail.zaur.app`) is Stalwart — config and ops notes live in [`infra/mail/`](infra/mail/).

## Packages

| Package | Purpose |
|---------|---------|
| `@zaur/sprite` | Zaur pixel sprite frames + SVG renderer (shared by web and webmail) |
| `@zaur/ui` | Shared design tokens, components CSS, and utilities (webmail + register) |

> **Parked (2026-07-08):** the Kotlin Multiplatform rewrite of webmail is deliberately
> on hold until thebest.travel and szkolyjogi.pl QR ticketing have shipped. The Svelte
> webmail keeps running as-is; don't start the rewrite before then.

## Setup

```sh
pnpm install
```

### Development

```sh
pnpm dev:web           # http://localhost:5173 (landing site)
pnpm dev:webmail       # http://localhost:5173
pnpm dev:register       # http://localhost:3000
```

### Build & check

```sh
pnpm build:webmail
pnpm check:webmail
pnpm test:webmail
```

## Structure

```
apps/
  web/           SvelteKit static landing site (zaur.app)
  webmail/       SvelteKit JMAP client
  register/      Stalwart account registration portal
packages/
  sprite/        Shared Zaur pixel art
  ui/            Shared design system (tokens, CSS, cn utility)
infra/
  auth/          Retired Logto notes; Stalwart is the auth authority
  mail/          Stalwart ops notes
  deploy/        CapRover captain-definition templates
```

## Deploy

GitHub Actions deploy **web** and **register** to CapRover on push to `main` when their
paths change. Webmail CI gates pushes with checks, unit tests, a production build,
and browser smoke tests; Dokploy then builds `apps/webmail/Dockerfile`.

Local deploy (requires `caprover login`):

```sh
pnpm deploy:web
pnpm deploy:webmail
pnpm deploy:register
```

## Migrating from standalone repos

This monorepo was assembled with `git subtree` from:

- `nomideusz/webmail`
- `nomideusz/dinosaurus`
- `nomideusz/register`

History is preserved under each `apps/*` prefix. Point remotes at a new `zaur` repository when ready, then archive the old repos.
