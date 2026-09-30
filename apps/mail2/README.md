# @zaur/mail2 — Zaur Mail 2.0

The Mail 2.0 client (ADR-0005): a clean-room rebuild of the webmail UI on the
shared packages, following the redesign handoff's resolved variants. Light and
dark themes (see [Dark mode](#dark-mode)). Files is built from the shell's own
parts (no design of its own yet).

## Status

- [x] Shell scaffold, remote functions enabled, tactile shell + Hobday palette (foundation slice)
- [x] Session-aware read path (mailbox → thread list → reader)
- [x] Floating multi-draft compose (panels, dock, schedule send, offline outbox,
  undo send)
- [x] Offline drafts: a draft the server can't take yet is kept on the device,
  saved to Drafts on reconnect, and reopened in the dock after a reload §
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
- [x] Send-as addresses (From picker when there are aliases), per-address
  signatures (JMAP `Identity.textSignature`), auto-reply (`VacationResponse`),
  and your own folders — create, rename, move, delete, nested in the sidebar ‡
- [x] Files pane (`/files`) over JMAP `FileNode`: folders, upload (button or
  drop, up to the server's 50 MB), preview, rename, move, delete, search, sharing,
  and what others share with you — see [Files](#files) ‡
- [x] Installable app (PWA): icons from the mark, manifest, service worker — see
  [Installable app](#installable-app-pwa) §
- [x] New-mail notifications (Web Push), closed tab included — see
  [New-mail notifications](#new-mail-notifications-web-push) §
- [x] Several accounts in one session: add, switch, sign out of one — see
  [Several accounts](#several-accounts) §
- [x] What 1.0 did around sign-in: forgotten password, the signup handoff from
  register, mail as the OIDC sign-in for Bartube, CSP and security headers —
  see [Sign-in](#sign-in) §

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

The rest of what 1.0 did around sign-in, so mail2 can take over its hostname:

- **Forgotten password** (`/forgot-password`, `/forgot-password/reset`):
  register holds the recovery addresses and sends the link, which lands here
  (`src/routes/reset.remote.ts`). Register rate-limits by IP, and every call
  comes from this server, so the person's own address rides along, signed with
  `REGISTER_INTERNAL_SECRET`. The token is checked before the form is shown.
- **Signup handoff**: after creating an account, register signs a POST to
  `/api/internal/handoff` with the new credentials; mail2 builds the session
  as `/login` would and parks it behind a one-time `/auth/claim?token=` URL.
  The browser follows it and arrives signed in. An old or used link is a
  sign-in with a welcome (`/login?welcome=1`).
- **OIDC provider** for our own apps (`/oidc/authorize|token|jwks|logout`,
  `/.well-known/openid-configuration`, clients from `OIDC_PROVIDER_CLIENTS`):
  code flow with PKCE, RS256 id_tokens whose claims pass Stalwart's userinfo
  through, plus name and roles from register. The protocol core is shared
  with 1.0 (`@zaur/server-auth/oidc`), and so is the signing key: it lives in
  the session store, so the JWKS does not change at the cutover. Signing out
  of Bartube lands on `/login?signed_out=1`, whose sign-in returns there via
  `/auth/return`. `/oidc/token` is the one form POST exempt from the
  cross-site check: `csrf.trustedOrigins: ['*']` turns Kit's off and
  `hooks.server.ts` does the same check with that one exception.
- **Headers**: a nonce-based CSP (`csp` in `vite.config.ts`),
  `X-Frame-Options: DENY`, `nosniff`, a referrer policy, and a
  Permissions-Policy that allows camera and microphone on `/meet/` only.

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

A Dokploy service builds `apps/mail2/Dockerfile` from the repo root on every
push to `main` (git auto-deploy), with `.github/workflows/deploy-mail2.yml` as
the pre-deploy quality gate. Since 2026-09-26 it serves `webmail.zaur.app` as
well as `mail2.zaur.app`; the 1.0 webmail service is stopped, with auto-deploy
off and no domains (see *Taking over webmail.zaur.app* below).

The container signs in through **its own** `/login` (Stalwart OAuth credential
flow). It keeps the store mount 1.0 used: `STORE_DB_PATH` defaults to
`/app/.data/store.sqlite`, and that directory also holds the OIDC signing key,
so the JWKS that Music, Photos and Bartube trust stays the same across
redeploys.

Service settings:

| Setting | Value |
| --- | --- |
| Build type | Dockerfile — path `apps/mail2/Dockerfile`, context: repo root |
| Domain | `webmail.zaur.app`, `mail2.zaur.app` |
| Port | 3000 (`PORT`, `HOST`, `BODY_SIZE_LIMIT=50M` are baked into the image) |
| Env | `SESSION_SECRET=<same value as the webmail service>` |
| Env | `SESSION_COOKIE_DOMAIN=.zaur.app` |
| Env | `STALWART_OAUTH_ENABLED=true`, `STALWART_OAUTH_ISSUER_URL=https://mail.zaur.app` |
| Env | `STALWART_OAUTH_CLIENT_ID=zaur-mail2-prod`, `STALWART_OAUTH_REDIRECT_URI=https://mail2.zaur.app/api/auth/oauth/callback` |
| Env | `JMAP_INTERNAL_URL=http://mail:8080` |
| Env | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — notifications; webmail's values work (`npx web-push generate-vapid-keys` for new ones). Unset, the settings card says so |
| Env | `PUBLIC_TRACEWAY_DSN=<token>@https://traceway.zaur.app/api/report` — optional; browser and server errors, plus server tracing (`src/lib/server/tracing.ts`) |
| Volume | the host directory 1.0 webmail used for `/app/.data` → `/app/.data` |

`SESSION_SECRET` is required in production: session records are sealed with
it, so changing it signs everyone out.

### Taking over webmail.zaur.app

On 2026-09-26 `webmail.zaur.app` was pointed at this service rather than
moving people to a new address, so Meet links, installed PWAs, the Capacitor
shell's URL, register's `WEBMAIL_URL` and the OIDC issuer that Bartube, Photos
and Music check all kept working. To roll back: delete the `webmail.zaur.app`
domain from this service in Dokploy, create it again on the webmail service,
and start that service. What 1.0 left behind is handled here:

- **Old links** — `#lib/legacy-links.ts`, run from `handle`, maps each 1.0 URL
  to its nearest mail2 page:
  - `/mail/<folder>/<thread>` goes to `/?thread=`;
  - `/mail/compose?to=` goes to `/?to=`;
  - the folder and search pages go to the inbox;
  - `/settings/contacts` goes to `/contacts`, and each other 1.0 settings page to its
    nearest mail2 one (`general` → Account, `compose` → Reading & writing, `display` →
    Appearance); `reading`, `appearance` and `security` are mail2 pages too and stay;
  - `/register` goes to the register service.

  They are 302s, so pointing the domain back at webmail undoes them.
- **Signatures** — 1.0 kept one per account in its settings email.
  `#lib/server/webmail-import.ts` copies it onto every identity without one
  the first time an account's identities load, then tags the email
  `$zaur-mail2-imported`.
- **Remembered correspondents** — 1.0's autocomplete list sits in
  `localStorage` (`zaur:contacts:v2:<accountId>`). Once mail2 serves the same
  origin, compose offers them as "Recent", after the address book, ordered by
  how often each was written to. It reads the list and does not copy it.
- **Notifications** — done at the switch, in three steps:
  1. Copy webmail's `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`
     into this service and redeploy. It is safe at any time: a browser holding
     a subscription under another key re-subscribes on its next load
     (`resyncPush` goes through `enablePush`).
  2. At the switch, stop webmail, or at least unset its VAPID keys, so nobody
     gets two of everything.
  3. Import 1.0's subscriptions and restart this service so its watcher picks
     them up. The import skips FCM rows and dead sessions, can be run more than
     once, and takes `DRY_RUN=1`:
     ```sh
     docker exec -i <mail2 container> node - < apps/mail2/scripts/import-webmail-push.mjs
     ```

Not carried over:
- 1.0's other settings, since mail2's are its own;
- the Android shell's FCM push, which had no subscribers on 2026-09-25.

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

`/settings` (inside the `(app)` gate) is a page per topic under one layout, listed
in `#lib/settings/sections.ts`: **Account** (`/settings` itself), Addresses, Password
& sign-in, App passwords, Devices; Reading & writing, Auto-reply, Folders, Rules &
categories, Sharing; Appearance and Notifications for this device. From `md` the
list is a side column like mail's folder list; on a phone `/settings` is the
profile card with the list under it, and each page has a back button. The heading
and one-line description of each page come from the same table.

Addresses is a list, one line per address (name and signature's first line), with
one open for editing at a time and *Use on all N addresses* for aliases that want
the primary's name and signature. The password window the security pages share
is `ConfirmIdentity.svelte`.

A pane that reads from the server (Addresses, Password & sign-in, App passwords,
Devices, Auto-reply, Folders, Rules, Sharing) says when that load failed and has
**Retry** beside the message, which asks again without a reload of the page.

Settings has **three** owners, not two; which one a setting belongs to is a real
decision rather than an accident of where it was easiest to put:

- **The mail account (Stalwart).** The send-as display name per identity,
  through `settings.remote.ts` (`Identity/get` + `Identity/set`), plus the
  account address, quota and sign-out. Mail rules live here too, as a Sieve
  script — see [Rules](#rules).
- **The Zaur account (our store).** The preferences that should be the
  same wherever you sign in — see
  [Settings that follow the account](#settings-that-follow-the-account).
- **This browser.** `#lib/settings` still owns the `mail2.prefs` localStorage
  blob (`parsePrefs` merges it over the defaults and drops anything malformed),
  exposed as a `$state` object by `#lib/settings.svelte.ts`. Everything lives
  here first; the account's copy is merged over it on sign-in, and `listWidth`,
  `sidebarOpen` and `theme` never leave.

### Unsaved work asks first

Rules and Auto-reply are saved with a button, and both ask before changes that
were not saved are dropped. So do the contact editor, the calendar's event
form, a calendar's settings (a name or colour not saved yet) and the address
open in Settings → Addresses, whose signature can be many lines; there, opening
another address asks as well. `leaveGuard(dirty, what)` in `#lib/leave-guard.ts` is the one place that
asks: a link, a section tab, Back and a reload all reach it through Kit's
`beforeNavigate`, and when the tab is closed the browser asks in its own words.
It must be called while the component initialises, as `beforeNavigate` must.

It lets through any navigation that stays on the same path, because that is a
layer's history entry (the compose sheet opening on a phone) and not a way out.
The ways out that stay on the page (Escape, a layer's Back, opening something
else in the form's place) call the function it returns instead.

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
| Profile "Keyboard shortcuts" | inert menu item — the list is back as a sheet the `?` key opens, see [Keys](#keys) |

Attachment chips stay, and they are downloads again: `/api/download` streams
the blob through the server, mirroring `/api/upload`, because Stalwart's
`downloadUrl` wants credentials that stay there. The filename goes out in both
the RFC 5987 `filename*` form and a stripped plain one, so a name with an em
dash in it survives.

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

The list's width is the person's, set with the splitter between the panes (380
to 760px, `listWidth`), but only while the window has room for it: the list
never takes more than half of what the sidebar leaves, so the message is always
the wider pane. The limit is in two places that have to agree. The grid caps
the column in CSS (`min(var(--z-list-w), 50%)` in `.z-shell`), which is what
holds when a stored width meets a smaller window, and `Splitter.svelte`'s
`limit()` applies the same half to a drag and to the arrow keys, so the handle
does not travel past where the column stops.

`.z-shell` is one row, exactly as tall as its slot (`minmax(0, 1fr)`), and each
pane scrolls inside it. Left to size itself, the row grew to the tallest pane,
a long folder list for one, and pushed the others and the status line off the
bottom of the window.

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

The server cannot know the width, so it renders the sidebar as the column it is
on a desk. Below 1024px that markup would be the drawer, open over the list
until the page hydrates. CSS keeps it away there (`max-lg:hidden`) until the
drawer has been opened, so a phone never sees it flash on a load.

As a drawer it is modal. Focus moves into it when it opens and back to what
opened it when it closes, and the panes under the scrim are `inert`, so Tab and a
screen reader cannot reach what the scrim covers. It is also a history entry
(see [Back closes the layer on top](#back-closes-the-layer-on-top)), at every
width below 1024px and not only on a phone, because a tablet's drawer covers the
list just the same.

A phone gives each kind of navigation one home. Sections are a tab row along
the bottom (`PhoneTabBar`) on every screen, gone while a thread is open and
while the keyboard is up. The drawer holds your mailboxes and labels and nothing
else. Accounts (switch, add, sign out) are Settings → Account, and the Settings
tab wears the signed-in account's tile. The shell header keeps only the
section's own controls; the mark, the tabs and the avatar come back from 768px.

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

Either way the open thread is in the URL (`?thread=<id>`, next to `?folder=`), so
a reload or a copied link reopens it. On a phone the parameter rides on the
shallow entry, so Back drops it with the reader. `patchQuery` writes every query
change in turn, each from the URL the last one left — a folder switch that also
closes the reader is two writes, and in parallel each would undo the other.

### Back closes the layer on top

The reader's entry is one case of a rule: whatever covers the screen on a phone
is a shallow history entry, so Back closes it rather than leaving the screen
under it. `backLayer(name)` in `#lib/back-layer.svelte.ts` is the one
implementation, and the drawer, the compose sheet, the reader's attachment
preview, a contact, the calendar's panel and a file preview all use it. On
wider layouts nothing is covered, and the same object is plain state. A layer
opened over the reader copies the reader's state onto its own entry, so the
thread is still open underneath.

What to know before adding one:

- **Closing is a step back, and a step back lands late.** `hide()` returns a
  promise for it. Whatever navigates next has to wait for that promise or go
  through `inOrder`, or it writes onto the entry being left: picking a folder
  in the drawer closes the drawer first and changes the folder after, and the
  drawer's Edit link steps off its entry before going to Settings. Kit has no
  event for a shallow pop, so `stepBack` polls for it and gives up after half a
  second.
- **A reload keeps the entry, not what the layer showed.** A page that can put
  it back calls `show()` again (Contacts keeps the open contact in a
  `snapshot`). An entry nobody claims is stepped off once the page has loaded,
  so that Back is not spent on nothing.
- **Back on unsaved work has already happened.** By the time a page sees its
  layer closed, the entry is gone, so "stay" means showing the layer again;
  Contacts and Calendar do that when `leaveGuard`'s question is answered no
  (see [Unsaved work asks first](#unsaved-work-asks-first)).

The compose sheet never discards on Back: the draft goes to the dock, and only
a draft with nothing in it is closed.

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

**Reply goes where the message says to answer** (`replyRecipients` in
`#lib/compose/quote.ts`): its Reply-To when it names one, else its sender. A
message you sent is answered to the people you sent it to, because a reply to
it is a follow-up to them and not a letter to yourself.

**Reply all answers the message in hand and nothing earlier**
(`replyAllRecipients`, same file). Its sender (its Reply-To, when it names one)
and the people it was addressed to go in To, and its Cc stays Cc. Whoever was dropped from the
conversation along the way stays dropped, which collecting addresses from the
whole thread would undo. Your own addresses are left out, with two exceptions
that would otherwise leave nobody: a message you sent goes back to the people
you sent it to, and a note to yourself goes back where it came from.

Only the open folder's list follows live changes; every other folder's is kept
from the last visit. So a move refreshes the **destination** folder's cached
list, its Undo refreshes the folder the messages were taken back out of, and a
folder asks again whenever it is returned to. Without the first, the folder you
just moved something into showed it as it was before, which reads as a move
that did not happen. Without the second, a row stayed behind in that folder
and offered to delete a message that was no longer in it.

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

On a phone the sheet is a whole screen, so it is a history entry (see
[Back closes the layer on top](#back-closes-the-layer-on-top)): Back puts the
draft in the dock instead of leaving Mail from under it.

The sheet also gives way to the keyboard. A phone on its side with the
keyboard up leaves it some 150px, and its two bars alone are 124. While the
message has the focus and the shell is under 300px tall, the address rows and
the subject step out; under 240px the action bar goes too, and the sheet is its
header (with Send) and the message. They return with the height. The
attachment strip scrolls with the message in a sheet, where a window pins it
above the action bar: pinned, one file and the keyboard left the message no
height at all.

**Cc and Bcc left the chip row.** They used to sit inside it, so the first
recipient pushed them onto a line of their own; they hold the row's right edge
now. On a phone they are one chevron rather than two words, and it opens both:
two labelled buttons cost ~100px of a 390px screen, width the names need more,
and each row carries its own ✕ for whichever you did not want.

### One address row, drawn three times

To, Cc and Bcc are the same field, so they are the same component: a chip list
with completion over the same address book, the same identity tones, the same
Enter/comma/semicolon/Tab commit and the same Backspace. Cc and Bcc used to be bare
comma-separated text that was only parsed at send — no completion, no chip, and
no way to correct one address out of four. They are `Recipient[]` on the draft
now, like To has always been, and `RecipientField` is what every store method
takes so none of it exists three times over.

Enter, Tab, a comma and a semicolon commit a suggestion only when it is
highlighted in a list that is open, that is, one the writer can see
(`highlightedSuggestion`). A closed list still has a first row, whoever sorts
first in the address book, and committing it added a stranger to a message from
an empty field. A whole address typed by hand is not replaced by the first row
either: that row only contains it (`ann@corp.com` finds joann@corp.com), so it
takes over when it is the same address or was picked with the arrows.

A chip opened for editing starts with its text selected. Text that is no
address is not a deletion: Enter keeps the editor open and marked, and leaving
it or Escape puts the chip back as it was. Only emptying a chip removes it.

**Every way in splits a list.** Those keys, leaving the field, a paste and Send
all end in `splitRecipients` (`#lib/compose/recipients.ts`), which reads one
entry or many, separated by commas, semicolons, new lines or only spaces, each
`a@b.com`, `Name <a@b.com>` or `Name a@b.com`. A pasted list becomes as many
chips at once; it used to become one chip named after all of it, and only its
last address got the mail. Duplicates collapse whatever their case, and an
address lives in one row only: added to Cc, it leaves To. What is not an
address stays in the field, and Send refuses to go around it. The row is
marked and says "… is not an email address", where sending around it dropped
that person without a word.

A chip's name travels with its address. Send and draft payloads carry
`{ name?, email }` (`outgoingRecipients`), so the header reads
`"Annie Hobday" <annie@…>` and not the bare address. The server's
`cleanRecipients` still accepts a bare string, because an outbox entry queued
by an older build carries those. A message needs one recipient in any of the
three rows: Cc only or Bcc only is a message that can be sent.

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
strip (`justify-start` — with `justify-end` the overflow spills past the
unscrollable start edge). It is a row of the page under the panes, not a float
over them, so the last row of whichever pane is showing is never under a chip.
Chip reordering is skipped for touch pointers, where the same drag is the
strip's scroll. A click or a tap anywhere on a chip reopens its draft, and a
press that moves more than 4px is a reorder and reopens nothing. On a phone the
chip is therefore its own way back in, and the one icon it keeps is Close.

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
  folder chip already carries the unread count. The key hints alone step out
  wherever the pointer is a finger (`pointer-coarse`), a touch laptop or a
  tablet with the status line on screen included.
- What the whole app should say once, it says in the shell header: that the
  connection is gone ("Offline"), that messages are waiting in the outbox ("N
  waiting to send") and that a newer build is waiting ("Reload to update"). The
  outbox has no folder to look in and sends from every section, so its count
  shows in every section and not in Mail's status line. From 768px the three
  sit next to the section tabs, the count as a chip in the needs-you channel
  (below 1024px the number alone, with the words as its tooltip). A phone's
  header has no room, so there they are a strip above it, in the flow, so it
  covers nothing.
- Touch sizes are one unlayered rule in `base.css`, under
  `@media (hover: none) and (pointer: coarse)`: `kbd` hints hide, and icon
  buttons and header controls get a 40px minimum. It is keyed on the pointer
  and not the width, so a tablet gets it and a narrow desktop window does not.
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
is collapsed. The tab's title is the one place outside the view that says it,
for a pinned tab: `(3) Inbox · Zaur Mail`, the inbox's unseen count and the
folder that is open. Every section's title carries the count (`shell.title`,
from the `shell.unread` the `(app)` layout keeps), so a tab pinned on Calendar
reads `(3) Calendar · Zaur Mail`. The sprite stays a mascot for `@zaur/sprite`.

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
- **Type.** System sans for the interface: `Seravek, 'Gill Sans Nova', Ubuntu,
  Calibri, 'DejaVu Sans', source-sans-pro, sans-serif`. The one downloaded face
  is [Ioskeley Mono](https://github.com/ahatem/IoskeleyMono) (OFL), for
  captions, counts, times, addresses and keys: three weights, subset to Latin
  without code ligatures, ~18 KB each, in `src/routes/styles/fonts/`. Mail
  itself (a plain-text body, code in a message) keeps the system mono,
  `--font-mail-mono`: `ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo,
  Consolas, 'DejaVu Sans Mono', monospace`. Eight roles from
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
- **A Flagged filter, and a Labels group under Mailboxes.** The list header is
  All / Unseen / Flagged plus a Label… select (on a list narrower than 430px
  Flagged moves into the Label… menu). Each goes to the server as one
  JMAP `FilterCondition` (`notKeyword: '$seen'`, `hasKeyword: <keyword>`), not a
  client-side sieve of the loaded page, so it is right across the whole folder.
  The design's Channels group became **Labels** (`src/lib/mail/labels.ts`):
  Important, Flagged and each category, with their unseen counts. A label
  filters the open folder, so the folder stays ticked alongside it. It is one
  filter at a time, shared with the header, and ticking it again turns it off.
  The design's rows (Needs reply, Digests, Confirmations) were placeholders, so
  the rows are the keywords the mail really carries.
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
- **Parked: the ⌘K palette.** Everything it would reach has a key already (see
  [Keys](#keys)); it earns its place when there are more destinations than
  keys.

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

The editor is a chunk of its own, loaded through `loadTrix` in `#lib/compose/trix.ts`: by the
first panel, or before it by the Mail page once it is idle (`requestIdleCallback`, a 2 s timer in
Safari). Fetched only when the first panel opened, it arrived after the first keys of the first
reply, and those keys were lost. A load that fails is forgotten, so the next call tries again.

The toolbar has bold, italic, strike, link, bullets, numbers, quote, heading (`h1`), code block
(`pre`), *Insert image* and undo/redo — all Trix's own `data-trix-attribute` / `data-trix-action`
buttons; the only handlers of ours are for the keyboard (below). *Insert image* is Trix's `attachFiles` picker, so what it picks goes
through the same path as a paste: images into the text, anything else to the attachment strip.
The paperclip still attaches everything, images included. Trix disables undo/redo when there is
nothing to undo, and block buttons inside a code block.

A draft carries both `bodyHtml` (what the editor holds) and `body` (its plain-text reading,
`richToText` in `#lib/compose/plain`: the `text/plain` alternative, and what the rest of compose
reasons about). That reading is written for a plain-text client — a quote is `> ` lines, a list keeps
its `- ` / `1. ` markers, a link is `words <address>`, an image is `[image]` — where Trix's own
`toString()` dropped all of it. `bodyHtml` stays empty until
something is written, so an untouched reply is not an edit and does not autosave. With it the
message goes out `multipart/alternative`; without it, plain, as before.

The quoted original is seeded from plain text (`replySeed`) and lives inside the editor as a
blockquote, so it can be answered inline. The only HTML ever loaded into Trix is a reopened
draft's, and that is not trusted either: another client may have saved it, so it goes through the
reader's sanitizer first (`prepareEditorHtml`, see [HTML mail](#html-mail)). If the editor's chunk
cannot be loaded (offline, or gone after a deploy), the draft switches to plain text with a notice
and keeps its words.

**Links in the editor are inert.** A link in the text is text being edited, and the browser does
not follow one in an editor, but Kit's router takes any click on a link to this app: a planted
`/oidc/logout` in a draft signed its reader out. `RichBody` cancels every click and middle-click
on a link, so no click in the editor navigates.

**Plain ⇄ rich.** The `Plain` button in the action bar switches a draft (`draft.plain`,
`compose.setPlain`) between Trix and a monospace textarea. Going plain keeps the words and drops
the formatting and the pictures — `body` already is the plain reading — and the message is sent
`text/plain` only; going rich reseeds the editor from the text. There is no way back to what was
dropped, so when the message holds more than words and quotes the button asks first. The switch
is per draft. What new messages start as
is Settings → *New messages start as* (`composePlain`, one of the prefs that travel with the
account); a draft that was saved rich reopens rich regardless.

Things that bit:

- A `<trix-editor>` looks its toolbar up **as it connects** and throws if it is not in the document
  yet, leaving a dead element. So the toolbar is never unmounted in plain mode, only hidden.
- Once Trix is loaded, `trix-initialize` fires as the element connects — before an effect can
  listen for it. `RichBody` seeds immediately when `node.editor` already exists; without that a
  second panel, or a switch back from plain, opened empty. That seeding is `untrack`ed: tracked,
  every keystroke's `bodyHtml` re-seeded the editor with the caret at 0, and typing came out
  reversed.
- Seeding places the caret, which focuses the editor. On the first panel Trix may load after the
  panel has focused To or Subject, so `RichBody` hands the focus back, but only to a field. A
  reply wants the body, and what held the focus until then was the list row or the Reply button,
  where what is typed next would run as shortcuts.
- Trix injects an unlayered `trix-toolbar { display: block }`. Tailwind utilities are layered and
  lose to it, so the toolbar's `display: flex` is declared unlayered in the component.
- Trix acts on `mousedown`, which Enter and Space on a focused button never send. The toolbar's
  `press` sends one for a click that came from the keyboard (`detail === 0`). The toolbar is one
  tab stop, and the left and right arrows walk its buttons.
- The link dialog's field is an `<input type="url">`, which refused `example.org/page` with
  nothing but a red field. An address typed without a scheme gets one before Trix checks it:
  `mailto:` when it is an email address, `https://` otherwise.
- `trix-change` fires during `loadHTML`; loading is not writing, so it is ignored.
- While the link dialog is open Trix paints the held selection *into the document* (a
  `background-color: highlight` span). Changes carrying it are not reported; closing reports again.
- Files dropped or pasted into the text that are not images are refused (`trix-file-accept`)
  and handed to the attachment strip.
- Bare `<blockquote>` renders as a plain indent in most clients (and `<h1>` at 2em), so
  `outgoingHtml` inlines the quote rule, heading size and code-block look on send (not on save:
  Trix would strip them on reopen anyway).

**Images in the text.** An image pasted, dropped or picked into the text stays there: Trix previews
it at once, `compose.uploadInlineImage` uploads it (Trix's progress bar shows started/done), and the
attachment's `url` becomes `/api/jmap/download?blobId…&inline=1`. Name and size captions are
switched off (`Trix.config.attachments.preview.caption`); a caption the writer types is kept.
Several images in a row become a Trix gallery. On send and save the server
(`#lib/server/inline-images.ts`) flattens each `<figure>` to a plain `<img src="cid:BLOBID">` on
its own line (width capped at 600 for Outlook) and adds the blob as an inline part — the Content-ID
is the blob id, as in webmail 1.0, so the reader resolves it back when a draft reopens. Images that
are not ours (remote URLs, `data:`) are dropped, and Send waits while an upload is in flight.

**Forwarding** carries the original's attachments as chips, pointing at the blobs already in the
account, so nothing is downloaded or uploaded again; drop a chip to leave that file out.

**A reply threads, and marks what it answers.** A reply or a forward records the message it is of
(`answerLink` in `#lib/compose/quote.ts`), and that travels as `answers` on the draft and in the
send and draft-save payloads. A reply goes out with `In-Reply-To` and `References` (the parent's
chain, then the parent, as RFC 5322 §3.6.4 has it; `answerHeaders` in mail-core's
`email-build.ts`), and a forward starts a thread of its own. Once the message has gone, the
original is flagged `$answered` or `$forwarded`; a flag that could not be set is not a failed
send. A reply saved as a draft keeps its headers, so finished later it still threads, and the
message to flag is then found by its Message-ID. The server takes none of it on trust:
`cleanAnswers` in `compose.remote.ts` passes on only well-formed Message-IDs and the last 50
references, and the flag goes only on a message whose own Message-ID matches.

**Focus.** A new message and a forward start in To; a reply starts in the body, above the quote.
The panel focuses a frame late: a menu that opened it (Reply all, Forward) hands focus back to its
trigger as it closes, in a microtask after the panel's effect. Tab stays in the panel (`wrapTab`):
past the last control it comes round to the title bar's buttons, and Shift+Tab goes the other
way, rather than out onto the page underneath, where the next key would be a shortcut.

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
- **The stored rect is a wish, not a position.** It is what the person chose
  in a window that may since have shrunk, so a panel is drawn through
  `fitPanel`: slid back inside the shell as it is now, and shrunk only when
  the shell is smaller than the panel. The stored rect is left alone, so the
  panel returns to it when the window grows. A drag starts from where the
  panel is drawn, which may not be where the draft says.
- **A panel stays under the top bar.** `fitPanel` draws none higher than
  `PANEL_TOP`, whatever its stored rect says, where a panel could be parked
  over the bar and the tabs. An opening panel is never placed over it either,
  which on a short shell the cascade used to do.
- **Toasts sit above every panel** (`compose.zTop + 2`, which climbs each time
  a panel is raised). Undo send is a toast's button, and a tall panel reaches
  the bottom centre where toasts are. At most three show at once (`pushToast`
  in the compose store): every action says something, and six of them stood
  over the list. A notice said again, as by a key held down, replaces itself,
  and the oldest go first, one with a button last of all, which is an Undo
  still good for its few seconds. Quick triage leaves the last three Undos.

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
- **One stream, held by the `(app)` layout**, not one per section. It stays
  open across section switches, so the inbox count (and the app badge) keeps
  moving in Calendar or Settings as it does in Mail. A section hears what
  changed for as long as it is mounted: `$effect(() => shell.onLive(…))`.

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
`cc:` `subject:` `has:attachment` `is:unseen` `is:flagged` `is:important`
`before:` `after:` — so a query means the same thing in 1.0 and here (1.0's
names, `is:starred` and `is:highlighted`, are still read). It was already in
the shared package, along with `searchEmails` on the client; it simply was not
exported from the package index, which is the whole of what "port search" turned
out to be.

While results are showing, the list header swaps its All/Unseen/Flagged control
for the query: Unseen does not scope a search — the query does — so leaving the
filter there would be a control that lies. Empty results are their own state, and offer
the operator list, because "no matches" is exactly when you want to know what
else you could have typed.

Search is scoped to the open folder, which is what the placeholder says. A
*Search in Folder | All folders* switch sits over the results, and "No matches"
offers the wider search as its first button. Across folders each row wears its
own folder's colour, opening a draft opens compose, and Delete always goes to
Trash — a result from Trash would otherwise be destroyed from a view that does
not say "Trash".

**Longer lists.** A folder or a search shows 50 threads; scrolling to the end
(or *Load more*) asks for 50 more, and the rows already on screen stay while it
loads. `listPages` in `mail.remote.ts` pages `Email/query` by position in
chunks of 500 (Stalwart's default `Email/get` cap) and stops at 2,000 messages.

**The open folder is in the URL** — `?folder=<mailbox id>`, nothing for the
inbox — so a reload stays put and 1.0's `/mail/<id>` links land on the folder.
It is written with `replaceState`, which does not update `page.url`: code that
rewrites the query reads `location.href`.

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
  a tab order. Keyboard users get the same actions on the cursor row (`s`, `u`,
  `e`, `#`; see [Keys](#keys)), which the status line spells out.
- **Whose name:** received mail shows the sender; mail I sent shows "To …"
  (To, then Cc), "Bcc …" when it had only Bcc recipients, and an empty draft
  "No recipients". That is why list fetches ask for `bcc` too.
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
  The history sits **above** the latest message's card, oldest first: that
  card stays attached to its own body, and the thread reads top to bottom in
  the order it was written.
- **The address line opens.** Collapsed, it names one recipient and counts the
  rest: "to me, +3", with you as "me" and named first wherever you appear. It
  is a button, and under the row it lists everyone in full, From, To, Cc and
  Bcc, with names and addresses, and **Reply to** when the message names one,
  which is where a reply goes when that is not who wrote it. The line itself
  truncates, so this is the way to the rest.
- The card that opens history is a plain tactile card, and its count is the
  **same chip** the list row wears, because it is the same number about the
  same thread.
- `Attachments` is the list's group divider to the letter — caption, rule,
  count — and each chip is 40px with a 22px kind badge whose colour comes from
  `attachmentBadge`, like compose's.
- **Empty and error states are cards too.** Nothing open is a correspondence
  tile with the `j` `k` keys; a load that failed is a discard-channel card with
  the one action worth having, Retry.

## HTML mail

A message's HTML is somebody else's page, shown inside ours with our cookies
one request away. Three things hold it, each assuming the one before it failed:

1. **The sanitizer** (`#lib/email/html.ts`). DOMPurify, then our own passes over
   what is left. Untrusted markup is only ever parsed into a document with no
   browsing context (`parseInert`), because a node made by the live `document`
   starts fetching its images the moment it is parsed, and WebKit does so even
   for a detached `<div>`. With no DOM, or with DOMPurify not loaded,
   `prepareEmailHtml` returns nothing: an empty message, never the raw one.
2. **The frame.** The body renders in an `<iframe srcdoc>` whose sandbox has no
   `allow-scripts`. It cannot size itself, so the parent measures it.
3. **The frame's own CSP**, a `<meta>` in the `srcdoc` (`frameCsp` in
   `#lib/email/frame.ts`): `default-src 'none'`, inline styles, and images from
   `data:`, `blob:` and the one path that serves inline images. It can only
   narrow the app's policy, which the frame inherits.

**Remote images are off until asked for.** A tracking pixel is a remote image,
so another server's content waits for the reader's yes: *Show images* on the
notice for this message, or *Always* (`showRemoteImages`, also in Settings →
Reading & writing). `blockFetchesInDocument` takes out every attribute that
fetches by itself (`src`, `srcset`, `poster`, `background`) and every `url()` in
an inline style. It reads the style as the browser wrote it back
(`element.style.cssText`), where escapes such as `\75rl(` are already resolved,
and a style that may still fetch in a form it did not read loses the whole
attribute. A blocked image leaves an empty box of the size the mail gave it,
so the layout holds. The yes is kept by message id and not reset in an effect,
so the next message never renders once with the last one's yes.

**The app's own addresses are never the mail's to use**, asked or not. The
frame resolves a mail's URLs against the app and sends the reader's cookies
with them: `<img src="/oidc/logout">` was a sign-out on open. So:

- `classifyUrl` in `#lib/email/urls.ts` decides where a URL goes by resolving
  it the way the frame does, not by testing a prefix. `HTTPS://`, a leading
  space, `//host`, `\\host`, `?x` and the empty string are all requests
  somewhere. What the parser cannot read is treated as the app's.
- The one app address a body may hold is an inline image,
  `/api/jmap/download` with a `blobId`, an `image/*` type and `inline=1`, as
  the mapper writes it in place of `cid:`. `inlineImageSrc` rebuilds it from
  those parts, so nothing else rides along.
- The frame's CSP never says `'self'`, for the same reason.
- A link into this app keeps its address only when the mail names it in full
  and it is a page (our own Meet invitations are). A relative link was never
  written for this origin, and an endpoint is one click from acting. The
  endpoint test is a list of today's `+server.ts` directories (`/api`, `/oidc`,
  `/auth`): a new one has to be added to `APP_ENDPOINT`. The real guard is
  that an endpoint does not act on a bare GET. Two have to answer one, because
  other apps send the browser there: `/oidc/logout` and `/auth/claim`. They act
  only when the request is a navigation (`isNavigation` in
  `@zaur/server-auth/oidc` reads `Sec-Fetch-Dest`), so an `<img>`, a `fetch` or
  a frame pointed at them gets a 400. A browser too old to send the header is
  let through.
- Known ceiling: once images are allowed the CSP says `https:`, which cannot
  leave out the app's own host, so at that point the sanitizer alone keeps a
  mail off it.

Every link opens in a new tab, since the sandbox does not let the frame
navigate the app it sits in and is not widened for that. A `mailto:` link
becomes this app's compose link, `/?to=`, and opens a draft here instead of in
the system's mail client. `/?to=` takes a comma-separated list, as `mailto:`
does, and each address becomes a chip.

A saved draft's HTML goes through the same sanitizer on its way into the
compose editor (`prepareEditorHtml`, then `editorAttribute`). The editor is the
app's own document, with no frame and no CSP around it, and a draft another
client saved, or one that arrived as mail, is as foreign as any message. The
rule is the reader's without the "show images": a picture stays only when it
is one of our inline images (or `data:` / `blob:`), a link keeps its `href` by
the rule above, so a relative address or one of the app's endpoints loses it,
and a style that may fetch goes. Trix draws an image from its
`data-trix-attachment` JSON and not from the `<img>` inside, so that JSON is
read the same way. What was written here passes unchanged.

One trap in `EmailHtmlFrame.svelte`: whether the shell is dark is read before
the first render and not in an effect. A `srcdoc` that changes right after
mount is a second navigation of the frame, WebKit files it in history, and
Back then had to be pressed twice to leave a plain-text message in dark mode.

## Bulk actions

Selecting rows (checkbox, `x`, or the Select menu) **swaps the list header's
contents** — the All/Unseen filter and the conversation count step out, and the
count of what is selected, the actions, and a ✕ step in. Selection is by
**thread**; `selectedEmailIds` expands it back into the message ids the folder
view holds. Everything funnels through one `bulk` command in `mail.remote.ts` —
they are all an `Email/set` over a batch of ids. Delete means move-to-Trash
everywhere except Trash, where it destroys (and the bin turns red at rest there,
since the icon carries no label).

The reader's toolbar goes through the same command, but takes the open
conversation's message ids from the reader (the thread query says which folders
each message is in), not from the list: a conversation opened by link, or one
past the loaded page, has no row to look up, and its actions used to do nothing.
A conversation opened by link may also have been filed elsewhere since. Then
nothing of it is in this folder to act on, and the toolbar says so ("This
conversation is no longer in Inbox") instead of being a row of dead buttons.

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

- **Every move can be undone** — Archive, Move to, Spam, Delete-to-Trash: the
  toast's Undo files each message back into the folder it came from (across
  folders, each row's own). Delete forever and Empty cannot be. Neither can a move
  out of Scheduled, and the toast says "not sent":
- **A message that leaves Scheduled stops being sent.** `bulk` cancels any
  pending submission (`cancelPendingSends`) before a move or a delete; left alone,
  Stalwart sends it at its time from Trash. The reader shows a scheduled
  message with **Cancel send**, which takes it back to Drafts and opens it.
- **Drafts and Scheduled take no moves** (`acceptsMoves` in
  `#lib/mail/folders.ts`). Whatever is in Drafts opens as your own draft, and
  its first autosave replaces the original; nothing filed in Scheduled is
  sent. Every way to move mail asks that one function, the Move to menus of the
  list, the reader and the phone's bar and a drop on the sidebar, so they
  cannot disagree, and `runBulk` refuses whatever else asks ("Mail can't be
  moved to Drafts").
- **Important** is in the reader's menu (`$important`, and the Important folder
  too where the server has one, as in 1.0).
- **Trash and Spam can be emptied** from a bar at the top of their list
  (`emptyFolder`, which refuses any other folder).
- A **discarded draft** can be had back from its toast: Undo writes it again as a
  new draft, since the saved copy is already gone.

**Delete forever names its folder.** A destroy cannot be undone, and the list
it is asked from can be behind: a message moved out of Trash in another tab, or
by an Undo, may still have a row there. So `bulk` refuses a delete that does
not say which folder it was asked in (`sourceMailboxId`, else a 400), reads the
messages again, and destroys only the ones still filed there (`stillIn`). It
answers with how many went. When that is none the toast says "Not deleted — no
longer in Trash" and nothing is lost.

Smaller rules the same code keeps:

- Toasts count what the person acted on. A move says conversations ("3
  conversations archived"), because rows are threads; a destroy says messages,
  because that is what is gone.
- After an action takes the cursor's row out of the folder, the cursor steps to
  the row that took its place, so `e` `e` `e` works down a list. A row opened
  with the mouse becomes the cursor row too (not on a phone, which has no
  cursor).
- A row can be dragged onto one of your own folders in the sidebar (one that
  takes moves), and dragging a selected row takes the whole selection. It is the same `move`
  with the same Undo. Rows are not draggable below 1024px, where the sidebar
  is a drawer, and the sidebar takes no drop while a shared mailbox is open.
- Picking a folder clears the search and puts the filter back to its default.
  A folder you picked is a folder you want to see, not one narrowed to a label
  it may not hold.

## Keys

Mail's keys are one list, `KEYS` in `StatusLine.svelte`. The status line shows
the first eight and `?` opens the whole list in a sheet, so a key added to the
page's `keydown` handler goes in that list too or nobody finds it:

| Key | Does |
| --- | --- |
| `j` `k` | next, previous conversation; `j` past the last row loads more |
| `↵`, `o` | open it |
| `x` | select it |
| `e`, `#` | archive; delete (forever, in Trash) |
| `s`, `i`, `u` | flag, important, unread, each a toggle |
| `r`, `a`, `f` | reply, reply all, forward, from the open thread's latest message, as its toolbar does; pressed before the conversation has arrived, the reply opens when it does, and what is typed meanwhile is not run as shortcuts |
| `c`, `/`, `[` | new message; search; show or hide the mailboxes |
| `esc` | close the drawer, else minimise the draft in front, else clear the selection, else the search (the open conversation stays) |
| `⌘↵` / `Ctrl+↵` | send the draft in front |
| `?` | all keys; `?` or `esc` again closes the sheet |

Delete is `#` and not the Delete key on purpose: in Trash it destroys. With no
cursor row (a phone, or a conversation opened by link), `e` `#` `s` `i` `u` act on
the conversation being read.

Who a key press belongs to is the part that kept going wrong, so it is decided
in one place, the mail page's `handleKeydown`, in this order:

- A press something else already handled (`defaultPrevented`) is left alone.
- An open menu, popover, Trix link dialog or `<dialog>` keeps Escape and the
  letters typed into it. The open drawer is modal and keeps them as well.
- A compose panel owns the keyboard wherever in it the focus is. It still owns
  it when the focus has fallen out of the panel to `<body>`, which happens when
  the focused control removes itself (an attachment chip's ✕): `compose.keysIn`
  remembers the panel the keyboard was last in until something outside the
  panels is clicked or focused. Before that, the next letters typed for the
  message archived mail.
- A field is typing, and a chord with ⌘, Ctrl or Alt is the browser's.
- Enter on a focused link or button presses it. `o` is the key that always
  opens the cursor row.

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
is never a window where the rules exist but nothing is filtering. A script the
server refuses reaches the person as "The server did not accept these rules.
Nothing was saved." (`saveRules` turns the failure into a 502 with that text);
left alone it arrived as "Internal Error". The editor asks before rules that
were not saved are left
([Unsaved work asks first](#unsaved-work-asks-first)).

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
Calendar · Files · Settings**. It is one component (`SectionTabs`), and the
current section is read from the URL, so a page cannot claim to be one it is
not. Below 1100px five words cost the section's own controls a third of the
header, so each tab becomes its glyph and keeps the word for screen readers and
as its tooltip. Below 768px the tabs leave the header and the phone's tab row
(`PhoneTabBar`) is the map; it imports the same list and the same glyphs, so
the two cannot drift.

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
just that registration — a title and a `controls` snippet. The
layout also exposes the app column (`shell.frame`), which Mail's floating
compose panels are placed against. The stretch a section fills clips sideways
(`overflow-x-clip`): controls that do not fit are cut at its edge and no longer
slide under the tabs.

The layout owns what has to outlive a section switch as well: the one live
event stream (see [Live updates](#live-updates)), compose's way to the server
and its toasts (see [Architecture](#architecture)), the app badge, and the
hand-off from a tapped notification.

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
It is three settings pages now: Password & sign-in, App passwords (and API keys)
and Devices, each with the shared *Confirm it's you* card.

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
surface means a channel, never a person), and an editor. The letters are base
letters (`groupContacts` and `contactLetter` in mail-core's `contact-map.ts`):
a Latin letter outside A–Z files under the one it sorts with, Ł under L and Ż
under Z, so a Polish address book is not one long `#`. Digits, punctuation and
other scripts share a single `#` group, which comes last, and there is one
group per letter whatever order the cards arrive in. "Write" opens Mail with
`/?to=address`, which the mail page consumes once and strips from the URL, so a
reload does not open a second draft. Push subscribes to `ContactCard` and
`AddressBook`, so a card saved on the phone shows up without a reload.

On a phone the detail covers the list, so it is a Back layer (see
[Back closes the layer on top](#back-closes-the-layer-on-top)). The open
contact is also kept in a `snapshot`: Write leaves for Mail, and Back from
there returns to the contact it was written from. An editor with something
typed in it asks before it is dropped
([Unsaved work asks first](#unsaved-work-asks-first)).

**vCard in and out** (`#lib/components/contacts/vcard.ts`) is just enough vCard to move an
address book: the fields the editor has (name, nickname, organisation, title,
emails, phones, a note) and nothing else. Photos, addresses and birthdays are
not carried. It writes 3.0, which Google, iCloud and Thunderbird all read, and
reads 2.1, 3.0 and 4.0.

- **Export** is built in the browser from the directory that is already
  loaded, as one `contacts.vcf`. There is no server endpoint for it. Lines are
  folded at 75 octets (RFC 6350 §3.2), counted in bytes and never through the
  middle of a character.
- **Import** reads the file in the browser and saves one card at a time
  through the same `saveContact` the editor uses. It reads the file's bytes and
  not its text (`readVCards`): as UTF-8 when that is what they are, otherwise
  line by line, each in the `CHARSET=` it names and Windows-1252 where it names
  none, which is what an old phone's or Outlook's export is. 2.1's
  quoted-printable, which Android writes for any name that is not ASCII, is
  decoded in the same charset. A card whose address is
  already in the book is skipped, as is one with no address whose name is, so
  importing the same file twice adds nothing. The notice afterwards counts what
  was left out: cards already here or empty, cards that could not be saved, a
  last card the file ends in the middle of, and addresses that are not e-mail
  addresses. It is one request per card, in
  turn, which is fine for a personal address book and slow for thousands; a
  batch command is the upgrade.

## Calendar

`/calendar` is a grid, a calendar list with visibility toggles, and a rail on
the right that holds whatever is open: the day's list, an event, the editor, a
calendar's settings. The grid is `@nomideusz/svelte-calendar`; the header is
ours and drives it through `view` and `currentDate`, so the geometry is the
package's and the controls are the shell's. The views are Day, Week, Roll (a
scrolling week) and Month. It opens on Week, or on Day below 640px, where seven
columns do not fit; a phone offers Day and Month only. That choice is made once,
on the way in, and the switcher is the person's after that.

It sits on the JMAP Calendars client mail-core already carried for 1.0, with two
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

- **A click opens the event, not the editor** (`EventView`), as 1.0's panel
  did. Edit and Delete are there only when one of its calendars takes writes;
  a holiday feed or a calendar shared read-only shows the details and says
  so. Dragging such an event snaps back with a notice — the grid has no
  per-event lock.
- **Each calendar's ⋯ opens its settings** (`CalendarSettings`) in the same
  rail: name and colour, make it the default (`onSuccessSetIsDefault`), share
  it, delete it. Deleting asks twice when the server says it still has events
  (`calendarHasEvent`, then `onDestroyRemoveEvents`); the default calendar
  cannot be deleted. A name or colour not saved yet asks before it is dropped
  ([Unsaved work asks first](#unsaved-work-asks-first)).
- **Sharing is by address**, but JMAP shares with a principal, so the address
  goes through `Principal/query` first — 1.0's rule, in `pickPrincipal`: an
  exact address wins, otherwise exactly one other person must match, never
  you. Access is `shareWith/{principal}` patches (Can view / Can edit; `null`
  removes). Offered only when the session has the principals capability and
  the calendar grants `mayShare`.
- **Phones get the list from the header's calendar button**, in the rail
  where the sidebar would be — no extra bar. The same button stands in for the
  calendar list below 1280px while the rail is open, where the two together
  would leave the grid too little.
- **A day picked in Month** fills the day's list in the rail beside the grid.
  Below 1024px there is no room for that list (it would leave seven columns
  half the screen), so there the month keeps the width and picking a day goes
  to the Day view. The page handles the click itself (`pickDay`): left alone,
  the grid swaps in its own day planner while the header still says Month.
- **On a phone the rail's panel covers the screen**, so it is a Back layer (see
  [Back closes the layer on top](#back-closes-the-layer-on-top)). Escape closes
  what the rail holds, and an event form with something typed in it asks first
  ([Unsaved work asks first](#unsaved-work-asks-first)).
- **A failed load must not look like an empty calendar.** The grid draws one as
  an empty week, so the page keeps what each range last answered (`kept`). A
  refresh that fails shows that again under a line that says so, with Retry;
  with nothing kept, the failure stands where the events would.
- **Guests are shown, not edited.** Opening an event asks for its participants
  and what each answered (`eventParticipants`; for one occurrence, the series'
  list), so an invitation that arrived by mail says who else is coming.
  Inviting people from here is not built.
- In the editor, moving the start carries the end along, so the event keeps
  its length.
- A new event with no time picked starts at 09:00. When the day is today and
  nine has passed, it starts at the next full hour instead, not at a nine
  o'clock already gone.

## Meet (video calls)

`/meet/{room}` is Zaur Meet on LiveKit Cloud, rebuilt from webmail 1.0's
`MeetRoom` to the design in Claude Design ("Zaur Meet"). A call is born in an
event: the editor's **Video call** switch writes a join link into the
location (`createMeetingUrl`, shared with 1.0 from
`@zaur/mail-core/utils/meet`), and the day's agenda shows **Join** on it.
Links from either app join the same room from the other.

- **Outside the `(app)` gate.** A guest with the link has no account: the
  lobby asks for a name, and `joinCall` (`meet.remote.ts`) mints a token as
  `guest-{uuid}`. Signed in, you join as your address. Both are rate limited
  per client address, since a token needs no session.
- **A lobby first.** You see and hear yourself (mirrored preview, mic meter,
  device pickers) and what you switch off stays off when you join. It says
  who is already in: the server's answer at page load, then `whoIsHere`
  every ten seconds while the tab is shown (its own rate limit).
- **Grid or Speaker** in the header. Until you pick, it is Speaker while
  someone presents or it is the two of you, Grid otherwise. Speaker shows
  the last person who spoke, kept through a silence; in Grid a shared screen
  is one more tile.
- **Settings** (the sliders) lists camera, microphone and speakers (output
  where the browser can choose it) and **Noise suppression**: the browser's
  own, with voice isolation, on by default. Changing it captures the mic
  again; muted stays muted.
- **On a phone** the bar is Mic, Camera, Hand, More, Leave. More holds Share,
  the front/back camera (`facingMode`, only with a second camera) and the
  speaker route. The back camera is not mirrored.
- **The call is dark whatever the theme**; the lobby follows yours. The page
  sets `data-theme="dark"` on `<html>` for the call and puts it back after.
- **Four channels carry meaning:** speaking is green (a ring and bars, never
  colour alone), off and broken are red, a raised hand and reconnecting are
  amber, presenting and a pressed toggle are blue. People keep their identity
  tones on avatar tiles.
- **Kept from 1.0:** Share is feature-detected (iOS has no `getDisplayMedia`),
  Safari gets uncapped screen capture, the camera asks for the front one,
  `getDisplayMedia` stays inside the click, a cancelled picker is not an
  error, and the toggles are read back from the room rather than trusted.
- **Raised hands** are a participant attribute (`hand` = the time it went
  up), so the token grants `canUpdateOwnMetadata` and nothing more — no
  admin.
- **Email an invite** (signed in only) opens `/?invite={room}` in a new tab,
  which starts a Mail draft with the link.

Keys: `m` mic, `v` camera, `h` hand, `p` people. Env: `LIVEKIT_URL`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (all three, or Meet is off — see
`.env.example`).

## Files

`/files` is JMAP `FileNode`, the same tree 1.0 showed, one folder a page
(`?folder=`, plus `&account=` when it is someone else's).

- **Shared with you** is every other account in the session with the FileNode
  capability: what people share lives in *their* account, so each one is
  queried and the nodes whose parent you cannot see are its roots
  (`orphanFileRoots`), listed under "Shared with you" at the top level with the
  owner's name. Every remote function takes the account back (`null` for your
  own). Buttons follow `myRights`: New folder and Upload only where you may add,
  Edit where you may rename or delete, Share with `mayShare`. A file uploaded
  into someone else's folder goes up to your account and is created in theirs,
  as in 1.0.
- **Sharing is by address**, turned into a principal by 1.0's rule (the one
  Calendar's `pickPrincipal` has): an exact address wins, otherwise exactly one
  other person must match. Can view / Can edit are mail-core's
  `rightsForFileShareRole`, and the whole `shareWith` map is written back —
  1.0 put `null`s inside that replacement, which JMAP does not define. Someone
  newly added gets a plain-text email with a link to Files, as 1.0's
  `share-notify` sent.
- **Search** is `FileNode/query` `{ text }` over every account, 50 hits each,
  debounced as you type; a hit of yours links to the folder it is in.
- **Uploads go up to the server's `maxSizeUpload`**, read from the session (50 MB
  on Stalwart). `/api/upload` spools the body to a temporary file and hands
  Stalwart a file-backed Blob, so a big file never sits in memory — compose's
  attachments ride the same endpoint. The image's `BODY_SIZE_LIMIT` (50M) is the
  other half of the cap: raise both together. Past that means `Blob/upload`
  chunking (Stalwart takes 7.5 MB a piece, 10 MB a request) or WebDAV; neither
  is built.
- **A file's preview fills a phone's screen**, so there it is a Back layer (see
  [Back closes the layer on top](#back-closes-the-layer-on-top)).

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

Those two tags are only the starting values. The colour that is right is
whatever the page has under its top edge: the header's surface in the app, the
canvas on sign-in and on the error card, each in the theme that is showing, and
a chosen Dark is not what `prefers-color-scheme` says. A table per screen and
theme is how a chosen Dark came to sit under a white bar. So `app.html` sets
both tags from the stored theme before first paint, and the root layout's
`paintSystemBar` reads the first solid background under the top edge off the
page and writes it to both, after every navigation, on a theme change and when
the OS changes its scheme.

**The app runs under the notch.** `viewport-fit=cover` lets the page reach the
screen's edges, and `.z-safe` (unlayered, in `base.css`) pads the shell by the
safe-area insets and paints those strips in the surface colour. With no insets
(a desk, Android, any ordinary tab) every length in it is zero.

The service worker (`src/service-worker/`, registered by Kit as a module) shows
a push, opens its link, and answers a page load that has no network. It has
**no app-shell cache**: offline reading is not planned, and a cached shell is
how a deploy ends up serving yesterday's JavaScript. Its fetch handler touches
navigations only, always asks the network first, and has exactly one thing to
fall back on, `/offline.html`, so an installed app started without a connection
shows its own screen and not the browser's error.

- `static/offline.html` has to stand alone: no stylesheet, script, font or
  image of the app's, because none of them is cached. It repeats the sign-in
  card's look and the tokens it needs by hand, so a change to either has to be
  copied there, and it reloads itself when the connection returns.
- The page is cached when the worker installs. **Bump `OFFLINE_CACHE` in the
  worker when `offline.html` changes**: a changed worker reinstalls, and
  installing fetches the page afresh. Without the bump, installed copies keep
  the old page.
- The sections' code, and every settings page's, is fetched once the page is
  idle (`preloadCode` by route id in the `(app)` layout), so one first opened
  offline opens and says what it could not load. A link to the address already
  in the bar (the logo, a tab) is a refresh to Kit, which offline cannot
  succeed: `beforeNavigate` there cancels it. A section opened offline within
  two seconds of the first load still
  fails differently: its code is a chunk fetched when first needed, so the
  root error page gets it. It says "You're offline" in that case and reloads
  when the connection is back.
- The same failure with a connection means the server is away (`handleError`
  in `hooks.client.ts` marks it `unreachable`, by `codeNotLoaded` in
  `#lib/errors.ts`). The card says "Can't reach Zaur Mail" and tries the page
  again once, a moment later. WebKit can go on failing the same file for a
  while with the connection back, so this card also offers *Back to Mail*. A
  second failure within half a minute waits for the person, so there is no
  loop of reloads against a server that is down.

The worker is typechecked against `$app/tsconfig/service-worker` in its own
folder; the root tsconfig excludes it and `pnpm check` runs both.

**The root error page** (`src/routes/+error.svelte`) is drawn on the sign-in
card, since an error takes the whole page and the shell with it. An installed
app has no address bar and no reload button, so the ways out are on the card:
*Back to Mail* and *Try again* (a 404 has no *Try again*, a `/meet/` page says
*Open Zaur Mail*, and the offline card has only *Try again*). Both are full page
loads, because if the app's own scripts are what failed, a client-side
navigation fails the same way.

*Try again* loads the address now in the bar, and so does every step through
history while the card is up. The card took the place of the whole app, and a
step to another entry of the page that was there before it would change the
address and leave the card. Each of those reloads waits for the lock the outbox
sends under (`withOutboxLock`): the outbox sends on `online` too, and a reload
between its send and its crossing-off would send the message again on the next
load.

**Pages are never kept by the browser.** `hooks.server.ts` sends every HTML
response `cache-control: no-store`, and the `(app)` layout reloads a page that
the back/forward cache brought back whole (`pageshow` with `persisted`). A page
is one person's mail: after a sign-out or an account switch, Back must ask the
server who is signed in, not redraw the last copy.

**Install.** Chromium fires `beforeinstallprompt` once per page load, early,
and only while the app is not installed. `#lib/install.svelte.ts` attaches its
listener when the module first loads, which is why the root layout imports it,
and keeps the event for Settings → Appearance, where the *Install Zaur Mail*
row is. The row shows only when there is something to offer: the kept event,
or an iPhone or iPad in a browser tab, which has no install dialog and gets the
sentence about Share → Add to Home Screen. The manifest's `shortcuts` (New
message, Calendar, Contacts) are ordinary URLs the app already answers;
New message is `/?to=`, the same link Contacts' Write uses.

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

**Muting an account.** With two or more accounts signed in, Settings lists
them under *New mail*: unticking one mutes it **on this device** (the row's
`muted_accounts`, `pushMutes` / `setPushMutes`); the watcher already skipped
muted accounts. The same browser in another session keeps its own list.

A notification opens `/?thread=<id>` (plus `&account=<key>` when the session
holds more than one), which the mail page consumes once per link: it switches
account if needed (a reload), cleans the URL with a replacing navigation — not
`replaceState`, since on a phone the reader pushes a shallow entry relative to
the page URL — and opens the thread, in `?folder=`'s folder or the inbox. "Once per link" and not once
per page: a notification tapped while Mail is open arrives as a navigation, not
a load, so the two flags are put back after each link.

**A tap with the app already open does not load it again.** The worker
focuses an open window (never a `/meet/` one: navigating that hangs up on
everyone in the call) and asks it, over a `MessageChannel`, to show the link
itself (`zaur:open`). The `(app)` layout answers at once and navigates inside
the app. The worker waits half a second for that answer, then navigates the
window itself, and opens a new one if it cannot. Both ends refuse a URL that
is not this origin's.

On Mail already, the link takes the place of what is open instead of stacking
on it (`show` in the `(app)` layout). A phone reading a conversation, or with a
sheet over it, first steps off those entries, and the list's entry becomes the
link's. Back from the conversation the notification opened is then the list,
once, and not the list, the conversation before, and the list again.

Because a link can now arrive while another folder is showing, the list follows
the address: an effect on `page.url` (which every real navigation and every
step through history sets, and the shallow patches that mirror a pick do not)
shows the folder the address names. Without it a notification tapped while
Drafts was open opened its thread as a draft.

**One notification per thread.** The tag is
`zaur-new-mail-<account>-<thread>`, so a second sender does not wipe the first
from the tray; a batch shares the account's. A notification that replaces one
with the same tag arrives silently unless told otherwise, hence `renotify`.

**The badge has two writers.** A push writes the unread count while the app is
closed. While it is open the `(app)` layout follows the inbox's unread from the
same `mailboxes` query Mail shows its counts from, so reading mail takes the
number down instead of leaving the last pushed one. It is only asked for where
the Badging API exists; the switch is `appBadge` in Settings → Notifications,
and turning it off clears a badge already on the icon.

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
  there are two. Signing out and switching both await `compose.flush()` first,
  so a draft still waiting out its autosave pause is saved before the session
  goes (a save already under way is not waited for).
- **The outbox follows its author.** Every send carries the account that wrote
  it; the drain skips another account's queued messages (a wait, not one of the
  five failed attempts that delete a message), and `send` refuses a mismatch
  with a 409 — which also covers a stale tab after a switch.

## Shared mailboxes

A mailbox shared with you shows under its owner's address in the sidebar: just
its Inbox until you open it, then every folder you were given. This is
Stalwart's own ACL sharing (RFC 9670 `shareWith` on each Mailbox), not a second
sign-in, so it also works across domains — anyone in the same Stalwart directory.

- **Sharing** is the owner's to do, in *Settings → Sharing*: an address, looked up
  with `Principal/query` (`pickPrincipal`, as for calendars and files), and every
  folder gets `shareWith/<principal>` in one `Mailbox/set`. The rights are read,
  file, flag and delete — no renaming or removing the owner's folders. Stalwart
  shares per folder, so a folder made later is shared the next time you press
  Share. *Stop sharing* sends `null` for the same pointer on every folder.
- **Seeing it**: the share puts the owner's account into the grantee's JMAP
  session (`isPersonal: false`). `sharedMailboxes` lists every session account
  with the mail capability besides your own, with its folders.
  `JMAPClient.forAccount(id)` is the same connection acting in that account —
  every mail method then works there — and `connectMail(account)` refuses an id
  the session does not list. A password sign-in keeps its session cached in the
  server for up to 15 minutes, so a new share can take that long to appear;
  OAuth sign-ins fetch the session on every request.
- **The page** keeps it as `?shared=<account id>` next to `?folder=` and
  `?thread=`. Every mail query and command takes that `account`: list, search,
  labels, the thread, bulk actions and their Undo, Empty Trash. The folder name
  reads "Inbox · team@example.com" wherever it shows. A share that has gone
  (or a stale link) drops back to your own inbox.
- **Sending stays yours.** Stalwart only lets an account's owner submit from
  it (`Identity/get` and `EmailSubmission/set` answer `forbidden`), so the
  reader says replies go from your own address, and the Scheduled bits
  (cancelling a pending send) are skipped there. A forward's attachments are
  copied into your account first (`Blob/copy`), since a message can only
  attach its own account's blobs. Someone else's draft opens in the reader, not
  in your compose.
- **Downloads** carry `&account=`: attachments through `attachmentUrl`, inline
  images by rewriting the thread's `/api/jmap/download?` URLs on the server.
- Not done: new-mail notifications for a shared mailbox (the push watcher
  watches your own account), and AI categories there (someone else's mail is
  not yours to label).

## Smoke-testing without a mailbox

The `(app)` routes sit behind the session gate, and there is no test mailbox.
`tests/smoke/` is the way to see them anyway:

```sh
pnpm --filter @zaur/mail2 smoke:jmap    # a fake JMAP server on :9911
pnpm --filter @zaur/mail2 smoke:seed    # a signed-in session in .data/store.sqlite
pnpm dev:mail2                          # set the printed cookie, open the app
```

`fake-jmap.mjs` speaks just enough of Stalwart's dialect — session, mailboxes
(with `Mailbox/set` and a nested pair), two identities, `VacationResponse`, sending
(it logs the From and identity of each submission), blob upload, a small
`FileNode` tree (`query`/`get` with `fetchParents`/`set`, refusing duplicate names),
`AddressBook`/`ContactCard`, `Calendar`/`CalendarEvent` (with a fake weekly
expansion, sharing, default and `calendarHasEvent`), four `Principal`s to share
with, a second account (Anna's) with one read-only and one writable folder shared, and the `x:` self-service objects — to exercise every remote
function in Security, Contacts and Calendar end to end, including the
`#ids` back-references the contact and credential listings chain on. It logs
the payloads it receives, which is how the shapes were checked. The seeded
password is `not-a-real-password`. Point `SMOKE_JMAP_URL` at a dead port to see
every error state instead. `FAKE_JMAP_PORT` runs a second copy beside the
shared one.

`POST http://127.0.0.1:9911/smoke/deliver` (optional `{"subject","from","fromName"}`)
drops a new unseen message into the inbox, moves the Email state on and sends a
`StateChange` down every open event stream — mail arriving, for the push watcher
and the live list.

Remote **commands and forms** need `pnpm dev:mail2` locally, not `node build`:
adapter-node 6 no longer reads `ORIGIN` and assumes `https`, so over plain
`http://127.0.0.1` every POST is refused as cross-site (403). Queries still work.

It also answers register's `/api/forgot-password/*` (point `REGISTER_API_URL`
at it; `smoke-token` is the one good token). `tests/smoke/oidc-rp.mjs` plays
Bartube and register against the dev server: authorize, token, handoff, claim,
logout. Its header has the env to start the dev server with.

It is a fake: it proves the plumbing, not Stalwart's acceptance of it. The
first run against the real server is still a test — see the table below.

## Settings that follow the account

Most preferences travel with the account. **Three deliberately do not**, and
this is the part worth stating plainly, because syncing them would have been a
regression dressed as a feature:

| Preference | Where it lives | Why |
| --- | --- | --- |
| `pageSize`, `markReadOnOpen`, `showPreview`, `showAvatars`, `unseenByDefault`, `showRemoteImages`, `composePlain`, `undoSendSeconds`, `appBadge`, and the four `ai*` categorisation settings | account | Behaviour and workflow — the same answer is right on every device |
| `listWidth` | device | A pixel width for one screen. Push 760px from a wide monitor and it eats the reader on a laptop |
| `sidebarOpen` | device | A column on a desktop, an overlay drawer on a phone — not the same question |
| `theme` | device | It defers to the OS setting, and a desk and a phone differ (see [Dark mode](#dark-mode)) |

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

Merging is per key (`mergeAccountPrefs`): when the account's copy is adopted,
each key it has an answer for replaces what this browser holds, and a key it
has never been told keeps the device's value. A preference changed here is
pushed at once, which is how it becomes the account's answer. The
first device to sign in seeds the account, so the second has something to adopt
rather than starting from defaults again. Nothing is pushed until the account's
copy has been heard, or a fresh tab would overwrite the account with its own
defaults.

A change that does not reach the account is put back and said (`setPref`, then
`prefNotSaved`): "You're offline — the setting was not saved". Kept on the
device alone, it would be undone without a word the next time the account's
copy was adopted. A setting changed again in the meantime is left as it is,
since that change has its own push.

## Checks

```sh
pnpm --filter @zaur/mail2 check     # svelte-check
pnpm --filter @zaur/mail2 test      # node --test
pnpm --filter @zaur/mail2 build

pnpm --filter @zaur/mail-core check && pnpm --filter @zaur/mail-core test
pnpm --filter @zaur/server-auth check && pnpm --filter @zaur/server-auth test
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
| **Calendar** | `Calendar/get`, `CalendarEvent/query`+`get` with `expandRecurrences`, `set` against the fake; calendar rename/colour/default/delete and `shareWith` patches, `Principal/query`+`get` against the fake; `pickPrincipal` tested | real server-side expansion (synthetic id format, `recurrenceId`), updating one occurrence, `sendSchedulingMessages`; Stalwart's `Principal/query` (it may refuse directory lookups — surfaced as a message), `onSuccessSetIsDefault`, `calendarHasEvent`, whether a sharee may rename | An update on a synthetic id being refused rather than recorded as an override; the editor says "this occurrence" — if Stalwart says no, the message surfaces |
| **Live updates** | endpoint returns 401 unauthenticated; `changedTypes` unit-tested | the SSE pump, reconnect, OAuth refresh on a stream that outlives its token | The stream opens and then dies quietly at the first token refresh. The 90s stale timer and the polling fallback are what should keep the list correct anyway — check that polling actually takes over rather than assuming the stream is fine |
| **Rules (Sieve)** | script generation round-trips, 14 tests | `SieveScript/get`/`set`/`validate`, blob upload of a script, activation | Stalwart rejecting the generated Sieve. This is the good failure: `validate` runs *before* the script is stored, so the error surfaces as a message rather than a filter that silently stops working. Check `require` handling and `addflag` first |
| **Attachment downloads** | endpoint returns 401 unauthenticated; URL encoding unit-tested | `downloadBlob` against a real blob, streaming a large file | Content type or disposition being wrong for one file kind, or a large file buffering where it should stream |
| **Files** | shared-with-you roots and rights-gated buttons, search over two accounts, share / change / remove with the email, a 30 MB upload into a shared folder and back down, all against the fake | Stalwart's `FileNode/query` `text` filter, orphan roots under real ACLs, `shareWith` written whole, a file over 25 MB through the image's `BODY_SIZE_LIMIT` | Uploading into someone else's folder: the blob goes to *your* account (as 1.0's did) and the node is created in theirs. If Stalwart wants the blob in the node's account the create fails with `blobNotFound` — `uploadBlob` would need an account argument |
| **Leaving Scheduled** | cancel on move/delete, Cancel send, delete-from-Scheduled against the fake (which now tracks `holdfor` sends) | `EmailSubmission/query` filtered on several `emailIds` *and* `undoStatus` at once; cancelling a send Stalwart has already started | Stalwart ignoring `undoStatus` in the filter and returning final submissions too — then the cancel's `set` fails with `cannotUnsend` and the move is refused with that message rather than going through |
| **Shared mailboxes** | list, reader, attachment download and preview, archive + Undo, delete to their Trash, forward with `Blob/copy`, share / stop sharing, all against the fake's second (team) account, which refuses submission as Stalwart does | Stalwart accepting the `shareWith/<id>` patch with these rights keys; `Blob/copy` from a shared account; the 15-minute session cache on password sign-ins | Stalwart wanting the whole `shareWith` object rather than a pointer patch, or refusing `mayShare`/`maySubmit: false` in it — the error surfaces in Settings. Reading, moving and deleting in a shared mailbox were tried on the live server in June 2026 and worked |
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
signed in.

## What is still missing

Measured against webmail 1.0 and against what Stalwart actually implements:
push to the Android shell (1.0's FCM path for the Capacitor app).

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
  that looks after itself. The compose store tries it again every 20 s for as
  long as anything waits in it, and at once when the network comes back or the
  tab is shown again. `navigator.onLine` is not trusted to say when: a server
  out of reach never flips it. A network failure stops the drain and never
  deletes a message; any other failure deletes it, with a notice, once the
  message has failed five times in all. A proxy answering for a server that is
  away is a network failure too (`classifySendFailure`): a send that meets a
  502, 503 or 504 is queued like an offline send, and not handed back as
  refused. While something waits, the shell header says "N waiting to send" in
  every section (a chip from 768px, a strip on a phone), since the outbox has
  no folder.
- **Compose's way to the server belongs to the `(app)` layout**, not to the
  Mail page: `compose.setTransport` and the toasts are mounted there, so a
  queued message goes out, and says so, whichever section is open. The lists
  are still Mail's, so Mail registers `shell.mailChanged` while it is on show
  and the transport calls it after a send or a draft save. The panels and the
  dock are still rendered by the Mail page only, so Undo on a "Sending…" toast
  pressed in another section (or a send the server refused) says "the draft is
  back in Mail" and offers Open, which goes there.
- Drafts autosave to the server's Drafts mailbox after a 1.5 s pause in the
  typing, and at most 5 s after a change, because steady typing never pauses
  that long. The copy on this device does not wait for either: what is typed is
  written to the same database's `drafts` store within about 300 ms, and the
  server's answer removes it. When the page is hidden, which is the last a
  phone may hear before it is put away or closed, whatever is waiting is saved
  at once (`compose.flush`). What is left in the store on load or reconnect is
  settled by `recoverLocalDrafts`: drafts closed offline go to Drafts, and
  drafts a reload interrupted come back to the dock, so a reload costs a
  fraction of a second of typing at most.
  A draft's saves go one at a time (`#saves` in the compose store). The server
  save is create-new and destroy-old, so two on their way with the same old id
  left two copies. Close and Discard wait for the save on its way and act on
  the copy it left; Send does not wait (a save that never answers must not
  hold a message back) and removes that copy afterwards, so a sent message is
  not also in Drafts. Nothing waits for a save longer than `SAVE_WAIT_MS`.
  Opening a saved draft does not rewrite it. It starts out as saved, and the
  picture sizes Trix writes in once an image has loaded are the editor
  settling, not an edit.
  Opening a saved draft that already has a panel (or a chip in the dock) brings
  that one forward: two panels on one saved draft would save over each other.
- **A failed action says which failure it was.** `messageOf` in
  `#lib/errors.ts` turns a failed remote call into words: the server's own
  sentence when it sent one, else the caller's. A call that never reached the
  app, by the browser's account or a proxy's 502, 503 or 504, reads "You're
  offline — …" or "Can't reach the server — …" with the caller's words after
  it, and never "Failed to fetch".
- **Undo send** (Settings → *Undo send*: off, 5, 10 or 20 s, 5 by default; it
  travels with the account) is the same queue: a send is written to the outbox
  with `holdUntil` and the draft's server copy (`draftId`), the panel closes, and
  a toast offers Undo until the timer releases it. Undo takes it back out and
  reopens the panel. So a tab closed during the window still sends — on the next
  load, like any queued message — where 1.0's in-memory hold lost it; while a
  send is held the tab asks before it unloads. Drains and releases share a Web
  Lock (`withOutboxLock`), so two tabs never send one entry twice. A scheduled
  send is not held: it already has a later time.
- **What lives in `@zaur/mail-core` rather than here:** anything a native client
  would need too — the JMAP client, the search query parser, and the rule model
  with its Sieve compiler (`sieve-rules.ts`). What stays in mail2 is the shell:
  the push listener, the remote functions and the UI.
- Styling is design system v2: `styles/tokens.css` carries the surfaces, ink ramp,
  six channels, elevations and the dark ramp; `styles/base.css` owns the
  shared primitives (`.btn-tactile` / `.btn-primary` / `.btn-danger`, `.z-icon-btn`,
  `.z-group` / `.z-segment`, `.z-check`, `.z-field`, `.z-kbd`, `.z-avatar`, `.z-chip`,
  `.z-count`, `.z-railed` / `.z-hue-wash`, `.z-menu`, `.z-caption`) and the `.z-shell`
  grid; `#lib/mail/colors` owns the channel and identity models (`messageChannel`,
  `mailboxChannel`, `identityTone`, `attachmentBadge`). Components read
  the tokens (`var(--z-*)`) rather than hex values, which is what lets one set of
  tokens carry both themes (see [Dark mode](#dark-mode)).
