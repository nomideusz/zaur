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

## Stalwart ↔ Logto (OIDC Bearer for webmail)

Webmail sends Logto **access tokens** to Stalwart JMAP (`Authorization: Bearer …`). Stalwart validates them against Logto; **LLDAP stays the password directory** for IMAP/SMTP and app passwords.

```
webmail (PKCE) → Logto @ auth.zaur.app
webmail JMAP   → mail.zaur.app  (Bearer access_token)
Thunderbird    → mail.zaur.app  (app password → LLDAP bind)
```

Requires **Stalwart 0.16.1+** so HTTP Bearer can use a **per-domain OIDC directory** (domain taken from the token `email` claim) while `Authentication.directoryId` remains LLDAP.

### Apply on the server

```bash
export STALWART_URL=https://mail.zaur.app
export STALWART_USER=admin
export STALWART_PASSWORD='…'   # recovery admin or management account
./infra/mail/apply-stalwart-logto.sh
```

Or manually in **Settings → Authentication → Directories**:

| Field | Value |
|-------|-------|
| Type | OpenID Connect |
| Issuer URL | `https://auth.zaur.app/oidc` |
| Username claim | `email` |
| Required audience | *(empty — Logto webmail tokens are opaque or use Logto’s API resource `aud`)* |

Then **Settings → Domains → zaur.app → Directory** → select the Logto OIDC directory.  
Leave **Settings → Authentication → General → Directory** on **LLDAP**.

Accounts must **already exist in Stalwart** (register creates them). Logto users must use the **same email**; OIDC does not auto-provision mailboxes ([Stalwart OIDC docs](https://stalw.art/docs/auth/backend/oidc/)).

### Logto checklist

1. Webmail app with redirect `https://webmail.zaur.app/oauth/callback` (PKCE, no secret).
2. Scopes: `openid profile email offline_access`.
3. Each mailbox has a Logto user with matching primary email (register → Logto hook is phase 4).

Optional: create API resource `https://mail.zaur.app/api` as **default API** and set Stalwart **Required audience** to that URI if you want JWT offline validation instead of userinfo.

## Adding config here

When you version Stalwart settings, add files such as:

- `apply-stalwart-logto.sh` — idempotent CLI wiring for Logto OIDC
- `stalwart-logto-oidc.ndjson` — declarative apply template (`stalwart-cli apply --file …`)
- `upgrade.md` — version bump checklist
- `backup.md` — backup/restore procedure

Keep secrets out of git. Reference CapRover env vars or a secrets manager instead.
