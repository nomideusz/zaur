# Stalwart mail server (`mail.zaur.app`)

Stalwart runs as a **deployed binary**, not application source in this repo. This folder holds configuration, upgrade notes, and operational docs for the mail server that powers JMAP/IMAP/SMTP for Zaur accounts.

## What lives elsewhere

| Concern | Location |
|---------|----------|
| Webmail client | `apps/mail2` |
| Account registration | `apps/register` |
| Stalwart | Dokploy compose `mail` on contabo, image `stalwartlabs/stalwart` (not vendored here) |

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

Both were recreated with `stalwart-cli create` (listener mirrors the 465 one with `implicitTls: false`, called `tlsImplicit` before 1.0; schedule mirrors `dsn` with `queueId` = the `report` virtual queue), followed by a container restart. If other subsystems misbehave, suspect more missing objects and audit with `snapshot`.

## Version and upgrades

Production runs Stalwart v1.0.2, moved from v0.16.27 on 2026-11-03. The compose lives in Dokploy
(`mail`). The container must stay named `mail` on `dokploy-network`, because mail2, register and
the backup script all find it by that name.

| Volume | Mount | Holds |
|--------|-------|-------|
| `stalwart-v1-config` | `/etc/stalwart` | `config.json`, which only points at the store |
| `stalwart-v1-data` | `/var/lib/stalwart-v1` | RocksDB with all settings, accounts and mail |

v0.16 to v1 cannot upgrade in place. `stalwartlabs/stalwart-migrate` copies into a new empty store
and needs a v0.16.27 source. Migration tool 1.0.5 writes a v1.0.1 store, so v1.0.1 has to boot once
before v1.0.2. What the move changed:

- OAuth tokens are not migrated, so everyone signs in again. mail2 sends a rejected session to
  `/login`; IMAP, SMTP and app passwords carry on.
- Unregistered OAuth client ids are refused. `zaur-mail2-prod` is an `x:OAuthClient` with
  `firstParty: true`, since mail2 runs the sign-in on its own page. A new mail2 hostname needs its
  redirect URI added there.
- New v1.0.2 permissions (`sysEncryption*`, `sysExternalPublicKey*`, `sysSmimeTrustAnchor*`,
  `taskExternalPublicKeyMaintenance`) were granted to the System Administrator role by hand.
- The search index is rebuilt from the copied mail on first boot with Meilisearch reachable.
- 3 `x:SpamTrainingSample` objects whose blobs were already missing were not copied.

The old `captain--stalwart-config` and `captain--stalwart-data` volumes are the v0.16 store as of
the cutover, and `/root/mail-upgrade/state` is the migration state. Mail received since then exists
only in v1, so going back means `stalwart-migrate rollback` into a new store, not just redeploying
the old compose. The one-shot `mail-upgrade-cleanup.timer` on contabo removes all of them on
2026-11-10, after checking that `mail` is healthy on the v1 volumes. To keep them longer:
`systemctl disable --now mail-upgrade-cleanup.timer`.

`http.x-forwarded-missing` is set to debug level (`EventTracingLevel`). The listener trusts
Traefik's header, and mail2 and register call `http://mail:8080` directly without one, which logged
a warning on every call.

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

## Backup

Nightly at 03:30, `/root/backup_mail.sh` on contabo (`/etc/cron.d/backup-mail`, log
`/var/log/backup_mail.log`) stops the `mail` container for ~2 s, copies the
`stalwart-v1-config` and `stalwart-v1-data` volumes, restarts it, then pushes the copy
with restic over SFTP to dedi (`storage-vps` in contabo's `~/.ssh/config`), repo
`/srv/zaur/backups/mail`. Retention: 7 daily, 4 weekly, 12 monthly.

`/srv/zaur` on dedi is a fully allocated 1 TB ext4 image (`/srv/zaur.img`, loop-mounted from
fstab) — the space reserved for Zaur out of dedi's 2 TB. It is mounted `X-fstrim.notrim` on
purpose: dedi's weekly `fstrim.timer` would otherwise punch the image sparse and quietly give the
reservation back. `mkfs` does the same, so after recreating the image re-run
`fallocate -l 1T /srv/zaur.img` while it is unmounted and check `du -h` reports ~1T.

Restore: `restic -r sftp:storage-vps:/srv/zaur/backups/mail restore latest --target /` on contabo
with the `mail` container stopped (the password file path is in the script). `latest` is the v1 store;
snapshots of the `captain--` paths from before 2026-11-03 are v0.16 and need that server version.

The script names the container. It failed every night from 2026-07-08 to 2026-09-20 because it
still scaled the old CapRover swarm service after mail moved to a Dokploy compose container, and
nothing watched the log — if the container is renamed again, update the script.

### Monitor

Traceway only has pull checks (`http`/`tcp`), so the backup is exposed as one. On success the
script writes `/var/lib/backup-status/mail.ok`. Container `backup-status` (`busybox httpd`, on
`dokploy-network` only, no published port) serves `/opt/backup-status/cgi-bin/mail`, which answers
200 `fresh …` while that marker is younger than 26 h and 503 `stale` otherwise — age is computed
per request, so a cron that stops running goes red too, not just a failing script. Traceway check
"mail backup fresh (<26h)" in project *zaur webmail server* polls
`http://backup-status/cgi-bin/mail` every 5 min. Another backup gets the same treatment: one more
marker, one more file in `cgi-bin/`, one more check.

## Adding config here

When you version Stalwart settings, add files such as:

- `upgrade.md` — version bump checklist

Keep secrets out of git. Reference CapRover env vars or a secrets manager instead.
