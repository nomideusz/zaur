# ZAUR Webmail

A fast, offline-capable webmail client for [ZAUR](https://zaur.app) accounts. Built with SvelteKit and JMAP.

Live at [webmail.zaur.app](https://webmail.zaur.app).

## Features

- **Mail** — inbox, folders, search, compose, reply/forward, attachments, quick reply
- **Contacts** — built from mail history, manual add, search integration
- **Calendar** — month view, create and edit events
- **Offline** — cached threads and an outbox queue for sending when back online
- **Settings** — theme, list density, external content blocking, read/notify behavior, display name, signature (synced to your JMAP account across devices)

Keyboard shortcuts: `c` compose, `/` search, `Ctrl+Enter` send, `Esc` close compose.

## Requirements

- Node.js 22+
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
| `SESSION_SECRET` | **Required in production** — encrypts the httpOnly session cookie |

## Scripts

```sh
pnpm dev      # development server
pnpm build    # production build
pnpm preview  # preview production build
pnpm check    # TypeScript + Svelte checks
```

## Deploy

The app uses `@sveltejs/adapter-node` and ships with a multi-stage Dockerfile. Set `SESSION_SECRET` in your runtime environment.

```sh
docker build -t zaur-webmail .
docker run -p 3000:3000 -e SESSION_SECRET=... zaur-webmail
```

CapRover deployment is configured via `.github/workflows/deploy-caprover.yml`.

## Architecture

See `src/lib/architecture.ts` for the route map and component tree. Client-side mail data is stored in IndexedDB (RxDB/Dexie) per account; credentials live in an encrypted httpOnly cookie on the server.
