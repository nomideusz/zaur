# ZAUR identity

Logto was retired on 2026-06-30. Stalwart is the sole authentication authority.
Do not deploy the legacy Logto scripts that remain in this directory for migration history.

## Current architecture

```text
Browser → webmail login form → Stalwart OAuth Authorization Code + PKCE
Webmail server → sealed OAuth tokens → direct Stalwart JMAP
Thunderbird / SMTP / IMAP → Stalwart password auth
Register portal → creates the account and password in Stalwart's internal directory
```

- Webmail presents a branded email/password/TOTP form, exchanges those credentials for a
  short-lived Stalwart authorization code, and completes OAuth Authorization Code + PKCE.
- Stalwart validates credentials through its internal directory and hashes passwords with Argon2id.
- Webmail stores access and refresh tokens in its sealed server-side SQLite session store.
  Passwords and TOTP codes are not persisted; the secure httpOnly browser cookie contains only an
  opaque session id.
- Forgot-password requests are proxied from webmail to the register app.
- Logto, OIDC, and passkey synchronization are retired. Stalwart OAuth is the token authority.

## Native clients

The accepted native architecture uses a Kotlin Multiplatform protocol/data core with SwiftUI on
iOS and Jetpack Compose on Android. See
[`../../docs/decisions/0001-native-mobile-architecture.md`](../../docs/decisions/0001-native-mobile-architecture.md).

Native clients authenticate directly with Stalwart OAuth/PKCE using dedicated public client
registrations, store refresh tokens in Keychain or Keystore-backed storage, and call JMAP directly.
They must not use webmail's cookie session, `SESSION_SECRET`, or SvelteKit `/api/*` proxy. Register
and password-recovery flows use the public `register.zaur.app` API; internal HMAC secrets never
ship in a client. The complete boundary and rollout plan is in
[`../../docs/mobile.md`](../../docs/mobile.md).

## Operations

The canonical Stalwart authentication and recovery instructions live in
[`../mail/README.md`](../mail/README.md). The live `Authentication.directoryId`
is `null`, which selects Stalwart's internal directory. Do not run the retired
PostgreSQL or Logto migration scripts against production.

Keep credentials and deployment secrets out of git. Store them in the deployment
platform or a secrets manager.
