# @zaur/mail2 — Zaur Mail 2.0

The Mail 2.0 client (ADR-0005): a clean-room rebuild of the webmail UI on the
shared packages, following the redesign handoff's resolved variants. **Light
theme only** for now; Files and Meet arrive when their designs land.

## Status

- [x] Shell scaffold, remote functions enabled, tactile shell + Hobday palette (foundation slice)
- [x] Session-aware read path (mailbox → thread list → reader)
- [x] Floating multi-draft compose (panels, dock, schedule send, offline outbox)
- [x] Draft persistence (Drafts mailbox) + compose attachments
- [x] Own login (`/login` + sign out) — Stalwart OAuth credential flow in prod,
  password fallback in dev; 1.0 session sharing still works as a fallback
- [x] Settings page (`/settings`) + bulk selection actions
- [x] Phone and tablet layouts (ADR-0005 put the phone pass after the cutover;
  it turned out to be mostly CSS, so it landed early)
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

## Nothing inert on screen

Everything the shell renders does something. The redesign carried a set of
mockup affordances across from the Hobday prototype; they are gone:

| Removed | Was |
| --- | --- |
| Calendar / Contacts tabs | inert buttons, "arrives in a later slice" |
| Sidebar "Shared mailboxes" (Personal, Work, …) | hardcoded names, toggled a `Set` nothing read |
| Sidebar "Read-only calendars" (UK Holidays) | same, and its checkbox was `|| true` |
| Sidebar "Manage" | `onManageFolders` was never passed |
| List category chips | `inferTag()` guessed "Family"/"Work" from subject keywords |
| Reader "More actions" menu | Archive / Highlight / Mark unseen / Trash, all inert |
| Top-bar search | an input with no handler at all |
| Profile "Keyboard shortcuts" | inert menu item |

Attachment chips stay — they list real attachments from the message; they just
no longer style themselves as clickable, because downloads are not wired yet.

`/prototype` is still the fake-data design reference (and the only page that
renders the shell without a session, which is what makes it useful for visual
checks). It is outside the `(app)` gate, so it is publicly reachable.

## Shell layout

The app is edge to edge, not a Mac-style window floated on a grey ground. The
window costume (rounded corners, border, shadow, canvas padding) came in with
the tactile redesign as a portfolio presentation device; a window frame implies
a window manager, and inside a browser tab there is none — which is why the
traffic lights in it did nothing. The compose panels are the real windows here:
they drag, resize, minimise to a dock and z-order.

`max-w-[1780px]` stays as a **ceiling**, not a frame: below it the app fills the
tab, above it the column is capped and centred so the chrome at each end (top
bar tabs, account menu, storage meter) stays within reach of the content in the
middle. `#ebeef2` shows either side only past that ceiling.

The reader's content column is left-aligned rather than `mx-auto` centred:
centring walked the message away from the list it came from and from its own
Reply buttons as the pane widened. Slack pools on the right, where nothing
needs to be reachable, and the toolbar shares the column's `px-8` left edge.

The sign-in card keeps its border and shadow — a centred auth card on a ground
is a card, not a fake window.

## Phone and tablet

The shell has three shapes, and the breakpoint does nearly all of the work —
`.z-shell` in `styles/base.css` is one grid whose template changes twice:

| Width | Panes | Sidebar |
| --- | --- | --- |
| < 768px | one: the list, or the reader once a thread is open | overlay drawer |
| 768–1023px | list + reader | overlay drawer |
| ≥ 1024px | list + reader, and the sidebar when it is open | column |

The middle tier exists because a 240px sidebar plus a 480px list leaves an
iPad in portrait with a 280px reader. Below 1024 the sidebar leaves the grid
(`max-lg:absolute`, so it stops being a grid item at all) and slides over the
panes with a scrim. It sits *under* the top bar rather than over it, so the
button that opened it is still there to close it.

Which of the two panes a phone shows is not a third state: the page hands
whichever one is not wanted a `max-md:hidden`. There is no phone-only list
component and no route for the reader.

`#lib/viewport` is the small part that CSS cannot do — compose geometry is
inline-styled, the sidebar toggle has to know which flag to write, and opening
a thread has to know whether to push history. Two `matchMedia` queries, the
same numbers as the CSS.

