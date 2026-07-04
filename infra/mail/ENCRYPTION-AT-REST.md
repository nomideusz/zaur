# Stalwart mail — encryption at rest

**Status: NOT enabled.** The full setup below was built and validated end-to-end on
2026-07-05 (lock/unlock cycle proven, real users authenticated on the encrypted
volume), then **reverted** to plaintext at the user's request. This doc is the
copy-paste runbook to enable it later. The box is currently unencrypted.

## What this protects (and what it doesn't)

Encrypts the Stalwart data + config volumes inside a LUKS2 container, so a
**cold / decommissioned / stolen disk** reveals only ciphertext.

It does **not** protect against the hosting provider: Contabo controls the
hypervisor, so while the volume is unlocked (i.e. normal running) they can
snapshot RAM (which holds the LUKS key) or the mounted filesystem. Disk-at-rest
encryption cannot fix that — only a host you physically control can. Treat this
as "the next person who gets this SSD can't read the mail," not "nobody but us."

## Why manual unlock

No TPM on the VPS, and the box cannot reach any external host to fetch a key at
boot. So the key cannot live on the disk without defeating the purpose. The
only real option is a keyfile held **off** the box, piped in over SSH after each
boot. **Cost: after every reboot, mail is DOWN until someone unlocks it.** An
unplanned reboot (crash/kernel) means an outage until you notice and unlock.

## Environment facts (as of 2026-07-05)

- Host: `ssh contabo` (AlmaLinux 9.8, `dnf`), CapRover / Docker Swarm.
- Data lives in local volumes `captain--stalwart-data` (~250 MB) and
  `captain--stalwart-config` (~12 KB) on the unencrypted XFS root `/dev/sda4`
  (114 GB free). Service: `srv-captain--mail` (1/1 replicated).
- `cryptsetup` 2.8.1 installed; `dm_crypt` loadable.

## Design

- 5 GB LUKS2 (aes-xts-plain64) container file `/var/lib/stalwart-crypt.img`,
  ext4, mounted at `/mnt/stalwart-enc` with `data/` and `config/` subdirs.
- Each Stalwart volume's `_data` dir is **bind-mounted** from the encrypted
  subdir — the volume name is unchanged, so CapRover redeploys don't care.
- **Clobber interlock:** when locked, each `_data` mountpoint is an empty dir
  with `chattr +i` (immutable). If the box reboots and Swarm restarts mail
  before you unlock, Stalwart hits an unwritable empty dir and crash-loops
  (mail cleanly down) **instead of reinitializing a blank store**. Verified:
  `mount --bind` works over an immutable dir; when unmounted the dir is
  unwritable even to root.
- Note: the real data always lives in the `.img`, which is never touched by the
  locked-state crash-loop — the interlock only prevents a confusing blank-server
  window, it is not what protects the data.

## Enable procedure

Prereq: `dnf install -y cryptsetup && modprobe dm_crypt`

### 1. Create the container (non-destructive, mail stays up)
```bash
head -c 64 /dev/urandom > /root/stalwart.key && chmod 400 /root/stalwart.key
fallocate -l 5G /var/lib/stalwart-crypt.img && chmod 600 /var/lib/stalwart-crypt.img
cryptsetup luksFormat --type luks2 --batch-mode --key-file /root/stalwart.key /var/lib/stalwart-crypt.img
cryptsetup luksOpen --key-file /root/stalwart.key /var/lib/stalwart-crypt.img stalwart-crypt
mkfs.ext4 -q -L stalwart-enc /dev/mapper/stalwart-crypt
mkdir -p /mnt/stalwart-enc && mount /dev/mapper/stalwart-crypt /mnt/stalwart-enc
mkdir -p /mnt/stalwart-enc/data /mnt/stalwart-enc/config
```

### 2. Cutover (brief downtime while ~250 MB copies)
```bash
docker service scale srv-captain--mail=0        # wait until 0 running tasks
for pair in data:stalwart-data config:stalwart-config; do
  sub=${pair%%:*}; vol=${pair##*:}; base=/var/lib/docker/volumes/captain--$vol/_data
  chown --reference="$base" /mnt/stalwart-enc/$sub; chmod --reference="$base" /mnt/stalwart-enc/$sub
  rsync -aHAX --delete "$base/" /mnt/stalwart-enc/$sub/
  # VERIFY identical before swapping — this must print 0:
  rsync -aHAXn --checksum --itemize-changes "$base/" /mnt/stalwart-enc/$sub/ | wc -l
  mv "$base" "${base}.plain.bak"
  mkdir "$base"; chmod --reference="${base}.plain.bak" "$base"; chattr +i "$base"
  mount --bind /mnt/stalwart-enc/$sub "$base"
done
docker service scale srv-captain--mail=1
```

### 3. Install the helper scripts

