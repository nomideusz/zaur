# @zaur/music — Zaur Music

A player for the shared music library at music.zaur.app. Navidrome holds the
library and this app is its face: a SvelteKit PWA that signs in with a Zaur
address, talks to Navidrome's Subsonic API from the server, and can add a song
from a YouTube link. It wears mail2's design system (the stylesheets are
imported from `apps/mail2/src/routes/styles`, and the Dockerfile copies them).

## Running

```sh
pnpm dev:music          # http://localhost:5176
```

Copy `.env.example` to `.env`; it says what each variable is for. The dev
script loads `.env` itself, because the server modules read `process.env`
directly.

To run it without the real library, `tests/smoke/fake-navidrome.mjs` is a fake
Navidrome and a fake Yattee in one process, and `tests/smoke/seed-session.ts`
prints a signed session cookie, so the app opens signed in with no trip through
mail's sign-in. The commands are in the header of the first file. Against the
real Navidrome, a new address gets a real user there.

## Sign-in and the library

- **Sign-in is mail's.** The app is an OIDC client of mail2 (`#lib/server/oidc`,
  code flow with PKCE). What it keeps is a signed cookie holding the address and
  the name for a week (`#lib/server/session`); nothing secret is in it.
- **One Navidrome user per address**, so favourites, playlists and play counts
  are per person. The user is created on first use by the admin account, and
  its password is derived from the address with `NAVIDROME_USER_KEY`, so
  nothing per user is stored here (`#lib/server/navidrome`). Changing that key
  is safe: an existing user is given the new derived password on the next call.
- **The browser never talks to Navidrome.** Pages load through `sub()`, which
  turns a failure into a page a person can read: "That is not in the library."
  (404) or "The music library is not answering." (502). The log says which
  kind of failure it was.
- **Audio and covers are piped through** `/api/stream/[id]` and
  `/api/cover/[id]` (`pipe` in `#lib/server/proxy`), with Range passed along so
  seeking works. When Navidrome cannot be reached the answer is a 502, not a
  thrown 500. An answer that is not a success is sent `no-store`: covers are
  cached for a week, and a cached 404 would hide a cover for that long.
- `/api/*` without a session answers 401, and the client's `api()` sends a 401
  to sign-in and back to the same page. `/health` answers without a session; the
  client uses it to tell "the library is down" from "this device is offline".

## Account

`/account` says who is signed in and what belongs to the account, links to
mail's settings (the password, two-factor sign-in and devices are mail's to
look after: `accountUrl` in `#lib/server/oidc`), and signs out. Signing out
ends mail's session too, since mail is where the sign-in lives. The way there
is the name at the foot of the sidebar, or on a phone the initial beside
Shuffle all on Home.

## The player

`#lib/player.svelte.ts` is one player over the one `<audio>` element in the
root layout, so music keeps playing across pages. The queue, the position in
it and the time are saved to `localStorage` and restored on load; shuffle,
repeat, volume and mute are saved separately. Only one tab plays at a time: a
tab that starts playing tells the others over a `BroadcastChannel` and they
pause.

**A song that will not play.** The `<audio>` element says only that loading
failed, so the player asks the stream for its first byte to find out why, and
then does one of three things:

- The session has ended (401): sign-in, as for any other call.
- The server answered but this song did not load: it is skipped with a notice,
  and the next one plays. After three failures in a row the player stops, paused
  at the first song that failed, so a broken album does not race through the
  queue.
- The server did not answer, or answered with a 5xx: the player stops at once
  and says "Can't reach the library". Skipping would only fail every song
  after it.

Play after a stop loads the same song again at the same place. One case is
known and left: a stream that dies mid-song when the network is already back
is skipped, not resumed.

**Shuffle** reorders only what comes after the current song, and remembers the
order it found, so switching it off puts the rest back. Songs added while it
was on go first when it is switched off. **Repeat** is off, all, or this song.
**Volume and mute** are in the bar from 768px up with a mouse or trackpad; a
touch screen has none, since the device has its own volume keys and iOS ignores
a page's volume anyway. A slider at zero counts as muted, and the button undoes either.

