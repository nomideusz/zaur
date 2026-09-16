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
- [x] Live updates — JMAP push (`/api/events`), with polling as the net
- [x] Search via remote functions (`from:` / `subject:` / `has:attachment` / …)
- [x] Attachment downloads (`/api/download`)
- [x] Server-side rules (JMAP Sieve) — **not yet run against a live server**
- [x] Settings that follow the account rather than the browser
- [ ] Security settings (2FA, app passwords, sessions)
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
| Reader "More actions" menu | Archive / Highlight / Mark unseen / Trash, all inert — the same four are back in the reader's toolbar now that they do something (see "The message row") |
| Top-bar search | an input with no handler at all |
| Profile "Keyboard shortcuts" | inert menu item |

Attachment chips stay — they list real attachments from the message; they just
are downloads: `/api/download` streams the blob through the server, mirroring
`/api/upload`, because Stalwart's `downloadUrl` wants credentials that stay
there. The filename goes out in both the RFC 5987 `filename*` form and a
stripped plain one, so a name with an em dash in it survives.

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
- Selection actions live in the list header rather than a bar of their own, so
  they cost no height and need no wrapping (see "Bulk actions"). At the 380px
  minimum list width the word "selected" drops to `sr-only` and the row of
  icons still fits with room to spare.
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
- **Text:** Libre Franklin throughout, Noto Sans Mono for captions, counts and
  code. The slate ramp — 900 headings, 800/700 body, 500 meta, 400
  captions. Counts, times and sizes are `tabular-nums`; group dividers and
  settings headings are uppercase mono 11px (`.z-caption`).
- **Controls:** `btn-tactile` — white, 6px radius, `#cbd5e1` border, slate
  text (`#f8fafc` / `#94a3b8` on hover). The primary action (Send, Sign in)
  is the same button filled blue-600 (blue-700 border), recessed grey
  (`slate-100`/`slate-200`/`slate-400`) until there is a recipient.
  Destructive is red-600 on red-50; input focus is a blue-500 ring.
- **Selection is blue-600 everywhere:** selected row (`#e3eeff` /
  `border-blue-500`), keyboard cursor (`#f5f9ff` / `border-blue-400`),
  unread pills (`bg-blue-100` `text-blue-700` — folder chip and Unseen
  filter), checkboxes (`accent-blue-600`), storage meter (`bg-blue-600`).
  The ringed status dot (`bg-blue-600` `ring-blue-100`) is reserved for tiny
  contexts: dock chips and compose step markers. Unread list rows used to
  borrow this blue too; they wear the sender's own colour now (see
  "The message row"), which leaves blue to mean *you picked this*.
- **People are Hobday candy:** `getHobdayTheme` in `#lib/mail/colors`
  deterministically maps an email to one of five themes
  (blue/green/pink/amber/purple) — **the same person is the same colour**
  in the list row's rail and thread-count chip, the reader's sender card and
  thread history, the compose To chips and the account menu. Two primitives in
  `styles/base.css` carry it: **`.z-railed`** draws that person's accent bar as
  a `::before` (so it costs no element and takes no place in a grid or flex
  row), and **`.z-hue-wash`** is the surface to sit it on — `color-mix` of the
  hue at 7% for the fill and 30% for the border. Both read **`--z-rail`**, which
  is the only thing a caller sets. Not `--z-accent`: that name was already the
  shell's accent, and `base.css` paints every focus ring with it — a row setting
  a hue would have repainted the focus outline of everything inside it. `attachmentBadge` is the one source for the file-kind badge
  (PDF red, image blue, archive amber, else green), shared by the reader
  and compose. **Folders have colours too**, from `mailboxTheme`: the checkbox,
  the unread pill and — when it is the open one — the rail and wash on its
  sidebar row. Most take a Hobday theme; Archive is deliberately neutral, and
  Junk and Trash are red, because the pill should say what the folder does with
  what lands in it. The top bar's folder menu reads the same function, so the
  same count cannot appear grey in one place and blue in the other.
- **The chrome is one accent.** `--z-accent` is blue-600. It used to be the
  handoff's plum, which by the end was reaching only three things — the focus
  ring, the splitter's hover tint and the sign-in register link — and they were
  the last plum in a shell that selects in blue everywhere else.
