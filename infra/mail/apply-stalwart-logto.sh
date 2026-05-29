#!/usr/bin/env bash
# Wire Stalwart to Logto OIDC for JMAP Bearer auth (webmail passkeys).
# Keeps LLDAP as the default password directory (IMAP/SMTP/app passwords).
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
echo "==> Authentication stays on LLDAP (password / app-password clients)"
"$CLI" get Authentication | head -3

IFS=',' read -ra DOMAINS <<< "$OIDC_DOMAINS"
for domain_name in "${DOMAINS[@]}"; do
	domain_name="${domain_name// /}"
	[[ -z "$domain_name" ]] && continue
	domain_id="$("$CLI" query Domain 2>/dev/null | awk -v d="$domain_name" '$0 ~ d { print $1; exit }')"
	if [[ -z "$domain_id" ]]; then
		echo "WARN: domain not found: $domain_name" >&2
		continue
	fi
	echo "==> Domain $domain_name ($domain_id) → OIDC directory $oidc_id"
	"$CLI" update Domain "$domain_id" --field "directoryId=$oidc_id"
done

echo "==> Done. Verify:"
echo "    $CLI query Directory"
echo "    $CLI get Domain <id>   # Directory should show Logto"
echo "    $CLI get Authentication # should still show LLDAP"
