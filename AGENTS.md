# AGENTS.md

## Cursor Cloud specific instructions

This is the **Zaur** pnpm monorepo (`pnpm@10.32.1`, Node 22). Standard setup is `pnpm install`
(see `README.md`). CSS for `@zaur/ui` is built automatically by `predev`/`prestart` hooks, so no
separate build step is needed before running the apps.

### Apps, dev commands, and ports

Root scripts live in `package.json`; see `README.md` for the canonical list.

| App | Dev command | Default port | Notes |
|-----|-------------|--------------|-------|
| `@zaur/web` (landing) | `pnpm dev:web` | 5173 | Fully standalone; no backend needed |
| `@zaur/webmail` | `pnpm dev:webmail` | 5173 | SvelteKit/Vite; needs a JMAP backend for real login |
| `@zaur/register` | `pnpm dev:register` | 3000 | Express; needs Stalwart admin creds for real signups |

- **Port collision:** `web` and `webmail` both default to Vite port **5173**. To run them at the
  same time, override one, e.g. `pnpm dev:webmail --port 5174`.

### Native mobile direction

The accepted mobile architecture is
[`docs/decisions/0001-native-mobile-architecture.md`](docs/decisions/0001-native-mobile-architecture.md):
a Kotlin Multiplatform protocol/data core with SwiftUI on iOS and Jetpack Compose on Android.
`apps/mobile` is planned but has not been scaffolded.

Native clients connect directly to Stalwart OAuth/JMAP and the public Register API. Do not make
them depend on webmail's SvelteKit `/api/*` proxy, httpOnly session cookies, RxDB/Dexie, Svelte
stores, or Web Push. The detailed integration boundary is in
[`docs/mobile.md`](docs/mobile.md).

### Env files

- `webmail` and `register` read `.env` (copy from each app's `.env.example`). A `SESSION_SECRET`
  is only strictly required when `NODE_ENV=production`; in dev the apps boot without it. `@zaur/web`
  needs no env. These `.env` files are gitignored and are NOT recreated by the update script — copy
  them from `.env.example` when setting up.
- `register` reads `STALWART_URL` (and `STALWART_JMAP_PATH`, `REGISTRATION_OPEN`) from its `.env`,
  but Stalwart admin credentials come from injected secrets: `STALWART_TOKEN` (preferred) or
  `STALWART_ADMIN_PASSWORD` (used with `STALWART_ADMIN_USER=admin`). Set `REGISTRATION_OPEN=true` in
  `register/.env` to enable open (non-invite) signup in dev.

### External-service gotchas (important for "full" e2e testing)

- **Webmail login** posts to the JMAP server at `PUBLIC_JMAP_SERVER_URL` (default the live
  `https://mail.zaur.app`). Logging in requires a **real mailbox account** — there is no local mail
  server in this repo. To exercise the core webmail UI *without* auth, use the unauthenticated
  "lab" routes: `/floating-compose-lab`, `/recipient-lab`, `/list-lab`, `/toast-lab`,
  `/search-lab`, `/folder-tree-lab`, `/email-frame-lab`, `/settings-search-lab`. The `(app)` routes
  (inbox, calendar, settings) redirect to `/login` without a session.
- **Register** talks to Stalwart's admin JMAP API and needs `STALWART_TOKEN` **or**
  `STALWART_ADMIN_USER`/`STALWART_ADMIN_PASSWORD`. Without them the portal loads but shows
  "Unable to load domains" and `/api/check-username` returns 502 — this is expected, not a bug.
  `/api/captcha` works standalone.
- **Register signup writes to `/app/data` by default** (`INVITATIONS_AUDIT_PATH`,
  `PASSWORD_RESET_TOKENS_PATH` in `lib/invitations.js` / `lib/password-reset.js`) — the production
  persistent-volume path. Locally that fails with `EACCES: permission denied, mkdir '/app/data'` and
  the UI shows a generic "Registration could not be completed" error. Point both env vars at a
  local writable dir (e.g. `/workspace/apps/register/.data/...`) in `register/.env` to finish
  signups locally. Note: a successful signup creates a **real mailbox** on the live `mail.zaur.app`
  server — delete test accounts afterward (`node -e "require('dotenv').config();
  require('./lib/stalwart').deleteAccountByEmail('user@zaur.app')"` from `apps/register/`).

### Lint / test / build

Commands are defined in root `package.json` (`check:webmail`, `test:webmail`, `build:webmail`,
`build:web`). `test:webmail` uses `node --test`; e2e (`test:register`, webmail `test:e2e`) uses
Playwright and points at running/remote instances.
