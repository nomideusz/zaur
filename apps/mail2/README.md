# @zaur/mail2 — Zaur Mail 2.0

The Mail 2.0 client (ADR-0005): a clean-room rebuild of the webmail UI on the
shared packages, following the redesign handoff's resolved variants. **Light
theme only** for now; Files and Meet arrive when their designs land.

## Status

- [x] Shell scaffold, remote functions enabled, design tokens (foundation slice)
- [x] Session-aware read path (mailbox → thread list → reader)
- [x] Floating multi-draft compose (panels, dock, schedule send, offline outbox)
- [x] Draft persistence (Drafts mailbox) + compose attachments
- [x] Own login (`/login` + sign out) — Stalwart OAuth credential flow in prod,
  password fallback in dev; 1.0 session sharing still works as a fallback
- [x] Settings page (`/settings`) + bulk selection actions
- [ ] Search via remote functions
- [ ] Calendar / Contacts (port from 1.0)
- [ ] OIDC provider flows (mail2 as an identity provider)
- [ ] Cutover checklist green

## Sign-in

Mail 2.0 has its own login at `/login` — no webmail detour. The gate lives in
`src/routes/(app)/+layout.server.ts`: no session → redirect to `/login`
(preserving the target path as `?next=`).

The credential flow reuses webmail 1.0's exactly, via the shared
`@zaur/server-auth` package:

- **Stalwart OAuth (production):** `authenticateStalwartCredentials` does a
  PKCE'd server-side POST to Stalwart's auth endpoint and exchanges the code
  for tokens — the session stores **tokens, never the password**. Needs the
  `STALWART_OAUTH_*` env block (see `.env.example`) and an OAuth client
  registered in Stalwart (`zaur-mail2-prod`, redirect
  `https://mail2.zaur.app/api/auth/oauth/callback`).
- **Password fallback (dev default):** with no OAuth config, credentials go
  via HTTP Basic to the JMAP server and the password is sealed in the session
  store. Works out of the box against the live mail server.
- Accounts with 2FA get the TOTP prompt (`mfa_required` → second submit with
  the six-digit code).
- Login attempts are rate-limited per client address and per account through
  the store-backed limiter (`#lib/server/login`), same budgets as webmail.
- Account **creation** stays with the register service (real mailboxes on
  Stalwart); the login page links to it via `PUBLIC_REGISTER_URL`.

Because both apps share the store/cookie/secret, a webmail 1.0 login still
lands you in mail2 and vice versa — sharing is now a feature, not a
dependency. Signing out in either app revokes the shared session record.

## Running

```sh
pnpm dev:mail2          # http://localhost:5175
```

Session sharing with webmail 1.0 is **optional** now. To test it locally, both
apps must point at **one shared session store**: the session cookie holds an
id that each app looks up in a SQLite file (`<cwd>/.data/store.sqlite` —
per-app by default). Copy `.env.example` to `.env` — it points mail2's
`STORE_DB_PATH` at webmail's store. With nothing set, mail2 signs in through
its own `/login` page (password fallback) and needs nothing from webmail.

In production the two apps run on sibling subdomains, which requires setting in
**both** apps' env:

```
SESSION_COOKIE_DOMAIN=.zaur.app   # parent domain so both hosts see the cookie
SESSION_SECRET=<same value>       # session records are sealed with it
STORE_DB_PATH=/data/store.sqlite  # same SQLite store for both apps
```

### Testing over the network (Cloudflare Tunnel)

Each dev server only answers Host headers it allows (`server.allowedHosts` in
its `vite.config.ts`): `webmail-dev.zaur.app` and `mail2-dev.zaur.app`. To
reach them from the internet while keeping all state on this machine:

1. Route two tunnel hostnames at the local ports with one `cloudflared`
   config, and create the CNAMEs (`cloudflared tunnel route dns <id> <name>`):

   ```yaml
   # ~/.cloudflared/config.yml
   tunnel: <id>
   credentials-file: ~/.cloudflared/<id>.json
   ingress:
     - hostname: webmail-dev.zaur.app
       service: http://localhost:5173
     - hostname: mail2-dev.zaur.app
       service: http://localhost:5175
     - service: http_status:404
   ```

2. Start both dev servers with the parent-domain cookie so the login made on
   `webmail-dev.zaur.app` is sent to `mail2-dev.zaur.app`:

   ```sh
   SESSION_COOKIE_DOMAIN=.zaur.app pnpm dev:webmail
   SESSION_COOKIE_DOMAIN=.zaur.app pnpm dev:mail2
   ```

   Keep the variable out of `.env` files: browsers reject a `.zaur.app`
   cookie coming from `localhost`, which would break plain localhost login.

3. Log in at `https://webmail-dev.zaur.app`, then open
   `https://mail2-dev.zaur.app`.

⚠️ A Vite dev server on the public internet serves unminified source and has
no auth of its own — fine for a quick test, take it down afterwards, or put a
Cloudflare Access policy on the `*-dev` hostnames. Production runs on
`webmail.zaur.app` — never point that name at a local port.

## Deploying (Dokploy)

Deployed like webmail: a Dokploy service builds `apps/mail2/Dockerfile` from
the repo root on every push to `main` (git auto-deploy), with
`.github/workflows/deploy-mail2.yml` as the pre-deploy quality gate.

The mail2 container signs in through **its own** `/login` (Stalwart OAuth
credential flow), but keeps the shared-store mount so 1.0↔2.0 session sharing
keeps working: both images default `STORE_DB_PATH=/app/.data/store.sqlite` —
point **both** Dokploy services' `/app/.data` mounts at the **same host
directory**.

Service settings (mirroring the webmail service):