- **Four classes, not four copies.** `.z-caption` is the uppercase mono label,
  `.hobday-checkbox` the drawn checkbox, `.z-check` the same box on a real
  `<input>` (so settings and sign-in keep native controls), and `.btn-tactile`
  the button. The first three were written in `base.css` from the start and then
  re-typed as Tailwind at every site instead; they are used now.
- **Menus are Ark:** 8px card, `#cbd5e1` border, `bg-slate-100` highlight.
  Contact suggestions add a ↵ kbd hint on the highlighted row and a
  ↑↓ / ↵ / esc footer.
- **Notices are cards:** toasts are 10px cards wearing `.z-railed` — the bar
  that class is named after, with the tone in place of a person's hue (blue
  info, green success, amber warning, red error) — and a tactile action button.
  They sit **bottom centre**, because both bottom corners are spoken for: the
  sidebar's New message button is bottom left (and the message list is, once the
  sidebar is collapsed), the compose dock bottom right. When the dock has chips
  the notices rise above it — on a phone the two were the same box, so a notice
  landed squarely on the minimised drafts. Covering a message row for three
  seconds is the one thing down there that costs nothing.

| Compose | Matches |
| --- | --- |
| Send | the login submit — `btn-tactile` filled blue-600, recessed grey until there is a recipient |
| Attach / Schedule / Discard | the reader toolbar's `btn-tactile`, discard in destructive red |
| Recipient chips | the calendar chip — the person's Hobday fill, stroke and text, all three. They were a white chip carrying an 18px avatar tile; a chip that spells the name out does not need initials too, and the tile kept the colour in a corner. The initials live on in the tooltip that reveals the address, and in the suggestion list |
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

## Live updates

There is no Refresh button — the message list header carries the **New message**
`+` where one used to sit (it is the compose anchor, `[data-new-message]`), the
status line has no "Synced HH:MM", and `ThreadListDTO` carries no `syncedAt`.

That was justified here for a long time with "JMAP is live, so there is nothing
to refresh by hand", **which was not true of this app**: mail2 subscribed to
nothing. There was no push, no polling and no manual refresh, so new mail only
appeared if you switched folders or reloaded. The claim describes the protocol,
not what was built on it. It is true now:

- **`/api/events`** proxies Stalwart's `eventSourceUrl` (RFC 8620 §7.3). It has
  to be proxied: the stream needs the account's credentials, `EventSource` has
  no header API, and the tokens should never reach the browser anyway. A stream
  is also not remote-function state — `query`/`command` are request/response,
  and this one stays open for hours — so it is a plain endpoint.
- **`#lib/mail/live`** listens, and says only *what* changed. The page re-runs
  the remote queries that cover it: `Email` refreshes the thread list, and the
  folder list with it, because unread counts move with mail whether or not
  Stalwart bumps `Mailbox` too. The open thread is deliberately **not**
  refreshed — a message you are reading should not reflow under you.

It is much smaller than webmail 1.0's `PushListener` because there is no local
database to reconcile: 1.0 diffed `Email/changes` against RxDB, a remote `query`
just re-runs. What was worth taking from 1.0 is its robustness, and that is all
here — a 90s stale timer (a dead stream can stop delivering without ever firing
`error`), polling while the stream is down, capped backoff on a permanent close,
a catch-up when the tab is shown again, and a reconnect on `online`.

One thing `EventSource` cannot do is see a response status, so a deployment with
no `eventSourceUrl` (our 501) looks exactly like a flaky one. The backoff cap is
what stops that becoming a hot loop, and the polling fallback is what keeps such
a deployment working. `changedTypes` is a pure function so the payload handling
is tested rather than trusted.

The Retry buttons on the list and reader error states stay — those recover a
failed load, which is a different thing.

## Search

The top bar used to carry an input with no handler at all, which is why the
redesign removed it. This is the same slot, wired: **Enter commits**, because a
mail search runs over the whole account and `from:ada` means nothing half-typed,
and **Escape clears** back to the folder. `/` focuses it, and on a phone the
field swaps in for the folder switcher rather than crowding it.