### The reader is a screen, not a pane

On a phone the reader takes a **shallow history entry** (`#lib/mail/reader-thread`),
so Back — the button, the hardware key, iOS' back-swipe — returns to the list
instead of leaving the app. On wider layouts both panes are on screen, so
there is nothing to go back from and the open thread stays plain state. The
back button outlives the message it acts on: it renders in the reader toolbar
whatever the pane is doing, because a failed load is exactly when you need it.

### Compose is a sheet

A phone has no window manager either, so the panel drops its geometry and
fills the shell: no drag, no resize, no maximize — and **Send moves up into
the header**, because the action bar sits under the on-screen keyboard. The
same happens whenever the shell is under 520px tall (a phone in landscape, a
squat desktop window): a floating window needs room to float.

`interactive-widget=resizes-content` in the viewport meta gets Chrome to
shrink the layout viewport for the keyboard rather than paint over it. iOS
does not honour it — which is why Send is in the header and not only in the
action bar. Every compose field is 16px on a phone, below which iOS Safari
zooms the viewport on focus and throws the sheet off-centre.

Minimised drafts keep working: the dock becomes one horizontally scrolling
strip on the bottom edge (`justify-start` — with `justify-end` the overflow
spills past the unscrollable start edge), and chip reordering is skipped for
touch pointers, where the same drag is the strip's scroll.

### Smaller things, and what was left out

- The reader's own metrics — content gutter, subject size, whether the sender
  card stacks — are **container** queries, not viewport ones. What matters is
  how wide that pane is, and a tablet's second pane is as narrow as a phone.
- The status line is hidden below 768px: 36px of keyboard hints and a storage
  meter is not what a phone should spend its height on, and the top bar's
  folder chip already carries the unread count.
- The bulk bar wraps to a second line instead of scrolling, so every action
  stays reachable with no horizontal scrollbar; at the default list width it
  still fits on one line.
- New message stays the tactile `+` in the list header. A floating action
  button is a different design language, and the header button is already
  there.
- No swipe-to-archive on rows and no pull-to-refresh — the latter would be
  meaningless anyway, since JMAP is live.

## The Zaur mark

Where every other window puts three inert traffic lights, the shell windows
(mail, settings, login) put the Zaur pixel dinosaur — `@zaur/sprite`, the same
mark as the zaur.app landing page, drawn from `SPRITE_FRAMES` on its 20×18
`crispEdges` grid as a duotone: raspberry `#db2777` body over deep plum
`#831843` from row 11 down (legs and underside), with the eye left as a hole.
Both tones are the Hobday pink already in `#lib/mail/colors` — vivid at 28px,
and complementary to the green account avatar at the other end of the top bar. It is the brand *and* an ambient indicator, so the slot
earns its place: `look_up` while unseen mail waits, `cheer` on reaching zero
and `happy` at rest, `sad` when the browser goes offline, `sleep` after five
minutes without input, with a random `blink` (skipped under
`prefers-reduced-motion`). There is no sync or refresh frame — JMAP is live.

On the sign-in window the mark is absolutely positioned, so the centred title
sits on the window's centre rather than on whatever space is left beside it.

Compose panels have no mark and no dots: their minimize/maximize/close live on
the right of the header, and the dots only duplicated them.

## One visual language

The whole surface speaks one tactile language (`.btn-tactile` in
`styles/base.css`, Hobday candy palette in `#lib/mail/colors`):

- **Chrome:** white surfaces on the `#ebeef2` ground, capped at
  `max-w-[1780px]`. Structural borders are `#cbd5e1` (top bar, sidebar,
  inputs, menus); list/reader dividers and cards are `#e2e8f0`.
- **Text:** Inter throughout, Noto Sans Mono for captions, counts and
  code. The slate ramp — 900 headings, 800/700 body, 500 meta, 400
  captions. Counts, times and sizes are `tabular-nums`; group dividers and
  settings headings are uppercase mono 11px (`.z-caption`).
