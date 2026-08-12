#!/usr/bin/env bash
# Bootstrap or refresh Galene on the Contabo host.
# Run from this directory (needs docker, openssl). Does not touch webmail.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_ROOT="${GALENE_INSTALL_ROOT:-/opt/galene}"
PUBLIC_URL="${PUBLIC_URL:-https://meet.zaur.app}"
PUBLIC_IP="${PUBLIC_IP:-${JVB_ADVERTISE_IPS:-}}"
CANONICAL_HOST="${PUBLIC_URL#https://}"
CANONICAL_HOST="${CANONICAL_HOST#http://}"
CANONICAL_HOST="${CANONICAL_HOST%%/*}"

if [[ -z "$PUBLIC_IP" ]]; then
	echo "Set PUBLIC_IP to the host public IPv4 before running." >&2
	exit 1
fi

mkdir -p "$INSTALL_ROOT"/{data,groups,recordings}
cp "$SCRIPT_DIR/Dockerfile" "$SCRIPT_DIR/docker-compose.yml" "$INSTALL_ROOT/"

PASSWORD_FILE="$INSTALL_ROOT/data/admin-password"
if [[ ! -f "$PASSWORD_FILE" ]]; then
	openssl rand -hex 24 > "$PASSWORD_FILE"
	chmod 600 "$PASSWORD_FILE"
fi
ADMIN_PASSWORD="$(tr -d '\n' < "$PASSWORD_FILE")"

CONFIG_FILE="$INSTALL_ROOT/data/config.json"
if [[ ! -f "$CONFIG_FILE" ]]; then
	cat > "$CONFIG_FILE" <<EOF
{
  "canonicalHost": "${CANONICAL_HOST}",
  "proxyURL": "${PUBLIC_URL%/}/",
  "writableGroups": true,
  "users": {
    "admin": {
      "password": "${ADMIN_PASSWORD}",
      "permissions": "admin"
    }
  }
}
EOF
	chmod 600 "$CONFIG_FILE"
fi

chown -R 1000:1000 "$INSTALL_ROOT/data" "$INSTALL_ROOT/groups" "$INSTALL_ROOT/recordings"

cd "$INSTALL_ROOT"
PUBLIC_IP="$PUBLIC_IP" docker compose build
PUBLIC_IP="$PUBLIC_IP" docker compose up -d

echo
echo "Galene is up (HTTP on :8000). Point Traefik/Caddy for ${PUBLIC_URL} at 172.17.0.1:8000 (or 127.0.0.1:8000 from the host)."
echo "Open UDP/10000 and TCP+UDP/1194 on the host firewall."
echo
echo "Webmail env:"
echo "  PUBLIC_GALENE_URL=${PUBLIC_URL}"
echo "  GALENE_ADMIN_USER=admin"
echo "  GALENE_ADMIN_PASSWORD=${ADMIN_PASSWORD}"
