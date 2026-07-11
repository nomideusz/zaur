# Self-hosting this webmail (bring your own Stalwart)

This app is a JMAP webmail client. It does not run a mail server — you point it
at one. It is built and tested against [Stalwart](https://stalw.art); other
JMAP servers may work for reading mail but sign-in currently depends on either
HTTP Basic auth or Stalwart's OAuth flow (Fastmail's token-only API is not yet
supported).

## Minimum viable deployment

One container, two required variables:

| Variable | Value |
|---|---|
| `PUBLIC_JMAP_SERVER_URL` | Base URL of your Stalwart server, e.g. `https://mail.example.com` |
| `SESSION_SECRET` | Random string, at least 32 characters |

That's it. With nothing else configured, sign-in uses your mailbox
email + password (HTTP Basic against the JMAP session endpoint; app passwords
and `password$totp` TOTP suffixes work). The password is AES-256-GCM-sealed in
a server-side SQLite store — the browser cookie only ever holds an opaque id.

Persist `/app/.data` (sessions, rate limits, push subscriptions) on a volume,
or logins and push subscriptions reset on every deploy.

The app listens on `PORT` (default 3000), binds `HOST` (default `0.0.0.0`),
and serves a dependency-free healthcheck at `GET /health`.

## Recommended: Stalwart OAuth

With OAuth, the server stores revocable tokens instead of the password:

1. In Stalwart, register an OAuth client (client id, redirect URI
   `https://<your-webmail-domain>/api/auth/oauth/callback`, PKCE S256).
2. Set:
   ```
   STALWART_OAUTH_ENABLED=true
   STALWART_OAUTH_ISSUER_URL=https://mail.example.com
   STALWART_OAUTH_CLIENT_ID=<client id>
   ```
3. Once OAuth is declared (`STALWART_OAUTH_ENABLED=true`), password sign-in
   disables itself automatically. To force password login back on — the
   emergency lever if OAuth breaks — you must **both** set
   `STALWART_PASSWORD_LOGIN_ROLLBACK_ENABLED=true` **and** clear
   `STALWART_OAUTH_ENABLED` (or set it to `false`): while OAuth stays declared,
   the sign-in endpoint routes every attempt through OAuth first, so the
   rollback flag alone cannot reach the password path.

## Optional pieces

- **Web Push** — generate VAPID keys (`node scripts/generate-vapid-keys.mjs`)
  and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`.
- **Signup + password reset** — both proxy to a separate `register` service
  (see `apps/register`), which drives Stalwart's admin API. Without
  `PUBLIC_REGISTER_URL` / `REGISTER_API_URL` set, every signup and
  forgot-password entry point is hidden and accounts are managed in Stalwart
  directly.
- **Branding** — `PUBLIC_APP_NAME` names the app in the UI, page titles that
  use `appConfig`, and the PWA install manifest (served dynamically).

## What works on non-Stalwart JMAP servers

Discovery uses the standard `/.well-known/jmap`, all mail traffic is proxied
same-origin, and calendar/quota/vacation features probe server capabilities
and degrade gracefully. Basic-auth sign-in works against any JMAP server that
accepts it. Servers that only accept bearer/API tokens (Fastmail) are not yet
supported — that requires a token sign-in path that doesn't exist today.

## Building

The Dockerfile at `apps/webmail/Dockerfile` needs the **monorepo root** as its
build context (it pulls in `packages/mail-core`, `packages/ui`,
`packages/sprite`):

```sh
docker build -f apps/webmail/Dockerfile .
```

`PUBLIC_*` variables are read at runtime, not baked at build time — one image
serves any configuration.
