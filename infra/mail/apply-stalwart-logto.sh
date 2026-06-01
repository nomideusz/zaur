#!/usr/bin/env bash
# Wire Stalwart to Logto OIDC (for future Bearer/passkey) while keeping LLDAP as the
# active auth directory for password sign-in on every mail domain.
#
# Prerequisites:
#   - stalwart-cli on PATH (or /root/.cargo/bin/stalwart-cli)
#   - STALWART_URL, STALWART_USER, STALWART_PASSWORD (or STALWART_TOKEN)
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

if [[ -z "${STALWART_URL:-}" ]]; then
	echo "STALWART_URL is required" >&2
	exit 1
fi

existing_oidc="$("$CLI" query Directory 2>/dev/null | awk '/Oidc/ { print $1; exit }' || true)"
existing_ldap="$("$CLI" query Directory 2>/dev/null | awk '/Ldap/ { print $1; exit }' || true)"

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

if [[ -z "$existing_ldap" ]]; then
	echo "ERROR: LLDAP directory not found in Stalwart. Create it before running this script." >&2
	exit 1
fi
ldap_id="$existing_ldap"

echo "==> OIDC directory id: $oidc_id (reserved for Bearer/passkey)"
echo "==> LLDAP directory id: $ldap_id"
"$CLI" update Directory "$oidc_id" --json '{"requireScopes": {}}' >/dev/null

echo "==> Authentication default → LLDAP (password / JMAP basic auth)"
"$CLI" update Authentication --field "directoryId=$ldap_id"
"$CLI" get Authentication | head -3

echo "==> All mail domains → LLDAP"
while IFS= read -r domain_line; do
	domain_id="${domain_line%% *}"
	domain_name="${domain_line#* }"
	echo "    $domain_name → $ldap_id"
	"$CLI" update Domain "$domain_id" --field "directoryId=$ldap_id"
done < <("$CLI" query Domain | tail -n +2)

echo "==> Done. Verify:"
echo "    $CLI get Authentication   # default directory = LLDAP"
echo "    $CLI query Domain"
echo ""
echo "==> Restart Stalwart so auth picks up directory changes:"
echo "    docker service update --force srv-captain--mail"
