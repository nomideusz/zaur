# Meet (retired Galene)

Calendar video calls now use **LiveKit Cloud**, joined in webmail at
`/meet/{group}`. Do not deploy Galene on Contabo or radio.

Webmail env (Dokploy):

```env
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

## Stop the old Galene container

On the Contabo host:

```bash
cd /opt/galene
sudo docker compose down
```

UDP `10000` and TURN `1194` can be closed once Galene is gone. Traefik can
drop the `meet.zaur.app` route; join links are same-origin on webmail.

This directory is kept only so the old image and compose file can be removed
cleanly. Do not run `deploy.sh`.
