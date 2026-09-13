# @zaur/mail2 — Zaur Mail 2.0

The Mail 2.0 client (ADR-0005): a clean-room rebuild of the webmail UI on the
shared packages, following the redesign handoff's resolved variants. **Light
theme only** for now; Files and Meet arrive when their designs land.

## Status

- [x] Shell scaffold, remote functions enabled, design tokens (foundation slice)
- [x] Session-aware read path (mailbox → thread list → reader)
- [x] Floating multi-draft compose (panels, dock, schedule send, offline outbox)
- [x] Draft persistence (Drafts mailbox) + compose attachments
- [ ] Search + settings via remote functions
- [ ] Calendar / Contacts (port from 1.0)
- [ ] Own login/OIDC flows (1.0 login is used until then)
- [ ] Cutover checklist green

## Running

```sh
pnpm dev:mail2          # http://localhost:5175
```

Session sharing with webmail 1.0 needs **one shared session store**: the
session cookie holds an id that each app looks up in a SQLite file
(`<cwd>/.data/store.sqlite` — per-app by default, so webmail's sessions are
invisible to mail2 out of the box). Copy `.env.example` to `.env` — it points
mail2's `STORE_DB_PATH` at webmail's store — then log in via webmail on
`localhost:5173` and open `localhost:5175`.

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

Session borrowing works by **filesystem**: mail2 has no login of its own, so
its container must read the same SQLite session store as the webmail
container. Both images default `STORE_DB_PATH=/app/.data/store.sqlite` and
share the same image layout — point **both** Dokploy services' `/app/.data`
mounts at the **same host directory** and they read one store.

Service settings (mirroring the webmail service):

| Setting | Value |
| --- | --- |
| Build type | Dockerfile — path `apps/mail2/Dockerfile`, context: repo root |
| Domain | `mail2.zaur.app` |
| Port | 3000 (`PORT`, `HOST`, `BODY_SIZE_LIMIT=50M` are baked into the image) |
| Env | `SESSION_SECRET=<same value as the webmail service>` |
| Env | `SESSION_COOKIE_DOMAIN=.zaur.app` |
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
