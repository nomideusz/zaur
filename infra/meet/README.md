# Galene (`meet.zaur.app`)

Self-hosted video for Zaur calendar events. Webmail does not embed Galene —
it stores a same-origin join URL (`/meet/{group}`) in the event location.
Opening that URL mints a Galene invite token (the same path Zulip uses) and
redirects to the room. Signed-in users join with their display name as
operator; guests are prompted for a name.

Wire the client with:

```bash
PUBLIC_GALENE_URL=https://meet.zaur.app
GALENE_ADMIN_USER=admin
GALENE_ADMIN_PASSWORD=<from /opt/galene/data/admin-password>
```

Ops live here; the Galene binary is built from
[jech/galene](https://github.com/jech/galene) at deploy time.

## Requirements (Contabo)

| Resource | Guidance |
|---|---|
| RAM | ~256 MB for a 3-person team (plus Docker) |
| DNS | `meet.zaur.app` → host public IP |
| Firewall | TCP `80`/`443` (via Traefik/Caddy), **UDP `10000`** (media), **TCP+UDP `1194`** (built-in TURN) |
| Disk | ~200 MB image + `data`/`groups` volumes |

UDP/10000 and TURN/1194 must hit the Galene container (or the host ports
mapped to it). HTTP reverse proxy alone is not enough for WebRTC media.

## Replace Jitsi

Stop and remove the old stack first so port 8000 and UDP/10000 are free:

```bash
# On the Contabo host
sudo docker compose -f /opt/jitsi/docker-jitsi-meet-*/docker-compose.yml down
# or: cd /opt/jitsi && docker compose down
```

Leave `/opt/jitsi-meet-cfg` until you are sure Galene works; then delete it.

## Deploy (reverse proxy on the same host)

Zaur already terminates TLS in Dokploy/Traefik. Run Galene HTTP-only behind
that proxy (`-insecure`).

```bash
# On the Contabo host, from a checkout of this repo
cd infra/meet
sudo PUBLIC_IP=<CONTABO_PUBLIC_IP> ./deploy.sh
```

`deploy.sh` copies the Dockerfile and compose file to `/opt/galene`, writes
`data/config.json` (once), and starts the container. HTTP listens on **8000**
so the existing Traefik route for `meet.zaur.app` can stay pointed at
`http://172.17.0.1:8000`.

On Contabo, Traefik file route lives at
`/etc/dokploy/traefik/dynamic/meet-zaur.yml` → `http://172.17.0.1:8000`.
WebSockets that must be forwarded (hop-by-hop):

- `/ws`

Example Caddy site block:

```caddy
meet.zaur.app {
	reverse_proxy 127.0.0.1:8000
}
```

## Firewall

```bash
sudo ufw allow 10000/udp comment 'galene media'
sudo ufw allow 1194/tcp comment 'galene turn'
sudo ufw allow 1194/udp comment 'galene turn'
# HTTP(S) only if not already open for the reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

You can drop the old Jitsi-only comment on UDP/10000; the port is reused.

## Wire webmail

In the webmail Dokploy service env:

```env
PUBLIC_GALENE_URL=https://meet.zaur.app
GALENE_ADMIN_USER=admin
GALENE_ADMIN_PASSWORD=<contents of /opt/galene/data/admin-password>
```

`PUBLIC_JITSI_URL` is still accepted as an alias for `PUBLIC_GALENE_URL`.
Redeploy webmail. Calendar compose gains **Video call**; event details gain
**Join call**. Unset the public URL to hide those controls. Join fails with
503 until the admin password is set — that secret never goes to the browser.

## Smoke test

1. Open `https://meet.zaur.app` — Galene lobby loads.
2. In webmail → Calendar → New event → enable **Video call** → save →
   **Join call**. You should land in `/group/zaur-…/?token=…` already named.
3. Open the same location URL in a private window (no webmail session) —
   Galene should ask for a display name, then connect.

If audio/video fails but the page loads, check `PUBLIC_IP` in compose
(`-turn <ip>:1194`), UDP/10000, and TCP+UDP/1194 first.

## Security notes (3-person team)

- Join URLs are unguessable (`zaur-` + 12 random chars) but public: anyone
  with the link can mint a guest token through webmail `/meet/{group}`.
- The Galene admin API (`/galene-api/`) is exposed on the same host with
  HTTP Basic. Keep `admin-password` long; do not commit it.
- `writableGroups` must stay `true` so webmail can create rooms on demand.

## Updates

From `infra/meet` on the host (or a checkout):

```bash
sudo PUBLIC_IP=<CONTABO_PUBLIC_IP> ./deploy.sh
```

That rebuilds the image from upstream `master` (override with
`GALENE_REF=<tag>`) and recreates the container. `data/config.json` and
existing groups are left alone.

## Related

- Client helpers: `apps/webmail/src/lib/utils/meet.ts`
- Admin API client: `apps/webmail/src/lib/server/galene.ts`
- Join redirect: `apps/webmail/src/routes/meet/[group]/+server.ts`
- Env: `PUBLIC_GALENE_URL` / `GALENE_ADMIN_PASSWORD` in `apps/webmail/.env.example`
