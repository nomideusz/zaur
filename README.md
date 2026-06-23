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
  auth/          Zitadel + passkey-first webmail setup
  mail/          Stalwart ops notes
  deploy/        CapRover captain-definition templates
```

## Deploy

GitHub Actions deploy **webmail** and **register** to CapRover on push to `main` when their paths change. Webmail uses the monorepo root as Docker context; **register** deploys a self-contained tarball of `apps/register/` (CSS is vendored into `public/zaur.css` at build time).

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