| Setting | Value |
| --- | --- |
| Build type | Dockerfile — path `apps/mail2/Dockerfile`, context: repo root |
| Domain | `mail2.zaur.app` |
| Port | 3000 (`PORT`, `HOST`, `BODY_SIZE_LIMIT=50M` are baked into the image) |
| Env | `SESSION_SECRET=<same value as the webmail service>` |
| Env | `SESSION_COOKIE_DOMAIN=.zaur.app` |
| Env | `STALWART_OAUTH_ENABLED=true`, `STALWART_OAUTH_ISSUER_URL=https://mail.zaur.app` |
| Env | `STALWART_OAUTH_CLIENT_ID=zaur-mail2-prod`, `STALWART_OAUTH_REDIRECT_URI=https://mail2.zaur.app/api/auth/oauth/callback` |
| Env | `JMAP_INTERNAL_URL=http://mail:8080` |
| Volume | same host directory as webmail's `/app/.data` → `/app/.data` |

`SESSION_COOKIE_DOMAIN` must be set on the **webmail** service too (add it and
redeploy webmail — the Dockerfile there also needed a `packages/server-auth`
COPY fix for the next build). Without that variable webmail's cookie stays
scoped to `webmail.zaur.app` and mail2 never sees the login. `SESSION_SECRET`
is required in production: session records are sealed with it, and two apps
sharing one store must share the value.

## SvelteKit 3 (pre-release)

mail2 is on the SvelteKit 3 pre-release line (`3.0.0-next.27`, with
`adapter-node` `6.0.0-next.12` — both **pinned exact**; bump deliberately).
Kit 3 changes the layout from Kit 2:

- There is **no `svelte.config.js`** — all configuration lives in the
  `sveltekit({...})` plugin options in `vite.config.ts` (`adapter` and
  `experimental` are top-level there).
- `$lib` is removed — use `#lib` via subpath imports (`"imports": {"#lib/*":
  "./src/lib/*"}` in package.json, mirrored as `paths` in tsconfig.json).
- `tsconfig.json` extends `$app/tsconfig` (a symlinked package created by
  `svelte-kit sync`) and carries its own `include`/`exclude`.
- Remote functions are still gated by `experimental.remoteFunctions: true`;
  `query`, `query.live`, `command`, `form` and `getRequestEvent` come from
  `$app/server` as in Kit 2.

## Settings

`/settings` (inside the `(app)` gate) splits into what the server owns and what
the browser owns:

- **Server:** the send-as display name per identity, through
  `settings.remote.ts` (`Identity/get` + `Identity/set`). Account address,
  quota and sign-out live here too.
- **Browser:** `#lib/settings` — one `mail2.prefs` localStorage blob
  (`parsePrefs` merges it over the defaults and drops anything malformed),
  exposed as a `$state` object by `#lib/settings.svelte.ts`. Holds sidebar
  state, list width, page size, mark-read-on-open, the preview line and the
  default Unseen filter, so the mail shell reads prefs instead of poking
  localStorage itself.

## The Zaur mark

Where every other window puts three inert traffic lights, the shell windows
(mail, settings, login) put the Zaur pixel dinosaur — `@zaur/sprite`, the same
mark as the zaur.app landing page, rendered in `currentColor` on its 20×18
`crispEdges` grid. It is the brand *and* an ambient indicator, so the slot
earns its place: `look_up` while unseen mail waits, `cheer` on reaching zero
and `happy` at rest, `sad` when the browser goes offline, `sleep` after five
minutes without input, with a random `blink` (skipped under
`prefers-reduced-motion`). There is no sync or refresh frame — JMAP is live.

Compose panels have no mark and no dots: their minimize/maximize/close live on
the right of the header, and the dots only duplicated them.

## Compose panel geometry

`#lib/compose/layout` owns the window maths:

- **Opening position** blends two spots. The *anchored* spot is squarely under
  the button that opened the panel; the *centred* spot is the middle of the
  shell, sized for the height a draft settles at (`PANEL_TYPICAL_H`). The
  panel opens a third of the way (`CENTRE_PULL`) from centre toward the button
  — near the middle where it is comfortable to write, still visibly coming
  from the button. The cascade for a stack of panels is symmetric about the
  centre so panels spread through the middle rather than into a corner.
- **Maximize** fills the content pane — everything between the top bar and the
  status line — capped at `PANEL_MAX_W`, and the message box flexes to fill
  the extra height instead of stopping at a fixed step.

## Bulk actions

Selecting rows (avatar click, `x`, or the Select menu) opens a bulk bar over
the list: mark read/unread, highlight, move to any folder, delete. Selection is
by **thread**; `selectedEmailIds` expands it back into the message ids the
folder view holds. Everything funnels through one `bulk` command in
`mail.remote.ts` — they are all an `Email/set` over a batch of ids. Delete
means move-to-Trash everywhere except Trash, where it destroys.

## Architecture

- Reuses `@zaur/mail-core` (JMAP), `@zaur/server-auth` (sessions, OAuth
  plumbing), `@zaur/ui` — the hard-won data core is **not** rewritten.
- Server state goes through SvelteKit **remote functions** (`*.remote.ts`); the
  offline outbox is a lightweight IndexedDB queue (`#lib/compose/outbox`) that
  drains on load and on reconnect. Drafts autosave to the server's Drafts
  mailbox (debounced, 1.5 s) and attachment uploads go through a plain
  `/api/upload` endpoint — remote commands cannot carry a `File`.
- Design tokens: `src/routes/styles/tokens.css` — the handoff's resolved
  variants as CSS custom properties, mapped to Tailwind v4 utilities. The
  prototype's exploration props are **not** configurable; ship the resolved
  values.
