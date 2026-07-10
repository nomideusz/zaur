# Stalwart mail server (`mail.zaur.app`)

Stalwart runs as a **deployed binary**, not application source in this repo. This folder holds configuration, upgrade notes, and operational docs for the mail server that powers JMAP/IMAP/SMTP for Zaur accounts.

## What lives elsewhere

| Concern | Location |
|---------|----------|
| Webmail client | `apps/webmail` |
| Account registration | `apps/register` |
| Stalwart binary | CapRover / ops (not vendored here) |

## Related URLs

- **JMAP API:** `https://mail.zaur.app`
- **Registration:** `https://register.zaur.app`
- **Webmail:** `https://webmail.zaur.app`

## CapRover nginx (root redirect)

The CapRover **`mail`** app has a custom nginx snippet so browsers hitting `https://mail.zaur.app/` go to webmail. Mail API paths are unchanged.

```nginx
location = / {
    return 302 https://webmail.zaur.app/;
}
```

Configured in CapRover → **mail** → **HTTP Settings** → **Edit Default Nginx Config** (insert before the catch-all `location /`). After edits on the VPS, restart captain: `docker service update --force captain-captain`.

## Stalwart authentication

Logto and the external PostgreSQL auth directory were removed. Stalwart is the
sole authentication authority and stores account credentials in its internal
directory. The live `Authentication.directoryId` is `null`, which selects that
internal directory.

```
webmail password login → mail.zaur.app  (Basic auth; password held in sealed server-side session storage)
webmail OAuth login    → Stalwart built-in OAuth + PKCE (Bearer/refresh tokens)
Thunderbird / SMTP    → mail.zaur.app  (password or Stalwart app password)
register signup       → Stalwart account + Argon2id password credential
```

Password login (`/api/auth/login`) uses HTTP Basic directly against JMAP. OAuth
uses Stalwart's built-in provider; it does not introduce an external identity
service or change SMTP/IMAP authentication.

| Setting | Directory |
|---------|-----------|
| **Authentication → Directory** (global default) | **Internal** (`directoryId: null`) |

Accounts must already exist in Stalwart; the register app creates them through
the management JMAP API. Do not run the retired PostgreSQL or Logto migration
scripts against production.

## Adding config here

When you version Stalwart settings, add files such as:

- `upgrade.md` — version bump checklist
- `backup.md` — backup/restore procedure

Keep secrets out of git. Reference CapRover env vars or a secrets manager instead.
