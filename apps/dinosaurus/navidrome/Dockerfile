# Custom Navidrome image bundled with Syncthing for music sync.
#
# Why: Navidrome (music streaming) and Syncthing (file sync) share one
# CapRover volume in the same container. Local Syncthing pushes files into
# the music folder, Navidrome scans them and they're available in the dino.
#
# Two processes inside the container:
#   - syncthing serve  (background) — :8384 GUI, sync via Syncthing's relays
#   - /app/navidrome   (foreground) — Subsonic API + web UI on $ND_PORT

FROM deluan/navidrome:latest

USER root

# tini          — signal handling for our multi-process container
# syncthing     — file sync daemon
# apache2-utils — provides htpasswd, used to bcrypt the Syncthing GUI password
RUN apk add --no-cache tini syncthing apache2-utils

COPY entrypoint.sh /entrypoint.sh
RUN chmod 0755 /entrypoint.sh /app/navidrome

# Stay as root for the entrypoint. Running both processes as root inside an
# isolated container is acceptable here — the volume is private and the
# Navidrome data dir lives entirely inside it.

ENTRYPOINT ["/sbin/tini", "--", "/entrypoint.sh"]