`/usr/local/sbin/stalwart-unlock` (chmod 700):
```bash
#!/bin/bash
# cat ~/stalwart.key | ssh contabo stalwart-unlock
set -e
IMG=/var/lib/stalwart-crypt.img
if cryptsetup status stalwart-crypt >/dev/null 2>&1; then cat >/dev/null
else cryptsetup luksOpen --key-file=- "$IMG" stalwart-crypt; fi
mountpoint -q /mnt/stalwart-enc || mount /dev/mapper/stalwart-crypt /mnt/stalwart-enc
for pair in data:stalwart-data config:stalwart-config; do
  sub=${pair%%:*}; vol=${pair##*:}; base=/var/lib/docker/volumes/captain--$vol/_data
  mountpoint -q "$base" || mount --bind "/mnt/stalwart-enc/$sub" "$base"
done
docker service update --replicas 1 --force srv-captain--mail >/dev/null
echo "stalwart: unlocked, mounted, mail restarting"
```

`/usr/local/sbin/stalwart-lock` (chmod 700):
```bash
#!/bin/bash
# run before a planned reboot; unplanned reboots are handled by the interlock
set -e
docker service scale srv-captain--mail=0 >/dev/null
for i in $(seq 1 40); do
  r=$(docker service ps srv-captain--mail --filter desired-state=running --format '{{.CurrentState}}' 2>/dev/null | grep -ciE 'running|starting|preparing|ready' || true)
  [ "$r" = "0" ] && break; sleep 2
done
for vol in stalwart-data stalwart-config; do
  base=/var/lib/docker/volumes/captain--$vol/_data
  mountpoint -q "$base" && umount "$base" || true
done
mountpoint -q /mnt/stalwart-enc && umount /mnt/stalwart-enc || true
cryptsetup status stalwart-crypt >/dev/null 2>&1 && cryptsetup luksClose stalwart-crypt || true
echo "stalwart: locked (mail down, volume encrypted at rest)"
```

### 4. Secure the key, THEN destroy the plaintext
Only after the keyfile is safely stored off-box **and** a lock/unlock cycle is
tested — otherwise a lost key = unrecoverable mail.
```bash
# on your machine (scp shows no content):  scp contabo:/root/stalwart.key ~/stalwart.key
# store in a password manager in >=2 places. Then on the box:
cat /root/stalwart.key | /usr/local/sbin/stalwart-lock  # (test) ; then unlock:
cat /root/stalwart.key | /usr/local/sbin/stalwart-unlock
# once proven:
for v in stalwart-data stalwart-config; do rm -rf /var/lib/docker/volumes/captain--$v/_data.plain.bak; done
shred -u /root/stalwart.key
fstrim -av    # discard freed blocks (best effort; VPS storage may retain remnants)
```
Caveat: `shred`/`rm` on SSD-backed XFS does not guarantee the pre-existing
plaintext blocks are unrecoverable from the underlying (virtualized) storage.
For a truly clean slate, provision a fresh VM and migrate into the encrypted
volume from day one.

## Day-to-day
- After any reboot: `cat ~/stalwart.key | ssh contabo stalwart-unlock`
- Before a planned reboot: `ssh contabo stalwart-lock`
- Grow the container later: `truncate -s +Ng /var/lib/stalwart-crypt.img && cryptsetup resize stalwart-crypt && resize2fs /dev/mapper/stalwart-crypt`

## Revert to plaintext
Mail runs on the encrypted volume once cut over, so restore from the **current**
encrypted data, not the stale `.plain.bak`:
```bash
docker service scale srv-captain--mail=0   # wait for 0 running
for pair in data:stalwart-data config:stalwart-config; do
  sub=${pair%%:*}; vol=${pair##*:}; base=/var/lib/docker/volumes/captain--$vol/_data
  mountpoint -q "$base" && umount "$base"
  chattr -i "$base"; rmdir "$base"; mv "${base}.plain.bak" "$base"
  rsync -aHAX --delete "/mnt/stalwart-enc/$sub/" "$base/"
done
umount /mnt/stalwart-enc; cryptsetup luksClose stalwart-crypt
rm -f /var/lib/stalwart-crypt.img; shred -u /root/stalwart.key
rm -f /usr/local/sbin/stalwart-unlock /usr/local/sbin/stalwart-lock; rmdir /mnt/stalwart-enc
docker service scale srv-captain--mail=1
```

## Alternative: per-account PGP/S-MIME (zero-access, no infra)
Stalwart's own `encryptionAtRest` (server-wide `encryptAtRest` defaults **true**)
encrypts inbound mail to a user's uploaded **public** key (OpenPGP or S/MIME) at
delivery — admins genuinely cannot read it. But it only applies to accounts that
register a key, only to mail received after, and the ciphertext **breaks
server-side webmail** (no private key to decrypt/search). Suitable for a
privacy-maximalist on Thunderbird/K-9, not a global default. Nothing to enable
server-side — the user just uploads a public key.
