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

Session sharing with webmail 1.0 works out of the box in dev: cookies are
host-scoped and ignore ports, so `localhost:5173` (webmail) and
`localhost:5175` (mail2) serve the same session. Log in via webmail, then open
mail2.

In production the two apps run on sibling subdomains, which requires setting in
**both** apps' env:

```
SESSION_COOKIE_DOMAIN=.zaur.app   # parent domain so both hosts see the cookie
SESSION_SECRET=<same value>       # session records are sealed with it
STORE_DB_PATH=/data/store.sqlite  # same SQLite store for both apps
```

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
