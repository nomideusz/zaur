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
| `@zaur/mail2` | `pnpm dev:mail2` | 5175 | Mail 2.0 rebuild ([ADR-0005](docs/decisions/0005-mail-2.0.md)); remote functions + light tokens; own `/login` (Stalwart OAuth in prod, password fallback in dev) via `@zaur/server-auth`; 1.0 session sharing remains as a fallback |
| `@zaur/music` | `pnpm dev:music` | 5176 | Zaur Music PWA over Navidrome (music.zaur.app); Zaur sign-in as an OIDC client of mail2, one Navidrome user per address; "Add from YouTube" runs yt-dlp + ffmpeg into `<MUSIC_DIR>/YouTube`. See `apps/music/.env.example` |
| `@zaur/register` | `pnpm dev:register` | 3000 | Express; needs Stalwart admin creds for real signups. Styled with mail2's design system: `src/app.css` imports mail2's `tokens.css`/`base.css`, built to the committed `public/app.css` by `pnpm --filter @zaur/register build:css` (no build step in Docker, so rebuild and commit after touching either side) |


### Native mobile direction

The accepted mobile architecture is
[`docs/decisions/0001-native-mobile-architecture.md`](docs/decisions/0001-native-mobile-architecture.md):
a Kotlin Multiplatform protocol/data core with SwiftUI on iOS and Jetpack Compose on Android.
`apps/mobile` is planned but has not been scaffolded.

Native clients connect directly to Stalwart OAuth/JMAP and the public Register API. Do not make
them depend on the web client's SvelteKit routes, httpOnly session cookies, Svelte stores, or
Web Push. The detailed integration boundary is in
[`docs/mobile.md`](docs/mobile.md).

### Env files

- `mail2` and `register` read `.env` (copy from each app's `.env.example`). A `SESSION_SECRET`
  is only strictly required when `NODE_ENV=production`; in dev the apps boot without it. `@zaur/web`
  needs no env. These `.env` files are gitignored and are NOT recreated by the update script — copy
  them from `.env.example` when setting up. `@zaur/mail2` reads its session variables
  (`SESSION_SECRET`, `STORE_DB_PATH`, `SESSION_COOKIE_DOMAIN`) through `@zaur/server-auth`, which
  reads `process.env` directly — SvelteKit does **not** put `.env` values there, so mail2's dev
  script loads its `.env` itself (`node --env-file-if-exists=.env`). See the mail2 README's
  "Testing over the network" section for tunnel hostnames, which additionally need
  `SESSION_COOKIE_DOMAIN` and `server.allowedHosts`, already configured.
- `register` reads `STALWART_URL` (and `STALWART_JMAP_PATH`, `REGISTRATION_OPEN`) from its `.env`,
  but Stalwart admin credentials come from injected secrets: `STALWART_TOKEN` (preferred) or
  `STALWART_ADMIN_PASSWORD` (used with `STALWART_ADMIN_USER=admin`). Set `REGISTRATION_OPEN=true` in
  `register/.env` to enable open (non-invite) signup in dev.

### External-service gotchas (important for "full" e2e testing)

- **Webmail (mail2) login** goes to the JMAP server at `https://mail.zaur.app` and needs a **real
  mailbox account** — there is no local mail server in this repo.
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

Commands are defined in root `package.json` (`check:mail2`, `test:mail2`, `build:mail2`,
`build:web`). `test:mail2` uses `node --test`; e2e (`test:register`) uses Playwright and points at
running/remote instances.