**A play is counted by listening, not by position.** "Now playing" is reported
when the song starts. The play itself is reported after half the song or four
minutes, whichever is less, of time actually listened; seeking forward does not
count.

The tab's title is the playing song (`▶ Song — Artist · Zaur Music`) and goes
back to the page's own on pause. Media Session handlers are set, so the OS's
media controls drive the same player.

## Keys

| Key | Does |
| --- | --- |
| `Space` | play or pause |
| `←` `→` | back or forward 5 s |
| `Shift+←` `Shift+→`, `p` `n` | previous, next |
| `/` | search |

There is one rule for who a key belongs to, in the root layout's `shortcut`:

- While a menu or a card is open the keys are its own. Now playing is a dialog
  too, but the keys still drive the player there.
- Typing in a field is typing.
- A focused control keeps only the keys it uses itself: Space on a button
  reached with Tab presses that button, and the arrows on a slider move it. A
  button that merely has focus because it was clicked does not keep Space.
- A held key acts once. Only seeking repeats.
- With nothing loaded there is nothing to drive, and Space stays the browser's.

## Now playing, menus and cards

Now playing, a row's ⋯ menu and the small cards (Add to playlist, Edit
playlist) are native modal `<dialog>`s: focus moves in and comes back, Esc
closes, and a tap outside closes without also landing on what is underneath.
Each is also a history entry, so Back closes it and stays on the page with the
music playing. Now playing's entry survives a reload.

`Sheet.svelte` is the one component behind the menus and cards. Its header
comment has the rules a caller must follow, and the one that is easy to miss
is that anything which navigates or reloads the page's data after closing a
sheet has to wait for `close()` first.

The status line (`notify` in `#lib/notice.svelte.ts`) is one line above the
player bar, or under Now playing's header while that is full screen on a phone. Dialogs are in the browser's top layer, above everything in the
page, so while one is open the line is shown as a popover to stay on top of it.

## Playlists

Playlists are Navidrome's, per person. You can create one (from Playlists, or
from the Add to playlist card), add a song from its ⋯ menu or a whole album
from the album's page, remove a song, rename and delete.

