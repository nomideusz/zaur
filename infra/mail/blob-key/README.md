# Stalwart blob encryption — key held off contabo

**Status: LIVE since 2026-11-11 10:37 UTC.** Stalwart `SymmetricKey` `b` (AES-256-GCM, file
`/run/stalwart-key/blob.key`) is set on `Email` and `FileStorage`; the recode encrypted all
5,813 existing blobs (5,812 rewritten, 1 already encrypted, 0 failures). Swap is encrypted.
The owner holds a third, offline copy of the key.

## What it is

Stalwart 1.1 can encrypt every stored message and file (its "blobs") with a symmetric key
(`x:SymmetricKey`, AES-256-GCM), selected in `Email.blobEncryptionKey` and
`FileStorage.blobEncryptionKey`. The key is useless if it sits on the same disk as the
mail, so it never does:

- **radio** and **hp** each hold the key in `/etc/stalwart-key/blob.key` (root, 0400).
- **contabo** holds only its sha256 (`/etc/stalwart-key.sha256`) and receives the key into
  RAM at `/run/stalwart-key/blob.key` (tmpfs, root:2000 0440; 2000 = the container's
  `stalwart` user). After a reboot that copy is gone.
- Every minute, `stalwart-key-push.timer` on radio and on hp asks contabo `status` and, if
  the key is `missing` (or `mismatch`), sends it with `put`. Each is the other's fallback.
- Contabo cannot fetch the key: it holds no credential for radio or hp. A copy of
  contabo's disk (snapshot, old drive, backup) has neither the key nor a way to get it.

| File | Where |
|------|-------|
| `stalwart-key-receive` | contabo `/usr/local/sbin/`, the forced command of the two push keys |
| `stalwart-key-push` | radio + hp `/usr/local/sbin/` |
| `stalwart-key-push.{service,timer}` | radio + hp `/etc/systemd/system/` (timer enabled) |

Contabo's `/root/.ssh/authorized_keys` has two extra lines (backup of the file before:
`authorized_keys.pre-stalwart-key`):
`restrict,from="<tailnet ip>",command="/usr/local/sbin/stalwart-key-receive" ssh-ed25519 … stalwart-key-push@{hp,radio}`.
Tailnet only (radio 100.81.25.20, hp 100.105.5.11 → contabo 100.75.184.0); no shell, no
forwarding; `put` refuses anything whose sha256 is not the expected one and refuses to
write if `/run` is not tmpfs. radio and hp pin contabo's host key in
`/etc/stalwart-key/known_hosts` (ED25519 `SHA256:pZd8JtIkMJCv7rxrMA8JS7ng6Elov7NCOOKw0I5abO4`).

Logs: `journalctl -t stalwart-key` on all three (pushes, refusals, failures).

**Tested 2026-11-11:** radio pushed into an empty contabo; with radio's timer stopped and the
key deleted, hp restored it 3 s later; idle runs push nothing; wrong key, shell command and
login over the public IP are refused.

## What Stalwart does (tested on a scratch v1.1.0, same binary as prod)

- Settings apply only after `Action/ReloadSettings` (or a restart).
- New mail is encrypted; old mail is not until a `Task/BlobRecode` with
  `encryption: {"@type":"Encrypt","keyId":…}` runs (it splits into 256 shard tasks, done in seconds
  for a small store). Old and encrypted blobs mix fine: each carries its own format byte + key id.
- **Key file missing at start:** Stalwart runs, but every mail read answers
  `serverUnavailable` and writes fail (SMTP senders get a temporary error and retry). Dropping the
  file back + `Action/ReloadSettings` recovers without a restart.
