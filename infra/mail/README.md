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

## Managing Stalwart config

Settings live in Stalwart's RocksDB, not in a config file (`/etc/stalwart/config.json` only points at the store). Manage them from the contabo host:

```bash
ADMIN=$(docker inspect mail --format '{{range .Config.Env}}{{println .}}{{end}}' | grep STALWART_RECOVERY_ADMIN | cut -d= -f2)
export STALWART_URL=http://127.0.0.1:8082 STALWART_USER=${ADMIN%%:*} STALWART_PASSWORD=${ADMIN#*:}
sudo -E /root/.cargo/bin/stalwart-cli describe            # list object types + schemas
sudo -E /root/.cargo/bin/stalwart-cli query NetworkListener
sudo -E /root/.cargo/bin/stalwart-cli snapshot <Object>   # dump as JSON plan (shows exact field shapes)
```

Notes: JMAP set fields are maps (`"bind": {"[::]:587": true}`); `Action/ReloadSettings` does **not** bind newly created listeners — `docker restart mail` for that; `QueuedMessage.nextRetry` is mutable, so a stuck queue entry can be force-retried with `update`.

### Incident 2026-07-11: port 587 dead

Two config objects had vanished from the settings DB (cause unknown, possibly the 2026-06-30 license-lapse recovery):

- the `submission` NetworkListener (587/STARTTLS) — docker still mapped the port, but nothing listened inside, so connections were accepted and immediately closed;
- the `report` MtaDeliverySchedule — every outbound DMARC/TLS report failed with `Queue strategy not found` and rescheduled forever.

Both were recreated with `stalwart-cli create` (listener mirrors the 465 one with `tlsImplicit: false`; schedule mirrors `dsn` with `queueId` = the `report` virtual queue), followed by a container restart. If other subsystems misbehave, suspect more missing objects and audit with `snapshot`.

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
