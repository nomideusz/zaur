# Zaur

Monorepo for the Zaur email platform and its pixel dinosaur mascot.

## Apps

| App | Package | URL | Deploy |
|-----|---------|-----|--------|
| **Webmail** | `@zaur/webmail` | [webmail.zaur.app](https://webmail.zaur.app) | CapRover |
| **Register** | `@zaur/register` | [register.zaur.app](https://register.zaur.app) | CapRover |
| **Dinosaurus** | `@zaur/dinosaurus` | [dino.zaur.app](https://dino.zaur.app) | CapRover |
| **Dino archive** | `@zaur/dinosaurus-archive` | [dino-archive.zaur.app](https://dino-archive.zaur.app) | CapRover |
| **Music** | Navidrome (dinosaurus radio) | [music.zaur.app](https://music.zaur.app) | CapRover |

Mail server (`mail.zaur.app`) is Stalwart — config and ops notes live in [`infra/mail/`](infra/mail/).

## Packages

| Package | Purpose |
|---------|---------|
| `@zaur/sprite` | Zaur pixel sprite frames + SVG renderer (shared by webmail and dinosaurus) |
| `@zaur/ui` | Shared design tokens, components CSS, and utilities (webmail + register) |

## Setup

```sh
pnpm install
```

### Development

```sh
pnpm dev:webmail       # http://localhost:5173
pnpm dev:dinosaurus    # http://localhost:5173 (vite)
pnpm dev:register       # http://localhost:3000
```

Archive server (dinosaurus backend):

```sh
cd apps/dinosaurus/server && pnpm install && pnpm dev
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
  webmail/       SvelteKit JMAP client
  dinosaurus/    Zaur's world (Vite + archive server)
  register/      Stalwart account registration portal
packages/
  sprite/        Shared Zaur pixel art
  ui/            Shared design system (tokens, CSS, cn utility)
infra/
  auth/          Zitadel + passkey-first webmail setup
  mail/          Stalwart ops notes
  listenbrainz-ingest/  LB recommendations → mediacms-ingest → Navidrome
  deploy/        CapRover captain-definition templates
```

## Deploy

GitHub Actions deploy **webmail** and **register** to CapRover on push to `main` when their paths change. Webmail uses the monorepo root as Docker context; **register** deploys a self-contained tarball of `apps/register/` (CSS is vendored into `public/zaur.css` at build time).

Local deploy (requires `caprover login`):

```sh
pnpm deploy:webmail
pnpm deploy:register
```

Dinosaurus runs on CapRover (Contabo VPS) as three apps: `dino` (frontend),
`dino-archive` (API + realtime + radio proxy), and `music` (Navidrome). Captain
definitions live in `infra/deploy/dino*.captain-definition` and
`infra/deploy/music.captain-definition`. Local deploy:

```sh
pnpm deploy:dino
pnpm deploy:dino-archive
pnpm deploy:music
```

## Migrating from standalone repos

This monorepo was assembled with `git subtree` from:

- `nomideusz/webmail`
- `nomideusz/dinosaurus`
- `nomideusz/register`

History is preserved under each `apps/*` prefix. Point remotes at a new `zaur` repository when ready, then archive the old repos.
