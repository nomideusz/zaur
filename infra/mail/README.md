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

## Stalwart auth (Logto OIDC + PostgreSQL)

Hybrid auth: **Logto** for Bearer/passkey JMAP sessions; **PostgreSQL** (`stalwart_auth` on `auth-db`) for mailbox passwords (JMAP basic auth, IMAP, SMTP submission).

```
webmail (PKCE)     → Logto @ auth.zaur.app
webmail JMAP       → mail.zaur.app  (Bearer access_token → Logto OIDC directory)
webmail password   → mail.zaur.app  (basic auth → PostgreSQL SQL directory)
Thunderbird / SMTP → mail.zaur.app  (login → PostgreSQL SQL directory)
register signup    → Stalwart account + bcrypt hash in PostgreSQL + Logto user
```

Requires **Stalwart 0.16.1+**. Webmail uses **opaque** Logto access tokens (no `OAUTH_RESOURCE`); Stalwart validates them via Logto’s userinfo endpoint (`/oidc/me`).

| Setting | Directory |
|---------|-----------|
| **Authentication → Directory** (global default) | **Logto OIDC** |
| **Each mail domain → Directory** | **PostgreSQL Auth** |

Domains must **never** inherit the Logto OIDC directory — password login would break.

### Apply on the server

```bash
export STALWART_URL=https://mail.zaur.app
export STALWART_USER=admin
export STALWART_PASSWORD='…'
./infra/mail/apply-stalwart-postgres.sh
docker service update --force srv-captain--mail
```

Or manually in **Settings → Authentication → Directories**:

| Field | Value |
|-------|-------|
| Type | OpenID Connect |
| Issuer URL | `https://auth.zaur.app/oidc` |
| Username claim | `email` |
| Required audience | *(empty)* |

Accounts must **already exist in Stalwart** (register creates them). Logto users must use the **same email**; OIDC does not auto-provision mailboxes ([Stalwart OIDC docs](https://stalw.art/docs/auth/backend/oidc/)).

## Adding config here

When you version Stalwart settings, add files such as:

- `apply-stalwart-postgres.sh` — idempotent CLI wiring for Logto OIDC + PostgreSQL
- `stalwart-logto-oidc.ndjson` — declarative apply template (`stalwart-cli apply --file …`)
- `upgrade.md` — version bump checklist
- `backup.md` — backup/restore procedure

Keep secrets out of git. Reference CapRover env vars or a secrets manager instead.