The query language is `parseSearchQuery` in `@zaur/mail-core` — `from:` `to:`
`cc:` `subject:` `has:attachment` `is:unseen` `is:highlighted` `before:`
`after:` — so a query means the same thing in 1.0 and here. It was already in
the shared package, along with `searchEmails` on the client; it simply was not
exported from the package index, which is the whole of what "port search" turned
out to be.

While results are showing, the list header swaps its All/Unseen control for the
query: Unseen does not scope a search — the query does — so leaving the filter
there would be a control that lies. Empty results are their own state, and offer
the operator list, because "no matches" is exactly when you want to know what
else you could have typed.

Search is scoped to the open folder, which is what the placeholder says.

## The message row

A row is a card with the **sender's rail** down its left edge — the accent bar
off a notification card, in the Hobday hue that person already wears in the
reader and in compose. It carries two things without collision: the **hue says
who it is from**, its **weight says whether it has been seen**. Unread adds a
7% wash of that same hue and a border mixed from it — the calendar chip's
pastel fill, turned down until it is a tint rather than a block of colour —
plus a bolder sender and subject.

That is why unread is no longer blue. A blue dot beside a green rail is two
systems arguing; letting unread be *more of the sender's colour* says the same
thing with what is already there, and hands blue back to selection. Selection
and the keyboard cursor still outrank the sender's colour, so a row you picked
reads as picked whoever it is from.

The rest of the row:

- **Thread size:** rows are threads, so one holding more than one message wears
  a count chip in the sender's badge tint. `buildRowGroups` counts what *this
  folder view* holds, which is why the Unseen filter can drop it — that is
  honest, not stale. The header counts conversations to match.
- **Meta, then actions, in one slot:** starred / attachment / time sit at the
  top right. On hover they step aside and a card of icon buttons steps in —
  highlight, mark read/unread, archive, delete, the same four the selection
  header runs on a batch — so nothing is covered and no row grows. Pointer only (`@media (hover: hover)`; on a touch screen `:hover`
  sticks), and out of the tab order, because 50 rows × 4 stops is not a tab
  order. Screen readers still reach them; sighted keyboard users get `s` / `e`
  / `#` on the cursor row, which the status line spells out.
- **Group dividers stick.** The date a message arrived is what you lose first
  when scrolling a long folder, so `TODAY` pins to the top of the pane while
  its own rows pass under it.

## The reader wears the row it came from

Open a thread and the sender's card is the row you clicked, grown up: the same
`.z-railed` bar in the same hue, over the same `.z-hue-wash`. That handoff is
the whole point — two panes that merely agree on a palette still read as two
panes; one that hands its colour to the other reads as one thing. Selection
blue outranks the hue on the row itself, but only on its *surface*: the rail
keeps the sender's colour, so the link survives being the row you are on.

The rest of the pane follows from the same rule:

- The toolbar gained the **same four icons** the list uses, on the thread being
  read, so archiving what is open does not mean going back to the list for it.
  They are the actions the inert "More actions" menu once mimed.
- **Thread history** is a stack of rows: each earlier message is railed by *its*
  own sender, at the seen strength, so a thread with three people in it is
  scannable at a glance. Expanding it used to be one-way; it collapses now.
- The banner that opens it was amber on amber, which in this shell means
  *warning* — earlier history is not a warning. It is a plain tactile card, and
  its count is the **same chip, in the same colours** as the thread count on the
  list row, because it is the same number about the same thread.
- `Attachments` is the list's group divider, to the letter: label, rule, count.

### One trap worth knowing

Component `<style>` blocks are **unlayered**, and `base.css` lives in
`@layer base` — so an unlayered `.z-row { background: #fff }` silently beats
`.z-hue-wash` no matter how specific the shared class is, and every unread row
goes flat. A component that wants a default *and* a shared surface has to claim
the default conditionally (`.z-row:not(.z-hue-wash)`), not unconditionally.

## Bulk actions

Selecting rows (checkbox, `x`, or the Select menu) **swaps the list header's
contents** — the All/Unseen filter and the conversation count step out, and the
count of what is selected, the actions, and a ✕ step in. Selection is by
**thread**; `selectedEmailIds` expands it back into the message ids the folder
view holds. Everything funnels through one `bulk` command in `mail.remote.ts` —
they are all an `Email/set` over a batch of ids. Delete means move-to-Trash
everywhere except Trash, where it destroys (and the bin turns red at rest there,
since the icon carries no label).