- **Key file missing at a reload:** the reload is refused ("Failed to obtain symmetric key
  secret"), and the running server keeps the key it has. So the file must stay for as long as
  Stalwart runs, but losing it never breaks a running server.
- **Wrong key:** refused by fingerprint ("Symmetric key does not match its stored fingerprint").
- **Restore:** a raw copy of the data volume (what `backup_mail.sh` takes) opens with the key
  and does not without it.
- The nightly backup restarts the container; the RAM file survives that (only a host reboot clears it).

## What stays readable even with it on

- **Message metadata in RocksDB:** subject, from/to addresses, Message-ID, content type and the
  ~250-character preview of the body. Only the full message (body + attachments) is encrypted.
- **Meilisearch** (`SearchStore`): the full-text index of every message, on contabo's disk.
- **`stalwart --export` output** is fully decrypted plaintext (it is a migration format).
- **Old copies:** after the recode, old plaintext versions stay in older RocksDB files until
  compaction drops them, in freed disk blocks, and in the restic snapshots (kept up to 12 months).
- **Swap:** contabo has an 8 GB `/swapfile` in use; RAM pages (the key file, Stalwart's memory)
  can be written there under memory pressure.
- Anyone with root on the running contabo can read the RAM file or Stalwart's memory.

## Go live (done 2026-11-11, kept as the record)

1. **Encrypted swap** (done): `/etc/crypttab` `cryptswap /swapfile /dev/urandom swap,cipher=aes-xts-plain64,size=512`,
   `/etc/fstab` `/dev/mapper/cryptswap none swap defaults 0 0` (backups `*.pre-cryptswap`). The
   old swap contents were overwritten through the crypt layer before first use.
2. **Compose `mail` in Dokploy**: mount `/run/stalwart-key:/run/stalwart-key:ro` and make the
   command wait for the key before starting Stalwart, e.g. prefix
   `until [ -s /run/stalwart-key/blob.key ]; do echo waiting for blob key; sleep 5; done;`.
   Without this, a reboot starts Stalwart before the push lands (see "missing at start").
   Done; the old compose is `contabo:/root/mail-compose-pre-blobkey.yml`. The same deploy rotated
   `STALWART_RECOVERY_ADMIN` (it had been printed in a session log), and with it register's
   `STALWART_ADMIN_PASSWORD` (same value) and register's `ADMIN_PASSWORD` (admin panel; it had
   the same value too, now its own). Old register env: `contabo:/root/register-app-pre-rotation-2026-11-11.json`.
3. `stalwart-cli create SymmetricKey --json '{"description":"blob key (radio+hp push)","cipher":"aes256Gcm","key":{"@type":"File","filePath":"/run/stalwart-key/blob.key"}}'`
4. `update Email singleton --field blobEncryptionKey=<id>`, same for `FileStorage`, then
   `create Action/ReloadSettings --json '{}'`. Check a new message's blob is no longer plaintext:
   `contabo:/root/blobcheck.sh <label>` mails noreply@ a message with a random token hidden past the
   preview in incompressible filler and counts literal copies of the token in the store files
   (control before: 1, after: 0); `python3 /root/blobcheck-readback.py` reads them back over JMAP.
   A plain grep for the subject is useless: LZ4 hides repeated text even without encryption.
5. `create Task/BlobRecode --json '{"compression":"keep","encryption":{"@type":"Encrypt","keyId":"<id>"}}'`.
   Progress: `docker logs mail | grep "shard recoded"` (256 lines, each with total/successes/failures).
6. A third copy of the key away from all three servers (paper, or the password manager's offline
   cache). The owner reads it with `ssh hp sudo cat /etc/stalwart-key/blob.key`. **Losing every
   copy = losing every stored message, backups included.**
7. The restic snapshots taken before 2026-11-11 10:37 UTC (the last is 10:33, a pre-switch safety
   copy) hold plaintext mail. Accepted by the owner: they age out under keep-monthly 12.

## Undo

Before go-live: disable the timers (`systemctl disable --now stalwart-key-push.timer` on radio
and hp), remove the two `stalwart-key-push@` lines from contabo's authorized_keys, delete the
files listed above. After go-live: `Task/BlobRecode` with `{"@type":"Disable"}` first (needs the
key), then unset `blobEncryptionKey` and reload; only then remove the key.