- A playlist belongs to the account that made it (`playlistsOf` in
  `#lib/server/navidrome` is the one place that sorts them). Home, Playlists
  and the Add to playlist card show your own. One that another account made
  public (the radio's, say) is listed apart on Playlists under "Shared by
  others" and opens as "Shared by <owner>" with no Edit: Navidrome lets only
  the owner change it.
- A song is removed by its **position**, not its id: a playlist can hold the
  same song twice.
- Deleting a playlist leaves its songs in the library. The shared library
  itself cannot be edited from this app.

## Moving between pages

Going to a page must never cost the one that is playing. With the server out
of reach, a navigation that ends in a full page load would replace the app and
stop the music. Two things prevent that, and the header comment of
`#lib/visit.svelte.ts` has the details:

- **The root layout has no server load, on purpose.** Every page's own load
  returns `user` instead, so a new page's `+page.server.ts` must do the same.
  With a root load, a page whose data cannot be fetched makes Kit load the
  address afresh (the offline page, or a gateway's error) in place of the app.
- **Links and `goto` fetch the page's data before they go**, and stay where they
  are with a notice when the server does not answer. Back and Forward are left
  to Kit: holding them means undoing the browser's step and replaying it, a
  race that cannot be won. Out of reach, they land on the in-app error page,
  whose "Try again" loads the address again in place; the music keeps playing.

A link inside Now playing, a menu or a card closes that layer first, waits for
its history step, then goes. Replacing the layer's shallow entry instead makes
Kit treat the next Back as closing a layer, and the screen would not change.

`.main` scrolls, not the window, so Kit's own scroll handling never sees it.
The layout does it: a new page opens at the top, Back returns to where you
were, and a page that only changes its query stays put.

## Offline

The service worker (`src/service-worker/`) does as much as makes sense for a
streaming player: the installed app opens without a network, to a page that
says so, and covers come from a cache.

- The build's own files are precached, under a cache named for the build
  version.
- Covers are served from a cache and refreshed in the background, at most 300
  of them, oldest out first.
- A page load always asks the network and falls back to `static/offline.html`,
  which must stay self-contained.
- Pages and their data are never cached, because they carry the signed-in
  person. Neither is `/auth`, nor anything under `/api` except covers. Audio is
  not touched at all, so its Range requests go straight to the network.
- **In dev the worker serves nothing from a cache**, since there is no build to
  cache. Anything about offline has to be checked on a production build
  (`pnpm --filter @zaur/music build`, then run `build/index.js`).

## Adding music

Search is also where music is added. Under the library's results it streams
what is out there: albums from Deezer and songs on YouTube, each with an Add
button (`#lib/server/albums`). A pasted YouTube (or Bartube) link adds that
video. The server fetches the audio, tags the file, and writes it to
`<MUSIC_DIR>/YouTube/<artist>/`, where Navidrome finds it on a scan
(`#lib/server/youtube`). One download runs at a time. With `YATTEE_URL` set,
Yattee Server does the YouTube part from another host and only the file is
downloaded here; search needs Yattee. The job list lives in memory, so a
restart forgets the list and keeps the files.

A whole album (from Search, or "Add the other N songs" on an album page) is
Deezer's tracklist: each track the library lacks is looked up on YouTube when
its turn comes (`pickUpload`: the same take, about as long, the artist's own
upload first) and filed under `YouTube/<album artist>/<album>/` with Deezer's
tags and cover, so it joins the album already there.

The manifest's share target points at `/search` (`/add` redirects there), so a
link shared to the installed app is added. An app that is already open is
handed the link and is not reloaded, which would stop the music (Chromium only).

**Discover.** An artist's page ends with "Fans also like" (Deezer's related
artists), and Home has a Discover shelf: artists the library lacks that fans
of the listener's most played, favourite and recent artists also like. One the
library has opens its page; any other opens a search, with its albums to add
(`relatedArtists`, `discover` in `#lib/server/albums`).

## Tagging what arrives

Songs that reach the library some other way (YouTube rips with the uploader as
artist and no album) are tagged by `scripts/retag.py`: album, year and cover
from Deezer, or else each its own single, so nothing shows as "Unknown album".
The server runs a copy from the data volume every hour (contabo's root crontab:
`docker exec <music container> python3 /data/retag/retag.py sweep`, log in
`/srv/zaur-music/retag/sweep.log`); after changing the script, copy it to
`/srv/zaur-music/retag/`. `retag.py undo` puts every old tag back.

The same sweep measures each song's loudness with ffmpeg (`retag.py gain`) and
writes a ReplayGain track gain and peak into its tags; Navidrome passes them on
as `replayGain`, and the player turns them into the song's volume, so a loud
song and a quiet one sound alike. A page can only turn the volume down, and on
iOS it cannot set it at all, so there the songs play as they are.

`scripts/dupes.py` finds the same song twice (same artist and title, the same
length give or take a few seconds) and moves the spare copies out to
`/srv/zaur-music/dupes/`. It runs on contabo's host, since it reads Navidrome's
database: `report` says what it would move, `apply` moves it, `undo` puts it
back. It moves only a loose single or a second copy on the same album, and
never one in anyone's favourites or a playlist.

`dupes.py unsplit` (hourly from contabo's root crontab, at :47) finds albums
Navidrome shows twice because their songs' tags differ: a release date on
some, a MusicBrainz ID on others, the album artist spelled two ways. It retags
the smaller parts like the main one (`retag.py unsplit` in the container, with
track numbers from Deezer where a song had none); `retag.py unsplit-undo` puts
the old tags back.

## Checks

```sh
pnpm --filter @zaur/music check     # svelte-check, and the service worker's own tsconfig
pnpm --filter @zaur/music test      # node --test
pnpm --filter @zaur/music build
```