It swaps rather than opening a second bar because a bar pushes the list down,
and the moment you tick a box is the worst possible moment to move the rows you
are ticking. Floating it over the pane was the other option, and the bottom edge
is contested: the sidebar's New message button, the compose dock, and the toast
this very action produces all live there. The header is the one place that is
free, costs no height, and moves nothing.

Everything else about it falls out of that:

- The actions are the **same four icons a row shows on hover**, because they are
  the same four actions — one `ActionIcon` component draws all of them, for the
  row, this header and the reader's toolbar alike, so they cannot drift. They sit
  in a segmented group built like the All/Unseen control they replace, so the
  header keeps its shapes: a menu trigger, then a group, then one trailing
  button.
- The Select menu trigger is the one control both modes keep — it is how you go
  from one row to all of them, and its checkbox already shows the selection.
- **New message** leaves the header while a selection is up. It is still on the
  sidebar and still on `c`.

The row's own buttons and the `s` / `e` / `#` shortcuts are the same command
with one thread's ids: `runBulk` takes an optional `threadIds`, and only the
selection-wide call clears the selection afterwards. A shortcut prefers the
selection when there is one, and falls back to the row under the cursor.

## Rules

Rules run on the **server**, through JMAP for Sieve (RFC 9661). That is the
whole point of them: a rule that lives in a browser tab only sorts mail while
that tab is open, on that one device. Nothing in this repo had ever called
`SieveScript/*` — not mail2, not 1.0 — so there was nothing to port and the
shape was ours to choose.

**The awkward part is that RFC 9661 stores a script, not rules.** There is no
structured rule object on the wire; a script is raw octets, uploaded as a blob
and referenced by id (§2.2 — there is no inline `content` property). Sieve is
also a real language with control flow, so parsing an arbitrary script back
into an editor is not something to attempt.

So the rules are the source of truth and the script is generated from them,
with the rules themselves carried as JSON in a marker comment on the first
line. `buildRuleScript` and `parseRuleScript` in `@zaur/mail-core` are a pair,
and the round trip is exact — a rule goes out and comes back identical, which
is the property the tests pin hardest.

A script **without** that marker was written by hand or by another client.
`parseRuleScript` reports `managed: false`, the editor shows the script
read-only, and saving is refused until the person explicitly says to replace
it. Silently overwriting someone's own Sieve would be the worst thing this
feature could do.

The details that are easy to get wrong, and are tested:

- **`require` lists only what is used.** `fileinto` and `imap4flags` earn their
  place; `discard` and `stop` are core Sieve and requiring them would be wrong.
- **Flags are emitted before `fileinto`.** `imap4flags` applies to whatever
  keeps the message next, so a flag set afterwards lands on nothing.
- **Escaping happens twice for `:matches`.** A user's own `*` has to be escaped
  to stay literal, and the backslash that escapes it then has to survive Sieve's
  quoted-string escaping too.
- **A rule name cannot forge a marker line.** `JSON.stringify` escapes the
  newline, and the generated `# name` comment has its newlines flattened.
- **Unfinished and disabled rules are carried but not compiled**, so editing one
  is not a one-way trip — and the editor says out loud that they will not run.

Every script is put through `SieveScript/validate` **before** it is stored, and
activated in the same `SieveScript/set` via `onSuccessActivateScript`, so there
is never a window where the rules exist but nothing is filtering.

> **Not yet run against a live server.** The pure core is covered by tests, the
> wire calls are typed against RFC 9661, and validation is server-side by
> design — but `SieveScript/*` has never been exercised against Stalwart from
> here. Treat the first run as a test.

## Settings that follow the account

Four of the six preferences travel with the account. **Two deliberately do
not**, and this is the part worth stating plainly, because syncing them would
have been a regression dressed as a feature:

| Preference | Where it lives | Why |
| --- | --- | --- |
| `pageSize`, `markReadOnOpen`, `showPreview`, `unseenByDefault` | account | Behaviour and workflow — the same answer is right on every device |
| `listWidth` | device | A pixel width for one screen. Push 760px from a wide monitor and it eats the reader on a laptop |
| `sidebarOpen` | device | A column on a desktop, an overlay drawer on a phone — not the same question |

