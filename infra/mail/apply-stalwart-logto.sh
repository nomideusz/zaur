#!/usr/bin/env bash
# Wire Stalwart to Logto OIDC for JMAP Bearer auth (webmail passkeys).
# Keeps LLDAP as the domain directory for password auth (IMAP/SMTP/register mailbox setup).
#
# Prerequisites:
#   - stalwart-cli on PATH (or /root/.cargo/bin/stalwart-cli)
#   - STALWART_URL, STALWART_USER, STALWART_PASSWORD (or STALWART_TOKEN)
#   - Stalwart 0.16.1+ (domain-scoped OIDC for HTTP Bearer)
#
# Usage (on CapRover host):
#   export STALWART_URL=https://mail.zaur.app
#   export STALWART_USER=admin
#   export STALWART_PASSWORD='...'
#   ./infra/mail/apply-stalwart-logto.sh

set -euo pipefail

CLI="${STALWART_CLI:-/root/.cargo/bin/stalwart-cli}"
LOGTO_ISSUER="${LOGTO_ISSUER:-https://auth.zaur.app/oidc}"
LOGTO_DIR_DESC="${LOGTO_DIR_DESC:-Logto (auth.zaur.app)}"
# Comma-separated domain names to attach to the Logto OIDC directory (Bearer/JMAP).
OIDC_DOMAINS="${OIDC_DOMAINS:-zaur.app}"

if [[ -z "${STALWART_URL:-}" ]]; then
	echo "STALWART_URL is required" >&2
	exit 1
fi

existing_oidc="$("$CLI" query Directory 2>/dev/null | awk '/Oidc/ { print $1; exit }' || true)"

if [[ -n "$existing_oidc" ]]; then
	oidc_id="$existing_oidc"
	echo "==> Updating existing OIDC directory $oidc_id"
	"$CLI" update Directory "$oidc_id" \
		--field "description=$LOGTO_DIR_DESC" \
		--field "issuerUrl=$LOGTO_ISSUER" \
		--field claimUsername=email \
		--field claimName=name \
		--field requireAudience=null
else
	echo "==> Creating Logto OIDC directory"
	oidc_id="$("$CLI" create Directory/Oidc \
		--field "description=$LOGTO_DIR_DESC" \
		--field "issuerUrl=$LOGTO_ISSUER" \
		--field claimUsername=email \
		--field claimName=name \
		--field requireAudience=null \
		| awk '/Created Directory/ { print $3 }')"
fi

echo "==> OIDC directory id: $oidc_id"
# API-resource JWTs from Logto omit OIDC scope claims; don't require openid/email here.
"$CLI" update Directory "$oidc_id" --json '{"requireScopes": {}}' >/dev/null
echo "==> HTTP Bearer auth uses Logto OIDC as default directory"
"$CLI" update Authentication --field "directoryId=$oidc_id"
"$CLI" get Authentication | head -3

# Domain directories stay on LLDAP for password/IMAP auth (register mailbox setup too).
# Only the Authentication default switches to Logto for opaque Bearer tokens on HTTP/JMAP.
echo "==> Skipping domain→OIDC remap (LLDAP remains on domains for password auth)"

echo "==> Done. Verify:"
echo "    $CLI query Directory"
echo "    $CLI get Domain <id>   # Directory should show Logto"
echo "    $CLI get Authentication # default directory should be Logto OIDC (JMAP Bearer)"
echo "    LLDAP directory remains for IMAP/SMTP password bind via domain routing"
echo ""
echo "==> Restart Stalwart so HTTP Bearer picks up the new default directory:"
echo "    docker service update --force srv-captain--mail"
