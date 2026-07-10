# ZAUR identity

Logto was retired on 2026-06-30. Stalwart is the sole authentication authority.
Do not deploy the legacy Logto scripts that remain in this directory for migration history.

## Current architecture

```text
Browser → webmail login form → Stalwart JMAP Basic auth
Thunderbird / SMTP / IMAP → Stalwart password auth
Register portal → creates the account and password in Stalwart's internal directory
```

- Webmail supports email and password authentication only.
- Stalwart validates credentials through its internal directory and hashes passwords with Argon2id.
- Webmail stores the active mailbox credentials in its sealed server-side SQLite session store.
  The secure httpOnly browser cookie contains only an opaque session id.
- Forgot-password requests are proxied from webmail to the register app.
- There is no OIDC, OAuth, passkey, or Logto user synchronization path.

## Operations

The canonical Stalwart authentication and recovery instructions live in
[`../mail/README.md`](../mail/README.md). The live `Authentication.directoryId`
is `null`, which selects Stalwart's internal directory. Do not run the retired
PostgreSQL or Logto migration scripts against production.

Keep credentials and deployment secrets out of git. Store them in the deployment
platform or a secrets manager.
