# Changelog

Each version's section becomes its GitHub release. See "Releases" in the README.

## 2.3.0

- Mail can share a host with Stalwart (as on `mail.zaur.app`). Its own paths that clashed with Stalwart's moved: sign-in is `/signin`, and the app's endpoints are under `/z/` (`/login`, `/api/…` and `/auth/claim|return` before). The old paths still work on a host of Mail's own
- Passkey sign-in now comes back to `https://<host>/z/oauth/callback`: add it as a redirect URI of Mail's OAuth client before updating. Password sign-in is unchanged
- New optional `CANONICAL_ORIGIN` (page loads on any other host go there) and `OIDC_ISSUER` (where other apps sign in through Mail; `/oidc/*` elsewhere goes there). Unset, nothing changes

## 2.2.0

- Sign in with a passkey, on Stalwart 1.1 and later. The button sends you to the mail server's own sign-in page, where the passkey is asked for, and back signed in. Add the host Mail runs on as a redirect URI of its OAuth client (`https://<host>/api/auth/oauth/callback`)
- Password & sign-in lists your passkeys and removes them, and links to the mail server's account page to add one

## 2.1.2

- App passwords and API keys can be created again on Stalwart 1.0.3, which refused them with "You are not authorized to grant permissions". A new one gets what your sign-in holds (mail, contacts, calendars and files), and cannot change your password or manage credentials. Existing ones keep working

## 2.1.1

- Works with Stalwart 1.0.3, which removed the First-party setting from OAuth clients and holds tokens to the scopes they ask for. Mail now also asks for files and security, so Files and the security settings keep working
- On Stalwart 1.0.3, list mail, contacts, calendars, files and security on Mail's OAuth client before updating, or sign-in fails with `invalid_scope`. Sessions from before Stalwart 1.0.3 sign in again once

## 2.1.0

- Works with Stalwart 1.0 as well as 0.16. Stalwart 1.0 refuses unregistered OAuth clients, so register Mail's before moving (README)
- A session the server no longer accepts goes back to sign-in, instead of leaving the app on its loading placeholders
- New-mail notifications stop asking the server about an account it has refused, until that account signs in again

## 2.0.0

First numbered release of Mail 2, the client behind the JMAP Webmail template on Railway.

- Mail, contacts, calendar, files and server-side filter rules
- Sign-in for Stalwart (password or OAuth), Cyrus and Apache James (basic) and Fastmail (API token)
- Installs as a PWA, with drafts and an outbox that work offline, live updates over JMAP push and optional new-mail notifications
- `/health` reports the running version
