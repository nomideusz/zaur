# Product

<!-- impeccable:product-schema 1 -->

Scope: the Zaur suite, meaning **Zaur Mail** (`apps/mail2`), **Register** (`apps/register`) and **Zaur Music** (`apps/music`). The apex landing site `apps/web` is a different product with its own `PRODUCT.md` and `DESIGN.md`.

## Platform

web

All three apps are web apps, and Mail and Music install as PWAs. Native iOS and Android Mail clients are planned (`docs/decisions/0001-native-mobile-architecture.md`) but not built, and they get their own design language.

## Users

- **The maker, daily.** The heaviest user of Mail and Music is the person who builds and runs them. Most of the shell's sharp edges are found by that daily use: keyboard shortcuts, multi-account, shared mailboxes.
- **An invited circle.** Friends, family and the people on the maker's own domains get an address by invitation. They use Mail as their ordinary inbox on a phone or laptop and should never need to know a server sits behind it.
- **Public sign-ups.** When open registration is on (`REGISTRATION_OPEN`), anyone can create an address at Register. For them the job is to get an address, then use Mail as their mail, with no setup.

## Product Purpose

The suite is a self-run alternative to the big mail suites. You get one Zaur address and one sign-in, and that gives you mail, calendar, contacts, files, video calls (Meet) and a shared music library. Register is the way in: it creates the address. Mail is the workspace. Music shows that the same sign-in carries over to other services.

Success means people use it as their real, everyday mail, not as a curiosity, and nothing about it feels like a compromise for having left Gmail.

## Positioning

- **Independence.** It runs on the maker's own server and domains (Stalwart mail server, self-hosted Navidrome, LiveKit for calls). There are no ads and no tracking, and no one reads the mail to sell anything. Nothing third-party is required to use it.
- **One workspace.** Mail, calendar, contacts, files, Meet and Music share one Zaur sign-in. Mail2 is the OIDC provider for Music and the other services, and the apps share one design system.
- **Craft.** It is small and made with care: keyboard-first, fast, with considered details the big suites skip, such as an undo for send and moves, sensible confirmations, and a hue for each folder and label kind.

## Operating Context

- **Mail is used all day,** on desktop with the keyboard (j/k, e, #, r, c, ?) and on a phone as an installed PWA. Push notifications, offline drafts and multi-account are part of normal use.
- **Register is a single visit:** pick a username and domain, solve the captcha, and get the address (or an invitation link for the invited circle).
- **Music is used on a phone in the background** as a PWA: shelves, albums, playlists, lyrics and radio. People add a song by pasting a YouTube link.
- **A public demo** at demo.zaur.app runs Mail in demo mode with fictional mail, so people can look around without an account.

## Capabilities and Constraints

- **Stack:**
  - Mail and Music are SvelteKit 3 / Svelte 5 apps with remote functions and Tailwind v4.
  - Register is Express with static HTML. Its CSP has no `'unsafe-inline'`, so no `style=""` attributes; its stylesheet is built and committed to `public/app.css`.
- **Shared identity:** Mail2 is the OIDC identity provider, with the issuer at webmail.zaur.app. Music, Bartube and Photos are its clients.
- **Mail server:** Stalwart is the backend, reached over JMAP. Mail server features are limited to Stalwart Community; the Enterprise-only features are unavailable.
- **Terminology:** a *folder* is a place (Inbox, Archive, Trash). A *label* is a mark: Important, Flagged, or an AI or Sieve category. Every folder and label kind carries a colour channel.
- **The common design system** is moving into `packages/ui` (`@zaur/ui`). Mail, Register and Music should all consume it from there, instead of Register and Music importing Mail's stylesheets by relative path.
- **Undecided:** whether Chat (Campfire) and Discuss (Discourse) are restyled to match the suite.

## Brand Commitments

- **Names:** the product names are **Zaur Mail**, **Zaur Music** and **Zaur Meet**, plus Register. The wordmark appears as ZAUR in system mail.
- **Voice:**
  - Plain, specific English that names what happens: "Delete forever", "Empty Junk", "Stop sharing", never "OK".
  - Short sentences and British spelling (colour, organise).
  - Errors say what went wrong and what to do next.

## Evidence on Hand

- The demo mailbox (demo@zaur.app, with fictional seeded mail) and demo.zaur.app.
- Local smoke stacks with seeded data: `pnpm smoke:jmap` and `smoke:seed` in mail2, and `tests/smoke/fake-navidrome.mjs` in music.
- No user counts, testimonials or uptime figures exist. Do not fabricate them.

## Product Principles

1. **Your mail, your server.** Never add a dependency that reads, tracks or monetises what people keep here.
2. **One suite, one hand.** Every app reads as the same product, with the same tokens, controls and voice. A new service joins the system rather than bringing its own.
3. **Everyday first.** Optimise for the hundredth visit: speed, keyboard paths, quiet chrome. The first impression comes second.
4. **Say what happens.** Every control names its action, and every irreversible action asks plainly first.
5. **Phone and desk are equal.** Every flow has to work one-handed on a phone and keyboard-only at a desk.

## Accessibility & Inclusion

- Body and secondary text hold at least 4.5:1 contrast in both themes, including text on the coloured channel washes.
- Every action is reachable by keyboard and named for screen readers.
- Light and dark themes, plus following the system setting, are required.
- Reduced motion is respected.
