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
- [x] Live updates — JMAP push (`/api/events`), with polling as the net †
- [x] Search via remote functions (`from:` / `subject:` / `has:attachment` / …) †
- [x] Attachment downloads (`/api/download`) †
- [x] Server-side rules (JMAP Sieve) †
- [x] Settings that follow the account rather than the browser
- [x] Design system v2 applied — channel hues, identity tones on avatars, the ZA/UR
  logomark, system fonts, tactile controls, the v2 sign-in, phone and settings
  screens (see [Design system v2](#design-system-v2-pastel-channels-tactile-controls))
- [x] Design follow-ups from the v2 review — Flagged filter, attachment retry,
  rule cards with a Newsletters template, `@zaur/sprite` dropped, and **dark
  mode** wired end to end (see [Design follow-ups](#design-follow-ups))
- [x] Security settings (`/settings/security`): password, 2FA, app passwords,
  API keys, signed-in devices, recovery email — see [Security](#security) ‡
- [x] Contacts with a real source — JMAP Contacts (RFC 9610), feeding compose
  autocomplete and a Contacts pane ‡
- [x] Calendar pane — JMAP Calendars, server-expanded recurrences ‡
- [ ] Files pane — waits for its design (ADR-0005), and Stalwart's `FileNode`
- [x] Installable app (PWA): icons from the mark, manifest, service worker — see
  [Installable app](#installable-app-pwa) §
- [x] New-mail notifications (Web Push), closed tab included — see
  [New-mail notifications](#new-mail-notifications-web-push) §
- [x] Several accounts in one session: add, switch, sign out of one — see
  [Several accounts](#several-accounts) §
- [ ] OIDC provider flows (mail2 as an identity provider) — post-cutover

† **Written and tested, but never run against a live Stalwart.** See
[Not yet proven against a server](#not-yet-proven-against-a-server).

‡ **Run end to end against a fake JMAP server, not a live Stalwart.** The wire
shapes follow Stalwart 0.16's source and docs; `pnpm smoke:jmap` (see
[Smoke-testing without a mailbox](#smoke-testing-without-a-mailbox)) is what
they have been exercised against.

§ **Run in a real (headless) browser against the fake JMAP server.** Push was
followed from a fake delivery through the watcher to a real VAPID-signed,
encrypted request that a local capture decrypted; the browser half (settings
card, the worker's notification, the thread link) ran separately, because the
browsers here have no push service. Not yet: a real device, a real push
service, a live Stalwart event stream.

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
| Env | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — notifications; webmail's values work (`npx web-push generate-vapid-keys` for new ones). Unset, the settings card says so |
| Env | `PUBLIC_TRACEWAY_DSN=<token>@https://traceway.zaur.app/api/report` — optional; browser and server errors, plus server tracing (`src/lib/server/tracing.ts`) |
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

`/settings` (inside the `(app)` gate) is two pages under one layout — **General**
here, and [Security](#security) — and has **three** owners, not two; which one a
setting belongs to is a real decision rather than an accident of where it was
easiest to put:

- **The mail account (Stalwart).** The send-as display name per identity,
  through `settings.remote.ts` (`Identity/get` + `Identity/set`), plus the
  account address, quota and sign-out. Mail rules live here too, as a Sieve
  script — see [Rules](#rules).
- **The Zaur account (our store).** The five preferences that should be the
  same wherever you sign in — see
  [Settings that follow the account](#settings-that-follow-the-account).
- **This browser.** `#lib/settings` still owns the `mail2.prefs` localStorage
  blob (`parsePrefs` merges it over the defaults and drops anything malformed),
  exposed as a `$state` object by `#lib/settings.svelte.ts`. Everything lives
  here first; the account's copy is merged over it on sign-in, and `listWidth`
  and `sidebarOpen` never leave.

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
| Reader "More actions" menu | Archive / Highlight / Mark unseen / Trash, all inert — the actions are back in the reader's toolbar and, since the split Reply button landed, in a menu that runs them (see [Reply is a split button](#reply-is-a-split-button)) |
| Top-bar search | an input with no handler at all — the slot is wired now, see [Search](#search) |
| Profile "Keyboard shortcuts" | inert menu item |

Attachment chips stay, and they are downloads again: `/api/download` streams
the blob through the server, mirroring `/api/upload`, because Stalwart's
`downloadUrl` wants credentials that stay there. The filename goes out in both
the RFC 5987 `filename*` form and a stripped plain one, so a name with an em
dash in it survives.

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

| Width | Panes | Sidebar | Top bar |
| --- | --- | --- | --- |
| < 768px | one: the list, or the reader once a thread is open | overlay drawer | on the list; gone while a thread is open |
| 768–1023px | list + reader | overlay drawer | always |
| ≥ 1024px | list + reader, and the sidebar when it is open | column | always |

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

### A screen gets one bar

Reading a thread on a phone used to stack two bars: the shell's, with the
mark, the drawer toggle, the folder switcher and search, and then the reader's
own. None of the first four is what a screen you are *reading* on is for — the
list screen one tap away still has all of them — so below 768px the shell's bar
steps out while a thread is open (`class={openThreadId ? 'max-md:hidden' : ''}`
on `TopBar`, which hands it to the layout's header along with its bar — the
same trick the panes use). That gives the message 52px back,
and lets the one bar that stays be **60px with 40–44px targets** instead of
52px with 28–32px ones. Above 768px both panes are on screen at once, so
nothing hides and nothing grows.

Its two ends are the two things it must not confuse. **Back sits alone at the
left edge**; everything that answers the message — the icons, then Reply past a
hairline — is pushed to the **right**, because a back arrow and a reply arrow
point the same way and a mis-tap there sends mail to someone. On a desk there
is no back button to be mistaken for, and the reader's content column is
left-aligned, so Reply folds back to the left edge it has always had — three
`md:order-*` classes, one bar, no second copy of it.

### Reply is a split button

Reply is two controls in one frame: the near half answers, the caret opens
everything else the message can have done to it. That is what stops the bar
growing a button per verb — **Reply all** and **Forward** are in there, and so
is the filing half, **Mark unread**, **Mark as spam** and a **Move to** list of
every folder that does not already have a control of its own. The next action
costs a menu line rather than bar width.

What stays on the bar is what you reach for without reading: flag, **spam** and
the bin at every width, with mark-unread and Archive joining them once the pane
is past 448px. Spam outranks Archive for that space because junk is the mail
you most often open only to get rid of — and marking it *is* a move to Junk, so
it goes through the same `bulk` command Archive does and the toast says what
was meant ("marked as spam") rather than how it was carried out. Inside Junk
the same button means the opposite, and files the message back to the inbox.

A move now also refreshes the **destination** folder's cached list. Without
that, opening the folder you just moved something into showed it as it was
before, which reads as a move that did not happen.

### Compose is a sheet

A phone has no window manager either, so the panel drops its geometry and
fills the shell: no drag, no resize, no maximize — and **Send moves up into
the header**, because the action bar sits under the on-screen keyboard. The
same happens whenever the shell is under 520px tall (a phone in landscape, a
squat desktop window): a floating window needs room to float.

That header is the reader's bar again, for the same reasons. The way out — ✕ —
is **alone at the left edge** and Send is at the **right**, both thumb-sized,
with Minimise between them. The bar says **what kind of message this is**
("Reply", "Forward", "Draft"), not the subject: a sheet has the subject in a
field two rows down, so the title was spending the widest line on screen
repeating it, truncated. A window keeps the subject as its title — several can
be open at once and it is the only thing that tells them apart — so the panel
carries a `kind` and the two headers read it differently.

**Cc and Bcc left the chip row.** They used to sit inside it, so the first
recipient pushed them onto a line of their own; they hold the row's right edge
now. On a phone they are one chevron rather than two words, and it opens both:
two labelled buttons cost ~100px of a 390px screen, width the names need more,
and each row carries its own ✕ for whichever you did not want.

### One address row, drawn three times

To, Cc and Bcc are the same field, so they are the same component: a chip list
with completion over the same address book, the same identity tones, the same
Enter/comma/Tab commit and the same Backspace. Cc and Bcc used to be bare
comma-separated text that was only parsed at send — no completion, no chip, and
no way to correct one address out of four. They are `Recipient[]` on the draft
now, like To has always been, and `RecipientField` is what every store method
takes so none of it exists three times over.

**A chip hands its text back.** Clicking the name opens the chip in place as an
input holding `Name <address>`, selected: Enter or blur commits it through the
same parser a typed address goes through, Escape abandons it, and emptying it
removes the chip. One wrong letter in the fourth of four addresses used to mean
deleting it and typing the whole thing again.

**The field's name is its placeholder**, not a label in a 72px gutter. A row
with chips in it says what it is, the rows are always in the same order, and on
a phone that gutter was a fifth of the screen spent on the word "To". What is
left at the left edge is the step dot, which fills when the row has something
in it. The trade is real: once every row is full, nothing spells out which one
is Cc — the order and the ✕ that only Cc and Bcc carry are what tell them
apart.

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
  card stacks, whether its toolbar labels its Reply set — are **container**
  queries, not viewport ones. What matters is how wide that pane is, and a
  tablet's second pane is as narrow as a phone: `Reply` `Reply all` `Forward`
  spelled out used to wrap and shove the four icons clean off the right edge of
  an iPad's 340px reader. How *big* the targets are stays a viewport question,
  though — a narrow pane on a desk is still being pointed at, not tapped.
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

## The mark

The shell's mark is the **Z fold** drawn as an icon, not a logo: two bars and a
45° fold in one continuous stroke, on the same 16px grid, with the same round
caps, 1.3 stroke and `--z-strong` ink as every other glyph, inside the same
`btn-tactile` body as the header's other square buttons. It sits among the
icons rather than above them, and only its shape says Zaur. It used to wear two
identity inks, rose leading into teal; on a white tile that read as Gmail, so
the colour went and the `--z-mark-*` tokens with it. The same path draws
`static/favicon.svg` and the PNG icons (`scripts/generate-icons.py`).
It says *Zaur* rather than *Zaur Mail* because one account spans Mail, Chat,
Discuss and Meet.

It replaced the `ZAUR` stamp pill, which replaced the pixel dinosaur. The mark
never carries a count: unread lives in the mailbox list and the status line,
and never twice in one view — so the Unseen filter tab has no badge, and the
header's folder switcher only appears (with its count) while the mailbox list
is collapsed. The sprite stays a mascot for `@zaur/sprite`.

## Design system v2: pastel channels, tactile controls

The shell speaks one language, written down in `styles/tokens.css` and
`styles/base.css` and mirrored in the design project ("Zaur Mail Design
System", `claude.ai/design`). Two ideas carry it:

**Colour means channel, not identity.** Six fixed hues, each a pastel fill, a
saturated stroke that matches it, a dark ink for text on the fill, and a solid
for filled controls:

| Channel | Says | fill / stroke / solid / ink |
| --- | --- | --- |
| Correspondence | mail, and anything selected | `#dbeafe` `#3b82f6` `#2563eb` `#1e40af` |
| Confirmed | sent, done, success | `#dcfce7` `#16a34a` `#16a34a` `#14532d` |
| Important | `$important`, drafts, warnings, scheduled | `#fde68a` `#d97706` `#d97706` `#78350f` |
| Flagged | your own flag | `#fbcfe8` `#db2777` `#db2777` `#831843` |
| Digest | automated mail, custom folders | `#ddd6fe` `#7c3aed` `#7c3aed` `#4c1d95` |
| Discard | junk, trash, errors | `#fee2e2` `#ef4444` `#dc2626` `#b91c1c` |

Rails, chips, unread washes, folder rows, toasts and error cards wear a
channel. `messageChannel` in `#lib/mail/colors` decides a row's: the folder
wins for junk, trash, sent and drafts, your flag outranks the server's
`$important`, and the rest is correspondence — all from what JMAP already
gives us, nothing new on a message. `mailboxChannel` does the same for folders.

The hues are a colour system, not a taxonomy. A chip only names state the
message actually carries — **Flagged** (`$flagged`) or **Important**
(`$important`) — never a kind nobody classified: no "Confirmed" on every Sent
row, no "Digest" guessed from a folder. Content kinds (receipts, newsletters,
things that need a reply) are deliberately undecided until Stalwart can
classify at delivery; when they land they should be JMAP keywords on the
message (e.g. `$zaur-receipt`), written by Sieve rules or the classifier alike,
so the client only reads keywords and never cares which wrote them.

**Identity lives on the avatar tile.** Eight quieter tones (steel, sky,
indigo, rose, lime, orange, plum, stone), picked deterministically per
address, worn only by the 30px tile a person gets in a list row, the reader's
sender card, a recipient chip, a contact, the account button. Teal is reserved
for the brand. v1 hashed the sender into five hues and put it on the rail, so
colour *was* identity — and identity is noise: two unrelated senders share a
hue, and the same colour means something different in every row.

The rest follows from those two:

- **Surfaces and ink.** `#eef1f5` ground behind the app column, `#f6f7f9` pane
  ground (settings sit on it), white surfaces, `#f1f4f8` sunken wells. Ink
  `#0b1220` for headings and unread, `#1e293b` body, `#475569` muted, `#64748b`
  *soft* — the lightest any text may be. `#94a3b8` *faint* is for rules and
  glyphs only, never text; meta sitting on a channel fill steps up to muted or
  to that channel's own ink, because 11px grey on a pastel wash does not clear
  4.5:1. Hairlines are `#e2e8f0`, control and panel borders `#cbd5e1`. The dark
  ramp lives in `tokens.css` too, and every component reads tokens rather
  than hex, so one attribute flips the whole shell — see
  [Dark mode](#dark-mode).
- **Type.** System faces only, nothing downloaded: `Seravek, 'Gill Sans Nova',
  Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif` for the interface,
  `ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu
  Sans Mono', monospace` for captions, counts, times, addresses and keys. Eight roles from
  a 38px display down to the 11px uppercase mono caption (`.z-caption`, soft).
- **Controls are things you could press.** `.btn-tactile` is white, 8px radius,
  `#cbd5e1` border, a 1px shadow and a half-pixel press; `.btn-primary` fills it
  blue with a `#1d4ed8` edge (Send, Sign in, New message); `.btn-danger` is red
  ink that turns to the discard channel on hover. Icon buttons are 26px inside
  a bordered `.z-group`; segmented controls (`.z-segment`) mark the active
  member with the correspondence fill. Fields are 34px with an inset shadow at
  rest and a 3px accent ring on focus. Keys are `.z-kbd`, with a 2px bottom
  border so they read as keys. Menus are 12px cards with 8px items.
- **Four elevations, no more:** tactile (buttons, chips, fields), raised
  (unread rows), menu (menus, popovers, dock chips, toasts), panel (compose,
  dialogs). Radii 4–14 plus pill.
- **Selection is the correspondence solid, everywhere.** The active filter, the
  active section tab, a selected row (`#eff6ff` with a `#2563eb` ring), the
  selection header (which takes the correspondence fill so it reads as one
  object with the rows), the checkbox fill, the storage bar.

Compose follows the same rules, so its parts match what they stand next to:

| Compose | Matches |
| --- | --- |
| Send | `.btn-primary`, recessed grey until there is a recipient, `⌘↵` inside it on a desk |
| Attach / Discard | the reader toolbar's tactile buttons; discard in danger red |
| Schedule | the needs-you channel once a time is set — a filled amber chip that says when |
| Recipient chips | the person's identity tone, fill, stroke and ink; the tooltip shows their tile and address, and clicking the name opens the chip for editing |
| Suggestions | the menu: the highlighted row is a correspondence card, with a 26px tile, a mono address and a `↵` key |
| Attachment chips | the reader's chips at 30px; `attachmentBadge` is the one source for the kind colour |
| To / Subject step markers | 7px dots — the correspondence solid with its stroke when done, line-grey before |

### One trap worth knowing

Component `<style>` blocks are **unlayered**, and `base.css` lives in
`@layer base` — so an unlayered `.z-row { background: #fff }` silently beats
`.z-hue-wash` no matter how specific the shared class is, and every unread row
goes flat. A component that wants a default *and* a shared surface has to claim
the default conditionally (`.z-row:not(.z-hue-wash)`), not unconditionally.

## Design follow-ups

The design project proposed a few things that were features rather than paint.
Those were left for discussion, decided together, and landed in this order:

- **`@zaur/sprite` dropped.** The ZA/UR logomark is the mark; mail2 imported nothing
  from the package any more.
- **A Flagged filter, and no Channels sidebar.** The list header is
  All / Unseen / Flagged. Each goes to the server as one JMAP
  `FilterCondition` (`notKeyword: '$seen'`, `hasKeyword: '$flagged'`), not a
  client-side sieve of the loaded page, so it is right across the whole folder.
  The design's Channels group in the sidebar was not built: a channel is derived
  from a folder and a flag, so every entry in it would have duplicated a folder
  row or this filter.
- **Attachment retry.** A failed upload keeps its chip, in the discard channel,
  with Retry; the compose store holds the `File` until it goes up or the chip
  is removed. A chip that is still uploading shows a sliding rule rather than a
  percentage the server does not report.
- **Rules as cards**, with the form behind Edit — see [Rules](#rules).
- **Digest is a rule, not a heuristic.** The design grouped "digest" mail by
  newsletter markers in the client. That is guessing, per device, on mail that
  has already landed in the inbox. The Newsletters rule template does the same
  sorting on the server, on delivery, for every device.
- **Dark mode** — below.
- **Parked: the ⌘K palette.** Everything it would reach has a key already
  (`/`, `c`, `j` `k`, `e`, `s`); it earns its place when there are more
  destinations than keys.

### Dark mode

The theme is a preference — Appearance in Settings: System / Light / Dark —
kept with the browser prefs in `localStorage` and deliberately *not* synced to
the account: it belongs to the device, like the OS setting it defers to.
`app.html` reads it and writes `data-theme` on `<html>` before first paint, so
a dark tab never flashes light; the root layout keeps the attribute in step
when the setting changes. `tokens.css` carries the dark ramp twice, under
`prefers-color-scheme: dark` for System and under `[data-theme='dark']` for the
explicit choice. Every component reads `var(--z-*)` and nothing else — the hex
sweep was most of the work — so in dark a channel's stroke keeps its
saturation, its fill becomes a 22% wash of that stroke over the surface, and
its light fill becomes its ink.

The email body is the one exception, on purpose. It renders in a sandboxed
iframe that cannot see the tokens, so `buildEmailFrameSrcdoc` takes a `dark`
flag. Plain-text mail is ours to typeset and follows the theme. HTML mail was
written for a light page, so it keeps its light palette and sits on a white
card inside the dark reader: recolouring someone else's layout is how you get
invisible text.

## Rich text in compose

The message box is [Trix](https://github.com/basecamp/trix) (`RichBody.svelte`), a web component
with one dependency, loaded on the client only. `RichToolbar.svelte` is Trix's toolbar in mail2's
own buttons: Trix fills an *empty* `<trix-toolbar>` with its markup and sprite sheet, and given
children it only reads their `data-trix-*` attributes. Trix's stylesheet is not imported.

A draft carries both `bodyHtml` (what the editor holds) and `body` (Trix's plain-text reading: the
`text/plain` alternative, and what the rest of compose reasons about). `bodyHtml` stays empty until
something is written, so an untouched reply is not an edit and does not autosave. With it the
message goes out `multipart/alternative`; without it, plain, as before.

The quoted original is seeded from plain text (`replySeed`) and lives inside the editor as a
blockquote, so it can be answered inline. Nobody else's HTML is ever loaded into Trix — only a
reopened draft's, which Trix wrote. Things that bit:

- Trix injects an unlayered `trix-toolbar { display: block }`. Tailwind utilities are layered and
  lose to it, so the toolbar's `display: flex` is declared unlayered in the component.
- `trix-change` fires during `loadHTML`; loading is not writing, so it is ignored.
- While the link dialog is open Trix paints the held selection *into the document* (a
  `background-color: highlight` span). Changes carrying it are not reported; closing reports again.
- Files dropped or pasted into the text are refused (`trix-file-accept`) and handed to the
  attachment strip instead — no inline images yet.
- Bare `<blockquote>` renders as a plain indent in most clients, so `outgoingHtml` inlines the
  rule on send (not on save: Trix would strip it on reopen anyway).

## Compose panel geometry

`#lib/compose/layout` owns the window maths:

- **Default size and chrome:** new panels open 760 wide (`PANEL_DEFAULT_W`)
  and the message box opens at 340 once it is being written in, with the writing measure
  unchanged — the editor itself reaches the pane's edge, so its scrollbar sits there; the action bar keeps attach/schedule on
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

While results are showing, the list header swaps its All/Unseen/Flagged control
for the query: Unseen does not scope a search — the query does — so leaving the
filter there would be a control that lies. Empty results are their own state, and offer
the operator list, because "no matches" is exactly when you want to know what
else you could have typed.

Search is scoped to the open folder, which is what the placeholder says.

**Every search used to return nothing**, and the reason is worth keeping: the
folder scope and the parsed query were combined as `{ and: [...] }`, which is
not a JMAP filter. RFC 8620 §5.5 combines conditions with a `FilterOperator`
— `{ operator: 'AND', conditions: [...] }` — and Stalwart answers a shape it
does not know with an `invalidArguments` error, which the client then read as
"no results". `allOf` in `@zaur/mail-core` now builds the operator (and
passes a single condition through untouched), `searchEmails` throws on a
method error instead of returning an empty list, and the fake server rejects
the bare `and` shape so the mistake cannot come back unnoticed.

## The message row

A row is a card in three columns — an 18px checkbox, a 30px identity tile, the
text — with a 3px **rail** down its left edge in the row's channel. The rail
says what kind of thing this is; the tile says who it is from; weight says
whether it has been seen. Unread adds the channel's fill and stroke and a bold
sender; read rows go white with the rail at a third strength. Selection and
the keyboard cursor outrank the channel — a row you picked reads as picked
whatever it is.

The rest of the row:

- **Channel chip.** Mono caps in the channel's ink on a white ground, after the
  sender's name. Correspondence rows only wear it while unread — an inbox
  where every row says "correspondence" is noise — and it hides below 430px,
  where the rail carries it alone.
- **Thread size:** a row is a thread, so one holding more than one message
  wears a filled count chip. `buildRowGroups` counts what *this folder view*
  holds, which is why the Unseen filter can drop it — that is honest, not stale.
- **Meta, then actions, in one slot:** attachment clip and a mono time sit at
  the top right. On hover they step aside and a card of icon buttons steps in —
  flag, mark read/unread, archive, delete, the same four the selection header
  runs on a batch. Pointer only (`@media (hover: hover)`; on a touch screen
  `:hover` sticks), and out of the tab order, because 50 rows × 4 stops is not
  a tab order. Sighted keyboard users get `s` / `e` / `#` on the cursor row,
  which the status line spells out.
- **Group dividers stick,** with the caption on the left and a mono count on
  the right of the rule, so `TODAY · 4` pins while its rows pass under it.
- **On a phone** the checkbox column goes: the row is tile plus text, and
  selection lives in the header's Select menu.

## The reader wears the row it came from

Open a thread and the sender card is the row you clicked, grown up: the same
rail in the same channel over the same fill — and, for anyone who turns the
tiles on, the same identity tile a size larger. That handoff is the whole point — two panes that merely agree on a
palette still read as two panes; one that hands its colour to the other reads
as one thing. The channel is decided the same way (`messageChannel`, from the
folder the thread was opened in and the thread's flags), so the two can never
disagree.

The rest of the pane follows from the same rule:

- The toolbar's Reply is labelled where the pane is wide enough and icon-only
  where it is not, and the **same icons** the list uses sit in a bordered group
  beside it; a flagged thread's flag button is filled in the flagged channel.
  Which of the two leads the bar depends on whether there is a back arrow to
  keep Reply away from — see
  [A screen gets one bar](#a-screen-gets-one-bar).
- **The date is the card's top-right corner**, at every width, drawn the way
  the list row draws its time: plain mono, no pill. The card used to stack
  below 448px, which moved the date under the sender on a phone and back up
  beside it on a desk; it is one number you look up mid-read, so it holds still
  and the address line truncates instead. The white chip it used to sit in was
  the brightest thing on the wash and read as a control.
- **Avatars are off by default** (`showAvatars`). The rail already carries the
  channel, the tile is the row's widest ornament, and a list without it fits
  more mail on a phone. The account's own tile in the top bar is chrome rather
  than a sender, so it stays either way.
- **Thread history** is a stack of cards, each railed by *its* sender's
  identity tone at a third strength, so a thread with three people in it is
  scannable at a glance. Expanding it used to be one-way; it collapses now.
- The card that opens history is a plain tactile card, and its count is the
  **same chip** the list row wears, because it is the same number about the
  same thread.
- `Attachments` is the list's group divider to the letter — caption, rule,
  count — and each chip is 40px with a 22px kind badge whose colour comes from
  `attachmentBadge`, like compose's.
- **Empty and error states are cards too.** Nothing open is a correspondence
  tile with the `j` `k` keys; a load that failed is a discard-channel card with
  the one action worth having, Retry.

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

The editor reads as **cards**, one per rule: its name, a chip per condition,
and an action chip in the channel of what the action does — file is digest,
mark is flagged or needs-you, discard is discard — with Edit opening the form
in place. A **Newsletters rule** button drops in a template (from contains
`newsletter` or `noreply`, subject contains `unsubscribe`, any of them,
filed into a Digests or Newsletters folder if one exists, else Archive) that the
person can trim before saving. That template is how the design's "digest" idea
landed — see [Design follow-ups](#design-follow-ups).

> **Not yet run against a live server** — the pure core is tested and the wire
> calls are typed against RFC 9661, but `SieveScript/*` has never been answered
> by a real Stalwart. See
> [Not yet proven against a server](#not-yet-proven-against-a-server).

## Sections

The top bar's segmented control is the shell's map: **Mail · Contacts ·
Calendar · Settings**. It is one component (`SectionTabs`), and the current
section is read from the URL, so a page cannot claim to be one it is not. Below
`sm` the tabs hide and the account menu carries the same four entries, because
a phone's top bar has no room for a fifth control.

### One header, in the layout

The header belongs to `(app)/+layout.svelte` (`ShellHeader`): the mark on the
left, the tabs and the account tile on the right, mounted once. Each section
used to build its own copy — `TopBar` for Mail, `SectionShell` for the rest —
so every switch tore the header down and rebuilt it, and for a frame the
account tile was gone and the tabs sat 40px to the right of where they landed.
That was the jump.

What a section adds to the bar is still its own. It hands the layout a
**snippet** through context (`#lib/shell.svelte.ts`, `useShellBar`): a snippet
closes over the component that declares it, so Mail's search field lives in the
layout's header and still belongs to `TopBar`'s state. `SectionShell` is now
just that registration — a title and a `controls` snippet — and
`/prototype`, which has no layout, lets `TopBar` draw the header itself. The
layout also exposes the app column (`shell.frame`), which Mail's floating
compose panels are placed against.

Two things in `useShellBar` are deliberate. Who holds the bar is a plain field,
not state: **an effect's teardown reads state as it was before the change that
ran it**, so a section leaving would see itself still in `bar` and wipe the one
its successor had just set — every second switch came up empty until that was
found. And the context key is a string, because Vite's HMR can hold two
instances of the module, each minting its own `Symbol`.

The bar arrives on hydration rather than in the server's HTML: a layout renders
before its page, so there is nothing to hand up yet. The account tile keeps its
30px while the session loads, so nothing beside it moves when it arrives.

## Security

`/settings/security` is the last thing that genuinely blocked retiring 1.0: you
cannot ask people to move to a client where they cannot manage their own 2FA.
Settings is two pages now, **General** and **Security**, under one layout with
the same header.

**Stalwart 0.16 removed its REST management API.** Everything self-service is
JMAP under the `urn:stalwart:jmap` capability, on `x:`-prefixed objects:
`x:AccountPassword` (a singleton — password and TOTP), `x:AppPassword` and
`x:ApiKey`. Webmail 1.0's server code was already on that surface; the Stalwart
calls moved into `@zaur/server-auth` (`account-security.ts`, `totp.ts`) where
both apps — and whatever comes after — can share them. 1.0 keeps its own copy
until it is retired; it is frozen to bugfixes and the two are byte-for-byte the
same wire calls.

Two different things need proving, and the design keeps them apart:

- **Stalwart's own check.** Changing the password or the TOTP state needs the
  current password in the same `x:AccountPassword/set` call (`currentSecret`,
  plus `otpAuth/otpCode` once TOTP is on). Those forms ask for it right there
  and pass it straight through; nothing is cached. 1.0 asked once and kept the
  password in component state to resend — the same thing, less honestly.
- **Our check**, for what Stalwart does not guard with a password: minting an
  app password or API key, signing out a device, changing the recovery email.
  "Confirm it's you" re-authenticates against Stalwart (the PKCE credential
  flow for an OAuth session, a Basic-auth JMAP session for the password
  fallback), writes a five-minute proof into the shared store
  (`step_up_proofs`, keyed by session and account, so a borrowed 1.0 session
  is treated the same) and **rotates the session id** — a fresh id after a
  fresh proof is what stops a captured cookie from inheriting the window. The
  page counts the window down and re-locks when it ends.

The parts that are easy to get wrong, and are tested:

- **TOTP is verified before it is enabled.** Stalwart never hands the secret
  back (`otpUrl` is masked on `get`), so the client mints it, shows the QR, and
  sends the `otpauth://` URL up. Stalwart does not insist on a code to turn
  TOTP on — a mistyped scan would lock the account — so the confirmation code
  is checked here, against the pending secret (RFC 6238 over `node:crypto`,
  ±1 step), and a wrong code keeps the setup alive rather than making the
  person rescan. TOTP management needs an **OAuth session**: a password-fallback
  session cannot carry a code from request to request, and the page says so.
- **Changing the password revokes every token the account holds.** The
  session is signed back in with the new password in the same request; if that
  fails, the next request lands on `/login`, which is the honest fallback.
- **One-time secrets come from `created` only.** `extractOneTimeCredential`
  refuses to read a secret from anywhere else in a response, so a listing can
  never leak one. API keys are minted with a permission set that cannot manage
  credentials or the password — a leaked key must not be able to make itself
  permanent.
- **Stalwart's rejection reason is shown.** "Current password is incorrect",
  "Password is too weak" — the `notUpdated` description is the user's message,
  not a generic "failed".
- **Signed-in devices are ours, not Stalwart's.** Stalwart has no way to list or
  revoke individual OAuth tokens (only a password change revokes them all), so
  the sessions list is the shared store's `session_accounts`, which both apps
  write. Signing a device out drops that account from that session record.
- **Recovery email** lives with the register service; the card appears only
  when `REGISTER_INTERNAL_URL` / `REGISTER_INTERNAL_SECRET` are set.
- Identity checks share the login rate budget; other mutations get a looser
  store-backed window. Password fields use `_`-prefixed form field names, which
  Kit never echoes back to the page.

## Contacts

Compose autocomplete used to scrape senders out of whichever folder page was
loaded and forgot everyone else. It reads the address book now — **JMAP for
Contacts (RFC 9610)**, the same cards a CardDAV client on the phone sees — with
recent senders still offered for the people not yet saved. One list,
deduplicated on the address, so a saved person is never also "Recent".

Nothing in this repo had touched `AddressBook/*` or `ContactCard/*` before
(1.0's contacts pane is a browser-local index), so the JSContact (RFC 9553)
model is new in `@zaur/mail-core`: `contact-types.ts` for the wire shapes,
`contact-map.ts` to flatten a card into what a mail client shows and edits,
and back. **Writes are patches**: the editor owns name, emails, phones,
organisation, title, nickname and notes, and an update touches only those keys,
so a card that also carries addresses, photos or anniversaries keeps them
through an edit made here. Emails and phones are ordered by `pref`; "home" is
translated to JSContact's `private` context.

The whole directory (capped at 2000 cards, paged through `ContactCard/query`
in server-sized chunks) comes down in one query and is filtered on the client.
Stalwart's `text` filter matches whole tokens, which is the wrong shape for
autocomplete — "an" has to find Anders while it is still being typed — and a
personal address book is small. `contactMatches` is a prefix match on words and
addresses, tested.

`/contacts` is the pane: letter-grouped list with sticky dividers (the list's
own vocabulary), search, a detail card with the person's identity tile on a neutral surface (a hue on a
surface means a channel, never a person), and an editor. "Write" opens Mail with
`/?to=address`, which the mail page consumes once and strips from the URL, so a
reload does not open a second draft. Push subscribes to `ContactCard` and
`AddressBook`, so a card saved on the phone shows up without a reload.

## Calendar

`/calendar` is a month grid (Monday first), a calendar list with visibility
toggles, and an agenda for the selected day that turns into the editor. It sits
on the JMAP Calendars client mail-core already carried for 1.0, with two
changes:

- **Recurrences are expanded by the server** (`expandRecurrences`, which the
  latest Stalwart implements and 1.0 predates). A weekly meeting is a row per
  week with a synthetic id; editing one records an override for that date, and
  deleting one is deleting the series, which the prompt says out loud.
- **The browser owns the time zone.** Query bounds go up as local date-times in
  the browser's zone (the six-week grid, so the edges fill), and dates come
  back as `Date` — devalue carries them across the wire.

Shared calendars ride along: `getCalendars` walks every account the session
advertises, and an event carries the account it lives in so a write goes back
to the right one.

## Installable app (PWA)

`static/` holds the icons and `manifest.webmanifest`; `scripts/generate-icons.py`
strokes the mark's own paths (`ZaurMark.svelte`), so the app icon *is* the
mark: the glyph on paper, inside the maskable safe zone. `favicon.svg` is the
same glyph by hand (with a dark variant); `favicon.png`/`.ico` are its raster
fallback, and `badge.png` is the glyph alone for Android's monochrome status
bar. Rerun the script if the mark changes.

**`theme_color` is the app's surface, not its ground.** It was `--z-ground`
(`#eef1f5`), the colour that only shows past the 1780px ceiling — so an
installed iOS app painted a grey strip above a white app, and whatever
translucent material iOS draws over the status bar had a hard edge to smear.
It is `--z-surface` now, in the manifest and in the two `prefers-color-scheme`
`<meta name="theme-color">` tags, so the strip is the same colour as the bar
under it and there is nothing left to blur. iOS owns that strip either way;
what we control is whether it has any contrast to work with.

The service worker (`src/service-worker/`, registered by Kit as a module) does
two things: show a push, and open its link. It has **no fetch handler and no
cache** — offline reading is not planned, and an app-shell cache is how a
deploy ends up serving yesterday's JavaScript. It is typechecked against
`$app/tsconfig/service-worker` in its own folder; the root tsconfig excludes it
and `pnpm check` runs both.

## New-mail notifications (Web Push)

The design is 1.0's, which has run in production since its first push release:
the **server** watches each subscribed session's inboxes and pushes; Stalwart's
own `PushSubscription` is not used.

- `push.remote.ts` — `pushConfig`, `subscribePush`, `unsubscribePush`. A row
  belongs to the session that registered it, and nobody else can remove it.
- `#lib/server/push.ts` — VAPID config, the **endpoint allowlist** (the server
  POSTs to whatever a browser registers, so anything that is not FCM, Mozilla,
  Apple or Windows push is refused: blind SSRF otherwise), and the sender. A 404
  or 410 from the push service deletes the row.
- `#lib/server/push-watcher.ts` — per subscription, per account in its session:
  the JMAP event stream (polling without one) → `Email/changes` → new unseen
  inbox mail → one notification, or "N new messages" for a batch. Started from
  `init` in `hooks.server.ts`.
- Rows live in the shared SQLite store (`push_subscriptions`), not 1.0's JSON
  file: that one had no lock. A browser re-registers on every app load, and a
  row nobody refreshed in 30 days is pruned; signing out deletes the session's
  rows at once.

Two differences from 1.0, both about the shared session: a watcher that cannot
connect **backs off** (5 s doubling to 5 min) instead of retrying every five
seconds, and an auth failure is left for the next resync rather than deleting
the device's subscription — both apps refresh tokens for the same sessions, and
a refresh race must not cost anyone their notifications.

The client (`#lib/push.ts`) stores nothing: whether this browser is subscribed
is read back from its `PushManager`, so the Notifications card in Settings
cannot disagree with the browser. On iPhone and iPad push only exists for a
Home Screen app, and the card says that instead of offering a button. Brave
ships with its push service off; enabling fails with a hint naming the setting.

A notification opens `/?thread=<id>` (plus `&account=<key>` when the session
holds more than one), which the mail page consumes once: it switches account if
needed (a reload), cleans the URL with a replacing navigation — not
`replaceState`, since on a phone the reader pushes a shallow entry relative to
the page URL — and opens the thread in the inbox.

## Several accounts

`@zaur/server-auth` always kept several accounts per session; mail2 now uses it.

- **Add**: the account menu's *Add account* opens `/login?mode=add`, which skips
  the signed-in redirect and signs in with `addAccount` (it joins the session
  and becomes active) instead of `writeSession` (a fresh session of one).
- **Switch**: `switchAccount` in `session.remote.ts`, then a **full reload**. The
  page holds a lot that belongs to one account — the query cache, the live event
  stream, compose's drafts, the synced prefs — and a reload is the one reset that
  cannot miss any of it.
- **Other tabs** hear about a switch or sign-out on a `BroadcastChannel` and
  reload too. The session is shared, so the active account changes for every tab
  at once — webmail 1.0's tabs included, which cannot be told.
- **Sign out** offers *this account* (`signOutAccount`) and *all accounts* once
  there are two.
- **The outbox follows its author.** Every send carries the account that wrote
  it; the drain skips another account's queued messages (a wait, not one of the
  five failed attempts that delete a message), and `send` refuses a mismatch
  with a 409 — which also covers a stale tab after a switch.

## Smoke-testing without a mailbox

The `(app)` routes sit behind the session gate, and there is no test mailbox.
`tests/smoke/` is the way to see them anyway:

```sh
pnpm --filter @zaur/mail2 smoke:jmap    # a fake JMAP server on :9911
pnpm --filter @zaur/mail2 smoke:seed    # a signed-in session in .data/store.sqlite
pnpm dev:mail2                          # set the printed cookie, open the app
```

`fake-jmap.mjs` speaks just enough of Stalwart's dialect — session, mailboxes,
`AddressBook`/`ContactCard`, `Calendar`/`CalendarEvent` (with a fake weekly
expansion), and the `x:` self-service objects — to exercise every remote
function in Security, Contacts and Calendar end to end, including the
`#ids` back-references the contact and credential listings chain on. It logs
the payloads it receives, which is how the shapes were checked. The seeded
password is `not-a-real-password`. Point `SMOKE_JMAP_URL` at a dead port to see
every error state instead.

`POST http://127.0.0.1:9911/smoke/deliver` (optional `{"subject","from","fromName"}`)
drops a new unseen message into the inbox, moves the Email state on and sends a
`StateChange` down every open event stream — mail arriving, for the push watcher
and the live list.

Remote **commands and forms** need `pnpm dev:mail2` locally, not `node build`:
adapter-node 6 no longer reads `ORIGIN` and assumes `https`, so over plain
`http://127.0.0.1` every POST is refused as cross-site (403). Queries still work.

It is a fake: it proves the plumbing, not Stalwart's acceptance of it. The
first run against the real server is still a test — see the table below.

## Settings that follow the account

Five of the seven preferences travel with the account. **Two deliberately do
not**, and this is the part worth stating plainly, because syncing them would
have been a regression dressed as a feature:

| Preference | Where it lives | Why |
| --- | --- | --- |
| `pageSize`, `markReadOnOpen`, `showPreview`, `showAvatars`, `unseenByDefault` | account | Behaviour and workflow — the same answer is right on every device |
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

## Checks

```sh
pnpm --filter @zaur/mail2 check     # svelte-check
pnpm --filter @zaur/mail2 test      # 83 tests
pnpm --filter @zaur/mail2 build

pnpm --filter @zaur/mail-core check && pnpm --filter @zaur/mail-core test    # 48
pnpm --filter @zaur/server-auth check && pnpm --filter @zaur/server-auth test # 45
```

`apps/webmail` currently reports **3 pre-existing `check` errors** — a duplicate
Svelte version making two `Snippet` types unrelated, in its own
`CopyButton`/`LabelInput`/`PasswordInput`. They are not mail2's and not
mail-core's; confirmed by stashing the shared-package changes and getting the
same three.

## Not yet proven against a server

Everything here was built without a mailbox to test it against. Everything
below type-checks, the pure parts are covered by tests, and the newer slices
(Security, Contacts, Calendar) have run end to end against the fake JMAP server
in `tests/smoke/` — but **nothing in this table has been answered by a real
Stalwart from this codebase.**

Treat the first run of each as a test. In the order they are likely to bite:

| Feature | Verified | Never exercised | What would fail first |
| --- | --- | --- | --- |
| **Security** | `x:AccountPassword` / `x:AppPassword` / `x:ApiKey` calls against the fake, incl. rejection messages; TOTP against RFC 6238 vectors; 11 + 5 tests | a Bearer OAuth token being accepted for `x:` methods (1.0 relied on it; Stalwart's WebUI does the same); enabling TOTP with a client-minted `otpauth://` URL | Stalwart wanting a code to *enable* TOTP after all — the fake does not ask; if it does, the same code the page already verified is in the request, so it should pass. Check the permission preset on API keys is accepted verbatim |
| **Contacts** | `AddressBook/get`, `ContactCard/query`+`get` chained on `#ids`, `set` create/update/destroy against the fake; JSContact mapping, 7 tests | Stalwart's `ContactCard/query` sort by `name/surname` (there is an unsorted fallback on `unsupportedSort`); `uid` handling on create | The `Card` shape on create — `@type`/`version` are sent; Stalwart may insist on `kind` or reject an unknown property |
| **Calendar** | `Calendar/get`, `CalendarEvent/query`+`get` with `expandRecurrences`, `set` against the fake | real server-side expansion (synthetic id format, `recurrenceId`), updating one occurrence, `sendSchedulingMessages` | An update on a synthetic id being refused rather than recorded as an override; the editor says "this occurrence" — if Stalwart says no, the message surfaces |
| **Live updates** | endpoint returns 401 unauthenticated; `changedTypes` unit-tested | the SSE pump, reconnect, OAuth refresh on a stream that outlives its token | The stream opens and then dies quietly at the first token refresh. The 90s stale timer and the polling fallback are what should keep the list correct anyway — check that polling actually takes over rather than assuming the stream is fine |
| **Rules (Sieve)** | script generation round-trips, 14 tests | `SieveScript/get`/`set`/`validate`, blob upload of a script, activation | Stalwart rejecting the generated Sieve. This is the good failure: `validate` runs *before* the script is stored, so the error surfaces as a message rather than a filter that silently stops working. Check `require` handling and `addflag` first |
| **Attachment downloads** | endpoint returns 401 unauthenticated; URL encoding unit-tested | `downloadBlob` against a real blob, streaming a large file | Content type or disposition being wrong for one file kind, or a large file buffering where it should stream |
| **Search** | UI exercised end to end on mock data; the parser is 1.0's, already in production there | `Email/query` with a parsed filter against Stalwart | An operator Stalwart's FTS treats differently from 1.0's usage — `before:`/`after:` are the likeliest, since dates go over as ISO strings |

The settings sync is the exception: it runs on our own SQLite, so it **is**
tested for real, including that an existing deployed store picks up the new
table on reopen with no migration step.

The **rules editor** has been looked at against the fake — empty state, the
Newsletters template, a card and its inline form — but the fake's
`SieveScript/set` accepts anything, so a script Stalwart would refuse has not
been seen refused.

## Picking this up next

The first thing to do is not a feature: **sign in with a real account and walk
the table above**, top to bottom. Every wire shape here was checked against
Stalwart 0.16's source and docs, and against the fake — the live server is the
one reviewer that has not seen it.

Web Push, several accounts and the installable app have landed (§ above);
their first real test is a phone with the app installed and two accounts
signed in. After that:

1. **Muting an account's notifications.** The store keeps `muted_accounts` per
   device already (1.0 has the switch); nothing sets it yet.
2. **Files pane.** Stalwart speaks JMAP for File Storage (`FileNode/*`) and
   mail-core has the client for it from 1.0; ADR-0005 holds it until the
   design lands.

## What is still missing

Measured against webmail 1.0 and against what Stalwart actually implements:
the two items above, and — post-cutover by ADR-0005 — mail2 acting as an OIDC
provider. Stalwart itself is one (`/.well-known/openid-configuration`,
`/auth/userinfo`), which is worth knowing before building another.

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
- Server state goes through SvelteKit **remote functions** (`*.remote.ts`):
  `mail` (folders, threads, one thread, quota, search, bulk actions), `compose`
  (send, schedule, drafts), `settings` (identities, account prefs), `rules`
  (Sieve), `security` (password, TOTP, credentials, devices, recovery),
  `contacts` (address books and cards), `calendar` (calendars and events), `push`
  (notification subscriptions) and `session`/`login` (including account switching). The newer modules validate their arguments with
  **valibot** schemas (Kit's Standard Schema hook) and share
  `#lib/server/account` for "who is signed in, give me a JMAP client"; the
  older ones still carry the pass-through `schema<T>()` stub, which is the obvious
  next tidy-up. Their private copies of that helper are gone: those dropped the
  session id, so a refreshed OAuth token was never saved. Remote **forms** are used
  wherever a password crosses the wire: `_`-prefixed fields are never echoed
  back, and a form still works without JavaScript.
- **Three things are plain endpoints instead**, because remote functions are
  request/response over JSON and these are none of those: `/api/upload` and
  `/api/download` move bytes (a command cannot carry a `File`), and
  `/api/events` holds a stream open for hours. All three proxy Stalwart because
  the credentials they need stay on the server.
- The offline outbox is a lightweight IndexedDB queue (`#lib/compose/outbox`)
  that drains on load and on reconnect. Drafts autosave to the server's Drafts
  mailbox (debounced, 1.5 s).
- **What lives in `@zaur/mail-core` rather than here:** anything a native client
  would need too — the JMAP client, the search query parser, and the rule model
  with its Sieve compiler (`sieve-rules.ts`). What stays in mail2 is the shell:
  the push listener, the remote functions and the UI.
- Styling is design system v2: `styles/tokens.css` carries the surfaces, ink ramp,
  six channels, elevations and the (unwired) dark ramp; `styles/base.css` owns the
  shared primitives (`.btn-tactile` / `.btn-primary` / `.btn-danger`, `.z-icon-btn`,
  `.z-group` / `.z-segment`, `.z-check`, `.z-field`, `.z-kbd`, `.z-avatar`, `.z-chip`,
  `.z-count`, `.z-railed` / `.z-hue-wash`, `.z-menu`, `.z-caption`) and the `.z-shell`
  grid; `#lib/mail/colors` owns the channel and identity models (`messageChannel`,
  `mailboxChannel`, `identityTone`, `attachmentBadge`). Components use the v2 hex
  values directly, like the design file does — moving them onto the tokens is the
  first step of the dark pass.
