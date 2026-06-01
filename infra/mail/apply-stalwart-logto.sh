#!/usr/bin/env bash
# Hybrid Stalwart auth for ZAUR:
#   - Authentication default → Logto OIDC (JMAP Bearer / passkey tokens)
#   - Every mail domain → LLDAP (password / JMAP basic auth)
#
# Domains must never use directoryId=null — they would inherit Logto and break passwords.
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

echo "==> OIDC directory id: $oidc_id (Bearer / passkey via auth default)"
echo "==> LLDAP directory id: $ldap_id (password on every domain)"
"$CLI" update Directory "$oidc_id" --json '{"requireScopes": {}}' >/dev/null

echo "==> Authentication default → Logto OIDC (Bearer tokens)"
"$CLI" update Authentication --field "directoryId=$oidc_id"
"$CLI" get Authentication | head -3

echo "==> All mail domains → LLDAP (password — never leave directory unset)"
while IFS= read -r domain_line; do
	domain_id="${domain_line%% *}"
	domain_name="${domain_line#* }"
	echo "    $domain_name → $ldap_id"
	"$CLI" update Domain "$domain_id" --field "directoryId=$ldap_id"
done < <("$CLI" query Domain | tail -n +2)

echo "==> Done. Verify:"
echo "    $CLI get Authentication   # default directory = Logto OIDC"
echo "    $CLI query Domain         # every domain = LLDAP"
echo ""
echo "==> Restart Stalwart so auth picks up directory changes:"
echo "    docker service update --force srv-captain--mail"
