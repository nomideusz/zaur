#!/usr/bin/env bash
# Configure Logto sign-in for ZAUR register → webmail flow:
#   - Sign in with email + password (not internal usernames)
#   - Sign-up disabled (register app creates users via Management API)
#   - Passkeys optional (users can add later; webmail uses direct password sign-in)
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
  "signUp": {
    "identifiers": ["Email"],
    "password": false,
    "verify": false
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
    "policy": "NoPrompt",
    "organizationRequiredMfaPolicy": "NoPrompt"
  },
  "passkeySignIn": {
    "enabled": true,
    "showPasskeyButton": true,
    "allowAutofill": true
  },
  "forgotPasswordMethods": [],
  "unknownSessionRedirectUrl": "https://webmail.zaur.app/login"
}'

echo "==> PATCH /api/sign-in-exp (email sign-in, email-only sign-up profile, no forced passkey prompt)"
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
print(json.dumps({'signIn': d['signIn'], 'signUp': d.get('signUp'), 'signInMode': d.get('signInMode'), 'mfa': d.get('mfa'), 'passkeySignIn': d.get('passkeySignIn')}, indent=2))
"

echo "==> Backfill Logto usernames for email-only accounts (needed before passkey submit on older tenants)"
curl -sS -H "Authorization: Bearer $M2M_TOKEN" \
	"$LOGTO_ENDPOINT/api/users?page=1&page_size=100" | python3 - <<'PY' "$LOGTO_ENDPOINT" "$M2M_TOKEN"
import json, re, sys, urllib.request

endpoint, token = sys.argv[1], sys.argv[2]
users = json.load(sys.stdin)
if not isinstance(users, list):
    print("skip backfill:", users)
    raise SystemExit(0)

def username_from_email(email: str) -> str:
    local, _, domain = email.lower().partition("@")
    safe_local = re.sub(r"[^a-z0-9_]+", "_", local).strip("_") or "user"
    safe_domain = re.sub(r"[^a-z0-9]+", "_", domain or "mail").strip("_") or "mail"
    return f"{safe_local}_{safe_domain}"[:128]

updated = 0
for user in users:
    if user.get("username") or not user.get("primaryEmail"):
        continue
    username = username_from_email(user["primaryEmail"])
    body = json.dumps({"username": username}).encode()
    req = urllib.request.Request(
        f"{endpoint}/api/users/{user['id']}",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            resp.read()
        updated += 1
        print(f"  username {username} -> {user['primaryEmail']}")
    except Exception as err:
        print(f"  skip {user['primaryEmail']}: {err}", file=sys.stderr)

print(f"==> Backfilled {updated} user(s)")
PY

echo "==> Done"
