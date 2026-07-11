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
| **Webmail** | `@zaur/webmail` | [webmail.zaur.app](https://webmail.zaur.app) | Dokploy |
| **Register** | `@zaur/register` | [register.zaur.app](https://register.zaur.app) | Dokploy |
| **Native Mail** (planned) | `apps/mobile` | iOS + Android | App Store + Google Play |

Mail server (`mail.zaur.app`) is Stalwart — config and ops notes live in [`infra/mail/`](infra/mail/).

## Packages

| Package | Purpose |
|---------|---------|
| `@zaur/sprite` | Zaur pixel sprite frames + SVG renderer (shared by web and webmail) |
| `@zaur/ui` | Shared design tokens, components CSS, and utilities (webmail + register) |

## Native mobile

ZAUR Mail will ship platform-native iOS and Android clients alongside the webmail. Kotlin
Multiplatform shares the JMAP, OAuth, offline data, and synchronization core; SwiftUI provides the
iOS interface and Jetpack Compose provides the Android interface. This is a sibling client
initiative, not a rewrite or retirement of the SvelteKit webmail.

See [ADR-0001](docs/decisions/0001-native-mobile-architecture.md) for the decision and
[the mobile integration roadmap](docs/mobile.md) for boundaries and milestones.

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
  mobile/        Planned KMP core + native SwiftUI and Compose clients
packages/
  sprite/        Shared Zaur pixel art
  ui/            Shared design system (tokens, CSS, cn utility)
docs/
  decisions/     Architecture decision records
  mobile.md      Native client integration contract and roadmap
infra/
  auth/          Stalwart identity architecture and retired Logto notes
  mail/          Stalwart ops notes
  deploy/        Legacy auth/Logto provisioning scripts
```

## Deploy

All apps deploy via Dokploy, which auto-builds their Dockerfiles on push to
`main` — no manual deploy step. Webmail CI gates changes with checks, unit
tests, a production build, and browser smoke tests.
