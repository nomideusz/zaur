# Jitsi Meet (`meet.zaur.app`)

Self-hosted video for Zaur calendar events. The webmail client does not embed
Jitsi — it stores a room URL in the event location and opens it in a new tab.
Wire the client with:

```bash
PUBLIC_JITSI_URL=https://meet.zaur.app
```

Ops live here; the Jitsi stack itself is the upstream
[docker-jitsi-meet](https://github.com/jitsi/docker-jitsi-meet) release
(not vendored — pull the latest zip when deploying).

## Requirements (Contabo)

| Resource | Guidance |
|---|---|
| RAM | 2–4 GB free for a 3-person team |
| DNS | `meet.zaur.app` → host public IP |
| Firewall | TCP `80`/`443` (via Traefik/Caddy), **UDP `10000`** open to the host for media |
| Disk | ~2 GB images + `CONFIG` volume |

UDP/10000 must hit the JVB container (or the host port mapped to it). HTTP
reverse proxy alone is not enough for WebRTC media.

## Deploy (reverse proxy on the same host)

Zaur already terminates TLS in Dokploy/Traefik (or CapRover). Run Jitsi HTTP-only
behind that proxy.

```bash
# On the Contabo host
sudo mkdir -p /opt/jitsi && cd /opt/jitsi
wget "$(wget -q -O - https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest | grep '"browser_download_url".*zip' | head -1 | cut -d\" -f4)"
unzip docker-jitsi-meet-*.zip
cd docker-jitsi-meet-*

cp env.example .env
./gen-passwords.sh

# Merge the Zaur-oriented defaults (adjust paths/IPs as needed):
#   see env.zaur.example in this folder
mkdir -p /opt/jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}

docker compose up -d
```

Key `.env` values for our reverse-proxy layout:

```env
CONFIG=/opt/jitsi-meet-cfg
PUBLIC_URL=https://meet.zaur.app
TZ=Europe/Warsaw
DISABLE_HTTPS=1
ENABLE_HTTP_REDIRECT=0
ENABLE_LETSENCRYPT=0
HTTP_PORT=8000
HTTPS_PORT=18443
# Public IPv4 of the Contabo host (required for clients to reach media):
JVB_ADVERTISE_IPS=<CONTABO_PUBLIC_IP>
JVB_PORT=10000
```

After first `docker compose up`, ensure config volumes are writable by uid 1000:

```bash
chown -R 1000:1000 /opt/jitsi-meet-cfg
```

On Contabo, Traefik file route lives at
`/etc/dokploy/traefik/dynamic/meet-zaur.yml` → `http://172.17.0.1:8000`.
Elsewhere, point Traefik / Caddy / Dokploy at `http://127.0.0.1:8000` for `meet.zaur.app`.
WebSockets that must be forwarded (hop-by-hop):

- `/xmpp-websocket`
- `/colibri-ws/`

Example Caddy site block:

```caddy
meet.zaur.app {
	reverse_proxy 127.0.0.1:8000
}
```

Example Traefik labels (compose overlay) — terminate TLS on Traefik, route to
the `web` service on port 80 inside the Jitsi network; keep `JVB` publishing
`10000:10000/udp` on the host.

## Firewall

```bash
# media — required
sudo ufw allow 10000/udp comment 'jitsi jvb'
# HTTP(S) only if not already open for the reverse proxy
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Wire webmail

In the webmail Dokploy service env:

```env
PUBLIC_JITSI_URL=https://meet.zaur.app
```

Redeploy webmail. Calendar compose gains **Video call**; event details gain
**Join call**. Unset the variable to hide those controls.

## Smoke test

1. Open `https://meet.zaur.app` — lobby loads.
2. Create a random room, join from two browsers (or phone + laptop).
3. In webmail → Calendar → New event → enable **Video call** → save →
   **Join call**.

If audio/video fails but the page loads, check `JVB_ADVERTISE_IPS` and UDP/10000
first — that is the usual failure mode behind a reverse proxy.

## Security notes (3-person team)

- Default open rooms are fine for internal acquisition calls; anyone with the
  URL can join.
- Later: enable JWT auth (`ENABLE_AUTH=1` + `AUTH_TYPE=jwt`) and mint tokens
  from webmail if rooms need to be locked.
- Keep `gen-passwords.sh` output private; do not commit `.env`.

## Updates

Re-download the latest `docker-jitsi-meet` release zip, unzip over the install
directory (keep your `.env` and `CONFIG`), then `docker compose pull && docker compose up -d`.

## Related

- Client helpers: `apps/webmail/src/lib/utils/jitsi.ts`
- Env: `PUBLIC_JITSI_URL` in `apps/webmail/.env.example`
