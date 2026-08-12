#!/usr/bin/env bash
# Bootstrap or refresh docker-jitsi-meet on the Contabo host.
# Run from the server (needs docker, curl/wget, unzip). Does not touch webmail.
set -euo pipefail

INSTALL_ROOT="${JITSI_INSTALL_ROOT:-/opt/jitsi}"
CONFIG_ROOT="${JITSI_CONFIG_ROOT:-/opt/jitsi-meet-cfg}"
PUBLIC_URL="${PUBLIC_URL:-https://meet.zaur.app}"
PUBLIC_IP="${JVB_ADVERTISE_IPS:-}"

if [[ -z "$PUBLIC_IP" ]]; then
	echo "Set JVB_ADVERTISE_IPS to the host public IPv4 before running." >&2
	exit 1
fi

mkdir -p "$INSTALL_ROOT" "$CONFIG_ROOT"/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}
cd "$INSTALL_ROOT"

TMP_ZIP="$(mktemp /tmp/jitsi-XXXXXX.zip)"
trap 'rm -f "$TMP_ZIP"' EXIT

echo "Downloading latest docker-jitsi-meet release…"
# Recent releases ship no .zip asset — use the GitHub zipball for the tag.
ZIPBALL_URL="$(curl -fsSL https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest \
	| sed -n 's/.*"zipball_url": "\([^"]*\)".*/\1/p' | head -1)"
if [[ -z "$ZIPBALL_URL" ]]; then
	echo "Could not resolve zipball_url from GitHub releases API." >&2
	exit 1
fi
curl -fsSLL "$ZIPBALL_URL" -o "$TMP_ZIP"

unzip -qo "$TMP_ZIP"
# Zipball extracts as jitsi-docker-jitsi-meet-<sha>/; prefer that, else docker-jitsi-meet*.
STACK_DIR="$(find "$INSTALL_ROOT" -maxdepth 1 -type d \( -name 'jitsi-docker-jitsi-meet*' -o -name 'docker-jitsi-meet*' \) | sort | tail -1)"
if [[ -z "$STACK_DIR" || ! -f "$STACK_DIR/docker-compose.yml" ]]; then
	echo "Extracted release has no docker-compose.yml under $INSTALL_ROOT" >&2
	exit 1
fi
cd "$STACK_DIR"

if [[ ! -f .env ]]; then
	cp env.example .env
	./gen-passwords.sh
fi

set_env() {
	local key="$1" value="$2"
	if grep -qE "^#?${key}=" .env; then
		sed -i -E "s|^#?${key}=.*|${key}=${value}|" .env
	else
		printf '%s=%s\n' "$key" "$value" >> .env
	fi
}

set_env CONFIG "$CONFIG_ROOT"
set_env PUBLIC_URL "$PUBLIC_URL"
set_env TZ Europe/Warsaw
set_env DISABLE_HTTPS 1
set_env ENABLE_HTTP_REDIRECT 0
set_env ENABLE_LETSENCRYPT 0
set_env HTTP_PORT 8000
# Contabo already uses 8443 (nginx); keep compose mapping off that port.
set_env HTTPS_PORT 18443
set_env JVB_ADVERTISE_IPS "$PUBLIC_IP"
set_env JVB_PORT 10000

# Current images run as uid 1000 and need writable CONFIG/storage.
mkdir -p "$CONFIG_ROOT"/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri,storage/prosody}
chown -R 1000:1000 "$CONFIG_ROOT"

docker compose pull
docker compose up -d

echo
echo "Jitsi is up (HTTP on :8000). Point Traefik/Caddy for ${PUBLIC_URL} at 172.17.0.1:8000 (or 127.0.0.1:8000 from the host)."
echo "Open UDP/10000 on the host firewall. Then set webmail PUBLIC_JITSI_URL=${PUBLIC_URL}"