- **Controls:** `btn-tactile` — white, 6px radius, `#cbd5e1` border, slate
  text (`#f8fafc` / `#94a3b8` on hover). The primary action (Send, Sign in)
  is the same button filled blue-600 (blue-700 border), recessed grey
  (`slate-100`/`slate-200`/`slate-400`) until there is a recipient.
  Destructive is red-600 on red-50; input focus is a blue-500 ring.
- **Selection is blue-600 everywhere:** selected row
  (`border-blue-500` / `bg-blue-50/50`), keyboard cursor
  (`border-blue-400` / `bg-blue-50/30`), unread rows (accent bar +
  `bg-blue-50/30` wash, bold sender/subject), unread pills (`bg-blue-100`
  `text-blue-700` — folder chip and Unseen filter), checkboxes
  (`accent-blue-600`), storage meter (`bg-blue-600`). The ringed status dot
  (`bg-blue-600` `ring-blue-100`) is reserved for tiny contexts: dock chips
  and compose step markers.
- **People are Hobday candy:** `getHobdayTheme` in `#lib/mail/colors`
  deterministically maps an email to one of five themes
  (blue/green/pink/amber/purple) — **the same person is the same colour**
  in the reader sender card, the compose To chips and the
  account menu. `attachmentBadge` is the one source for the file-kind badge
  (PDF red, image blue, archive amber, else green), shared by the reader
  and compose. Sidebar unread counts wear the same themes — each mailbox's
  count pill is tinted with its own badge colours.
- **Menus are Ark:** 8px card, `#cbd5e1` border, `bg-slate-100` highlight.
  Contact suggestions add a ↵ kbd hint on the highlighted row and a
  ↑↓ / ↵ / esc footer.
- **Notices are cards:** toasts are 10px cards with a tone accent bar on the
  left (blue info, green success, amber warning, red error) and a tactile
  action button.

| Compose | Matches |
| --- | --- |
| Send | the login submit — `btn-tactile` filled blue-600, recessed grey until there is a recipient |
| Attach / Schedule / Discard | the reader toolbar's `btn-tactile`, discard in destructive red |
| Recipient chips | the Hobday avatar badge — white chip, `#cbd5e1` border, Hobday avatar; hovering a name reveals the address in an Ark tooltip |
| Contact suggestions | the Ark menus: 8px card, `#cbd5e1` border, `bg-slate-100` highlight, plus ↵ kbd hint and key-hint footer |
| Attachment chips | the reader's chips, scaled to the 30px strip; `attachmentBadge` is the one source for the kind colour |
| To / Subject step markers | the ringed blue status dot on a dock chip with content |

The step dots stayed dots rather than becoming the sidebar's checkbox: a 17px
checkbox does not fit the 62px label column, and the field geometry is a
contract with `computeAutoHeight`.

## Compose panel geometry

`#lib/compose/layout` owns the window maths:

- **Default size and chrome:** new panels open 680 wide (`PANEL_DEFAULT_W`)
  with the writing measure unchanged; the action bar keeps attach/schedule on
  the left and discard + Send on the right, and the header shows the autosave
  state (`Saving…` / `Saved HH:MM`) next to the title.

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

## No refresh, no sync clock

JMAP is live, so there is nothing to refresh by hand: the message list header
carries the **New message** `+` where a Refresh button used to sit (it is the
compose anchor, `[data-new-message]`), and the status line has no "Synced HH:MM".
`ThreadListDTO` no longer carries `syncedAt`. The Retry buttons on the list and
reader error states stay — those recover a failed load, which is a different
thing.

## Bulk actions

Selecting rows (checkbox, `x`, or the Select menu) opens a bulk bar over
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
- Styling is the tactile system, not a token ramp: `styles/base.css` owns
  `.btn-tactile`, `.hobday-checkbox`, `.z-caption` and the `.z-shell` grid;
  surfaces use Tailwind slate/blue plus the chrome hexes (`#ebeef2` ground,
  `#cbd5e1` chrome borders, `#e2e8f0` dividers); people and file-kind
  colours come from `#lib/mail/colors` (`getHobdayTheme`,
  `attachmentBadge`). `styles/tokens.css` remains as the Tailwind `@theme
  inline` bridge, but the mail surface reads slate/blue/Hobday directly —
  only the body ground, focus ring, splitter and login register link still
  resolve its `--z-*` values.
