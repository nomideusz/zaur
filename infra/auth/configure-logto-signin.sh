#!/usr/bin/env bash
# Configure Logto sign-in for ZAUR register → webmail flow:
#   - Sign in with email + password (not internal usernames)
#   - Sign-up disabled (register app creates users via Management API)
#   - Prompt new users to enroll a passkey after first password sign-in
#
# Prerequisites:
#   LOGTO_ENDPOINT, LOGTO_M2M_CLIENT_ID, LOGTO_M2M_CLIENT_SECRET, LOGTO_API_RESOURCE
#   (same M2M app as apps/register)
#
# Usage:
#   export LOGTO_ENDPOINT=https://auth.zaur.app
#   export LOGTO_M2M_CLIENT_ID=...
#   export LOGTO_M2M_CLIENT_SECRET=...
#   export LOGTO_API_RESOURCE=https://default.logto.app/api
#   ./infra/auth/configure-logto-signin.sh

set -euo pipefail

LOGTO_ENDPOINT="${LOGTO_ENDPOINT:-https://auth.zaur.app}"
LOGTO_ENDPOINT="${LOGTO_ENDPOINT%/}"
LOGTO_API_RESOURCE="${LOGTO_API_RESOURCE:-https://default.logto.app/api}"

for var in LOGTO_M2M_CLIENT_ID LOGTO_M2M_CLIENT_SECRET; do
	if [[ -z "${!var:-}" ]]; then
		echo "$var is required" >&2
		exit 1
	fi
done

echo "==> Requesting M2M token from $LOGTO_ENDPOINT"
M2M_TOKEN="$(
	curl -sS -u "$LOGTO_M2M_CLIENT_ID:$LOGTO_M2M_CLIENT_SECRET" \
		-H 'Content-Type: application/x-www-form-urlencoded' \
		-d "grant_type=client_credentials&resource=${LOGTO_API_RESOURCE}&scope=all" \
		"$LOGTO_ENDPOINT/oidc/token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])'
)"

PATCH='{
  "signIn": {
    "methods": [
      {
        "identifier": "email",
        "password": true,
        "verificationCode": false,
        "isPasswordPrimary": true
      }
    ]
  },
  "signInMode": "SignIn",
  "color": {
    "primaryColor": "#2563EB",
    "isDarkModeEnabled": false,
    "darkPrimaryColor": "#3B82F6"
  },
  "branding": {
    "logoUrl": "https://webmail.zaur.app/pwa-192x192.png",
    "darkLogoUrl": "https://webmail.zaur.app/pwa-192x192.png"
  },
  "mfa": {
    "factors": ["WebAuthn"],
    "policy": "PromptAtSignInAndSignUp",
    "organizationRequiredMfaPolicy": "NoPrompt"
  }
}'

echo "==> PATCH /api/sign-in-exp (email sign-in + passkey enrollment prompt)"
curl -sS -X PATCH \
	-H "Authorization: Bearer $M2M_TOKEN" \
	-H 'Content-Type: application/json' \
	-d "$PATCH" \
	"$LOGTO_ENDPOINT/api/sign-in-exp" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if 'signIn' not in d:
    print(d, file=sys.stderr)
    raise SystemExit(1)
print(json.dumps({'signIn': d['signIn'], 'signInMode': d.get('signInMode'), 'mfa': d.get('mfa')}, indent=2))
"

echo "==> Done"
