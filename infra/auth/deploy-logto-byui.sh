#!/usr/bin/env bash
# Deploy a custom Logto sign-in UI (Bring Your Own UI).
#
# Self-hosted Logto OSS requires object storage before BYUI works
# (API error: storage.not_configured). Configure S3-compatible storage in
# Logto env first, or use Console branding via configure-logto-signin.sh.
#
# Prerequisites:
#   - Built experience assets in DIST_PATH (index.html at zip root)
#   - LOGTO_ENDPOINT, LOGTO_M2M_CLIENT_ID, LOGTO_M2M_CLIENT_SECRET
#
# Build from official Logto experience (recommended):
#   git clone https://github.com/logto-io/logto.git /tmp/logto
#   cd /tmp/logto/packages/experience
#   pnpm install && pnpm build
#   DIST_PATH=/tmp/logto/packages/experience/dist ./infra/auth/deploy-logto-byui.sh
#
# Usage:
#   export LOGTO_ENDPOINT=https://auth.zaur.app
#   export LOGTO_M2M_CLIENT_ID=...
#   export LOGTO_M2M_CLIENT_SECRET=...
#   export LOGTO_API_RESOURCE=https://default.logto.app/api
#   export DIST_PATH=/path/to/experience/dist
#   ./infra/auth/deploy-logto-byui.sh

set -euo pipefail

LOGTO_ENDPOINT="${LOGTO_ENDPOINT:-https://auth.zaur.app}"
LOGTO_ENDPOINT="${LOGTO_ENDPOINT%/}"
LOGTO_API_RESOURCE="${LOGTO_API_RESOURCE:-https://default.logto.app/api}"
DIST_PATH="${DIST_PATH:-}"

for var in LOGTO_M2M_CLIENT_ID LOGTO_M2M_CLIENT_SECRET DIST_PATH; do
	if [[ -z "${!var:-}" ]]; then
		echo "$var is required" >&2
		exit 1
	fi
done

if [[ ! -f "$DIST_PATH/index.html" ]]; then
	echo "DIST_PATH must contain index.html (Logto experience build output)" >&2
	exit 1
fi

ZIP_FILE="$(mktemp /tmp/zaur-logto-ui-XXXXXX.zip)"
trap 'rm -f "$ZIP_FILE"' EXIT

(
	cd "$DIST_PATH"
	zip -qr "$ZIP_FILE" .
)

echo "==> Requesting M2M token"
M2M_TOKEN="$(
	curl -sS -u "$LOGTO_M2M_CLIENT_ID:$LOGTO_M2M_CLIENT_SECRET" \
		-H 'Content-Type: application/x-www-form-urlencoded' \
		-d "grant_type=client_credentials&resource=${LOGTO_API_RESOURCE}&scope=all" \
		"$LOGTO_ENDPOINT/oidc/token" | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])'
)"

echo "==> Upload custom UI to $LOGTO_ENDPOINT"
curl -sS -X POST \
	-H "Authorization: Bearer $M2M_TOKEN" \
	-F "file=@${ZIP_FILE};type=application/zip" \
	"$LOGTO_ENDPOINT/api/sign-in-exp/default/custom-ui-assets" | python3 -m json.tool

echo "==> Done"
