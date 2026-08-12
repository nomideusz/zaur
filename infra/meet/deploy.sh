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
curl -fsSL "$(curl -fsSL https://api.github.com/repos/jitsi/docker-jitsi-meet/releases/latest \
	| grep -oE 'https://[^"]+-docker-jitsi-meet[^"]+\.zip' | head -1)" -o "$TMP_ZIP"

unzip -qo "$TMP_ZIP"
# Archive extracts to a versioned directory; enter the newest one.
STACK_DIR="$(find "$INSTALL_ROOT" -maxdepth 1 -type d -name 'docker-jitsi-meet*' | sort | tail -1)"
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
set_env JVB_ADVERTISE_IPS "$PUBLIC_IP"
set_env JVB_PORT 10000

docker compose pull
docker compose up -d

echo
echo "Jitsi is up (HTTP on :8000). Point the reverse proxy for ${PUBLIC_URL} at 127.0.0.1:8000."
echo "Open UDP/10000 on the host firewall. Then set webmail PUBLIC_JITSI_URL=${PUBLIC_URL}"
