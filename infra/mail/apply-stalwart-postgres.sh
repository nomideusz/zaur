#!/usr/bin/env bash
# Hybrid Stalwart auth for ZAUR:
#   - Authentication default → Logto OIDC (JMAP Bearer / passkey tokens)
#   - Every mail domain → PostgreSQL (password / basic auth)
#
# Prerequisites:
#   - stalwart-cli on PATH (or /root/.cargo/bin/stalwart-cli)
#   - STALWART_URL, STALWART_USER, STALWART_PASSWORD (or STALWART_TOKEN)
#
# Usage (on CapRover host):
#   export STALWART_URL=https://mail.zaur.app
#   export STALWART_USER=admin
#   export STALWART_PASSWORD='...'
#   ./infra/mail/apply-stalwart-postgres.sh

set -euo pipefail

CLI="${STALWART_CLI:-/root/.cargo/bin/stalwart-cli}"
LOGTO_ISSUER="${LOGTO_ISSUER:-https://auth.zaur.app/oidc}"
LOGTO_DIR_DESC="${LOGTO_DIR_DESC:-Logto (auth.zaur.app)}"
PG_HOST="${PG_HOST:-srv-captain--auth-db}"
PG_PORT="${PG_PORT:-5432}"
PG_DB="${PG_DB:-stalwart_auth}"
PG_USER="${PG_USER:-postgres}"
PG_PASS="${PG_PASS:-SE3sGjIeN-tl3BHcNBWog4Qx}"

if [[ -z "${STALWART_URL:-}" ]]; then
	echo "STALWART_URL is required" >&2
	exit 1
fi

existing_oidc="$("$CLI" query Directory 2>/dev/null | awk '/Oidc/ { print $1; exit }' || true)"
existing_sql="$("$CLI" query Directory 2>/dev/null | awk '/Sql/ { print $1; exit }' || true)"

# 1. Create or Update OIDC directory
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

# 2. Create or Update SQL directory
store_payload="{
  \"@type\": \"PostgreSql\",
  \"host\": \"$PG_HOST\",
  \"port\": $PG_PORT,
  \"database\": \"$PG_DB\",
  \"authUsername\": \"$PG_USER\",
  \"authSecret\": {
    \"@type\": \"Value\",
    \"secret\": \"$PG_PASS\"
  }
}"

if [[ -n "$existing_sql" ]]; then
	sql_id="$existing_sql"
	echo "==> Updating existing SQL directory $sql_id"
	"$CLI" update Directory "$sql_id" \
		--field "description=PostgreSQL Auth" \
		--field "columnEmail=name" \
		--field "columnSecret=secret" \
		--field "queryLogin=SELECT name, secret FROM accounts WHERE name = \$1" \
		--field "queryRecipient=SELECT name, secret FROM accounts WHERE name = \$1 AND active = true" \
		--field "store=$store_payload"
else
	echo "==> Creating SQL directory"
	sql_id="$("$CLI" create Directory/Sql \
		--field "description=PostgreSQL Auth" \
		--field "columnEmail=name" \
		--field "columnSecret=secret" \
		--field "queryLogin=SELECT name, secret FROM accounts WHERE name = \$1" \
		--field "queryRecipient=SELECT name, secret FROM accounts WHERE name = \$1 AND active = true" \
		--field "store=$store_payload" \
		| awk '/Created Directory/ { print $3 }')"
fi

echo "==> OIDC directory id: $oidc_id"
echo "==> SQL directory id:  $sql_id"

# Ensure scopes are correct for OIDC
"$CLI" update Directory "$oidc_id" --json '{"requireScopes": {}}' >/dev/null

# Set secure, non-permanent IP ban durations in Security config (1 hour in milliseconds)
# Disable IP ban rates to prevent active devices with stale credentials from triggering immediate lockouts.
echo "==> Configuring Security IP ban settings"
"$CLI" update Security --field authBanRate=null --field abuseBanRate=null --field loiterBanRate=null --field scanBanRate=null --field authBanPeriod=3600000 --field abuseBanPeriod=3600000 --field loiterBanPeriod=3600000 --field scanBanPeriod=3600000


# 3. Set global default authentication to OIDC
echo "==> Authentication default → Logto OIDC (Bearer tokens)"
"$CLI" update Authentication --field "directoryId=$oidc_id"
"$CLI" get Authentication | head -3

# 4. Set all mail domains to use the SQL directory for basic auth
echo "==> All mail domains → PostgreSQL SQL Directory"
while IFS= read -r domain_line; do
	domain_id="${domain_line%% *}"
	domain_name="${domain_line#* }"
	echo "    $domain_name → $sql_id"
	"$CLI" update Domain "$domain_id" --field "directoryId=$sql_id"
done < <("$CLI" query Domain | tail -n +2)

echo "==> Done. Verify:"
echo "    $CLI get Authentication"
echo "    $CLI query Domain"
echo ""
echo "==> Restart Stalwart so auth picks up directory changes:"
echo "    docker service update --force srv-captain--mail"
