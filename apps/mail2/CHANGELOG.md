# Changelog

Each version's section becomes its GitHub release. See "Releases" in the README.

## 2.1.0

- Works with Stalwart 1.0 as well as 0.16. Stalwart 1.0 refuses unregistered OAuth clients, so register Mail's with `firstParty: true` before moving (README)
- A session the server no longer accepts goes back to sign-in, instead of leaving the app on its loading placeholders
- New-mail notifications stop asking the server about an account it has refused, until that account signs in again

## 2.0.0

First numbered release of Mail 2, the client behind the JMAP Webmail template on Railway.

- Mail, contacts, calendar, files and server-side filter rules
- Sign-in for Stalwart (password or OAuth), Cyrus and Apache James (basic) and Fastmail (API token)
- Installs as a PWA, with drafts and an outbox that work offline, live updates over JMAP push and optional new-mail notifications
- `/health` reports the running version