`ACCOUNT_PREF_KEYS` is the list, and the server sanitises against it too: a
device-shaped key smuggled into the payload is dropped at the boundary rather
than trusted. A device-shaped preference stored per account is worse than one
stored per device.

**Where they are stored is a deliberate departure from 1.0.** JMAP has no
standard place for a client's own settings. 1.0 reaches first for a
`WebmailSettings` datatype behind the capability
`https://zaur.app/jmap/webmail-settings/v1` — a custom Stalwart extension that
appears nowhere in this repo's docs or infra, so mail2 would be building on
something it cannot verify. Its fallback writes a message into the user's own
Archive with the subject `__zaur_webmail_settings_v1__`, which shows up in
their mailbox, in their search results and against their quota, and needs
duplicate cleanup.

So these go in the **shared session store** instead — the SQLite file both apps
already mount, already share, and already keep logins in. `account_prefs` is
one table keyed by account. `openStoreDb` creates it, so an existing deployed
store picks it up on the next boot with no migration step (there is a test for
exactly that).

The trade is explicit: preferences follow the account across devices and
browsers, but they live on **this deployment** rather than in the mail account,
so they do not travel to a different server and are lost if the store is wiped.
Preferences are not mail; the cost of losing them is one trip to this page.

Merging is per key and the device wins: the account fills in what this browser
has never been told, but a preference changed here is the newer intent. The
first device to sign in seeds the account, so the second has something to adopt
rather than starting from defaults again. Nothing is pushed until the account's
copy has been heard, or a fresh tab would overwrite the account with its own
defaults.

## What is still missing

Measured against webmail 1.0 and against what Stalwart actually implements, in
the order worth doing:

1. **Security settings.** 1.0 has TOTP, app passwords, API keys, active sessions
   and password change against Stalwart's admin API. mail2 has a display name, a
   quota and a sign-out button. 1.0 cannot be retired while 2FA management lives
   only there.
2. **Contacts.** Compose autocomplete scrapes senders out of whichever folder
   page happens to be loaded, so it forgets anyone not recently in view.
   Stalwart speaks `Principal/query` and CardDAV; a real source is a small change
   with a daily effect.
3. **Calendar / Contacts / Files panes.** mail-core already carries the types,
   maps, rights and recurrence. Mostly UI, and the largest surface left.

Two smaller notes:

- **`Thread/get` is unused**, here and in 1.0 — threads are collapsed client-side
  out of the mailbox page. That is exactly why a row's count chip can only
  honestly say "messages this folder view holds".
- **Offline reading is not planned.** 1.0 runs RxDB and Dexie over six stores;
  mail2 has only the compose outbox, and ADR-0005 is a clean-room rebuild. If
  reading offline is wanted, a thread cache keyed by JMAP state is the shape,
  not a second database.

## Architecture

- Reuses `@zaur/mail-core` (JMAP), `@zaur/server-auth` (sessions, OAuth
  plumbing), `@zaur/ui` — the hard-won data core is **not** rewritten.
- Server state goes through SvelteKit **remote functions** (`*.remote.ts`); the
  offline outbox is a lightweight IndexedDB queue (`#lib/compose/outbox`) that
  drains on load and on reconnect. Drafts autosave to the server's Drafts
  mailbox (debounced, 1.5 s) and attachment uploads go through a plain
  `/api/upload` endpoint — remote commands cannot carry a `File`.
- Styling is the tactile system, not a token ramp: `styles/base.css` owns
  `.btn-tactile`, `.hobday-checkbox`, `.z-check`, `.z-field`, `.z-caption`, the
  `.z-railed`/`.z-hue-wash` pair and the `.z-shell` grid;
  surfaces use Tailwind slate/blue plus the chrome hexes (`#ebeef2` ground,
  `#cbd5e1` chrome borders, `#e2e8f0` dividers); people and file-kind
  colours come from `#lib/mail/colors` (`getHobdayTheme`,
  `attachmentBadge`). `styles/tokens.css` remains as the Tailwind `@theme
  inline` bridge, but the mail surface reads slate/blue/Hobday directly —
  only the body ground, focus ring, splitter and login register link still
  resolve its `--z-*` values.
