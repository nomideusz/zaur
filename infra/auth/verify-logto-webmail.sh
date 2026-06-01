#!/usr/bin/env bash
# Verify the webmail OAuth app exists in Logto and accepts authorization requests.
#
# Usage:
#   export LOGTO_ENDPOINT=https://auth.zaur.app
#   export OAUTH_CLIENT_ID=<webmail-app-id>
#   export OAUTH_CLIENT_SECRET=<webmail-app-secret>   # optional check
#   ./infra/auth/verify-logto-webmail.sh

set -euo pipefail

LOGTO_ENDPOINT="${LOGTO_ENDPOINT:-https://auth.zaur.app}"
LOGTO_ENDPOINT="${LOGTO_ENDPOINT%/}"
OAUTH_CLIENT_ID="${OAUTH_CLIENT_ID:?OAUTH_CLIENT_ID is required}"
REDIRECT_URI="${OAUTH_REDIRECT_URI:-https://webmail.zaur.app/oauth/callback}"
CHALLENGE="E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

echo "==> Checking authorization endpoint for client $OAUTH_CLIENT_ID"
RESP=$(curl -sS -o /tmp/logto-auth-check.body -w '%{http_code}' \
	"${LOGTO_ENDPOINT}/oidc/auth?response_type=code&client_id=${OAUTH_CLIENT_ID}&redirect_uri=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))' "$REDIRECT_URI")&scope=openid&state=verify&code_challenge=${CHALLENGE}&code_challenge_method=S256&prompt=login")

if [[ "$RESP" == "303" ]] || [[ "$RESP" == "302" ]]; then
	echo "OK: client is registered (HTTP $RESP)"
	exit 0
fi

echo "FAIL: HTTP $RESP"
cat /tmp/logto-auth-check.body
echo
exit 1
