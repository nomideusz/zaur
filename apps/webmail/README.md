# ZAUR Webmail

A fast, offline-capable webmail client for [ZAUR](https://zaur.app) accounts. Built with SvelteKit and JMAP.

Live at [webmail.zaur.app](https://webmail.zaur.app).

## Features

- **Mail** — inbox, folders, search (with operators like `from:` and `has:attachment`), compose, reply/forward, attachments, quick reply, undo for archive/delete
- **Contacts** — device-local contacts built from mail history, manual add, search integration
- **Calendar** — week, day, and agenda views; create and edit events
- **Offline** — cached threads and an outbox queue for sending when back online
- **Settings** — synced preferences across devices (JMAP account blob), settings search, and export/import
- **Authentication** — branded ZAUR password/TOTP sign-in backed by Stalwart OAuth Authorization Code + PKCE; passwords and codes are never stored
- **Security** — password, TOTP, recovery email, app passwords, browser sessions, and scoped API keys

### Settings overview

| Page | Contents |
| --- | --- |
| **Account** | Profile (name, signature), appearance (theme, reduce motion), notifications & actions, calendar, device (app install), security, mailbox, sync & data (export/import, clear cache, reset preferences) |
| **Security** | Password, authenticator app, recovery email, app passwords, ZAUR browser sessions, and API keys |
| **Reading** | Inbox & folders, time format, text size, typeface, message rendering (plain text, remote images, threads, clean view) |
| **Writing** | Compose format, reply mode, Cc/Bcc, contact suggestions, signature, confirmations, undo send delay |
| **Shortcuts** | Keyboard shortcuts toggle and reference (desktop only) |

Keyboard shortcuts (when enabled): `c` compose, `/` search, `g` then `i`/`s`/`d`/`a`/`t`/`j` go to folder, `j`/`k` next/previous, `n` next unseen, `r` reply, `a` reply all, `f` forward, `d` not important, `u` toggle important, `#` trash, `Ctrl+Enter` send, `Esc` back/close compose.

## Requirements

- Node.js 22
- pnpm
- A ZAUR JMAP account (defaults to `https://mail.zaur.app`)

## Setup

```sh
pnpm install
cp .env.example .env
# Set SESSION_SECRET to a random string (min 32 chars) before production deploy
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

## Environment

| Variable | Description |
| --- | --- |
| `PUBLIC_JMAP_SERVER_URL` | JMAP server URL (default: `https://mail.zaur.app`) |
| `PUBLIC_APP_NAME` | App title shown in the UI |
| `SESSION_SECRET` | **Required in production** — seals credentials in the server-side session store; the cookie contains only an opaque id |
| `STORE_DB_PATH` | Session and rate-limit SQLite database (default: `.data/store.sqlite`) |
| `TRUSTED_PROXY_HOPS` | Trusted proxy count used when resolving client IPs for rate limits |
| `PUBLIC_SENTRY_DSN` | Optional Sentry DSN for browser and server error reporting |
| `STALWART_OAUTH_ENABLED` | Enables custom ZAUR token-only sign-in through Stalwart OAuth/PKCE |
| `STALWART_OAUTH_CLIENT_ID` | Registered Stalwart OAuth client id |
| `STALWART_OAUTH_REDIRECT_URI` | Exact callback URI registered for the OAuth client |
| `REGISTER_INTERNAL_URL` | Register service base URL for verified recovery-email changes |
| `REGISTER_INTERNAL_SECRET` | HMAC secret shared with the register service |

## Scripts

```sh
pnpm dev      # development server
pnpm build    # production build
pnpm preview  # preview production build
pnpm check    # TypeScript + Svelte checks
pnpm test     # unit tests
pnpm test:e2e:labs  # unauthenticated component smoke tests
pnpm test:e2e:auth  # Stalwart smoke tests (requires E2E_MAIL_EMAIL/PASSWORD)
```

After adding or renaming settings rows, regenerate the search index and Essential-mode counts:

```sh
node scripts/generate-settings-index.mjs
```

## Deploy

The app uses `@sveltejs/adapter-node` and ships with a multi-stage Dockerfile. Dokploy builds
`apps/webmail/Dockerfile` after the Webmail CI workflow passes. Set `SESSION_SECRET` and mount
`/app/.data` on persistent storage so sessions, rate limits, and push subscriptions survive deploys.

```sh
docker build -t zaur-webmail .
docker run -p 3000:3000 -e SESSION_SECRET=... zaur-webmail
```

The root `deploy:webmail` script remains available for manual CapRover deployments.

## Architecture

See `src/lib/architecture.ts` for the route map and component tree. Client-side mail data is stored
in IndexedDB (RxDB/Dexie) per account. Only Stalwart OAuth access and refresh tokens are sealed with
AES-256-GCM in the server-side SQLite session store; the secure httpOnly cookie contains only an
opaque session id. Mailbox passwords and TOTP codes exist only for the duration of the authentication
request. Multi-account tokens stay isolated within the current browser session.
