#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

CAPROVER_HOST="${CAPROVER_HOST:-captain.zaur.app}"
PROVISION_SCRIPT="$ROOT/infra/auth/caprover-provision.js"

echo "==> Provisioning CapRover apps (auth-db, auth, auth-admin) on $CAPROVER_HOST"
scp -o BatchMode=yes "$PROVISION_SCRIPT" "$ROOT/infra/auth/auth-caprover-nginx.ejs" "root@$CAPROVER_HOST:/tmp/"
ssh -o BatchMode=yes "root@$CAPROVER_HOST" <<'REMOTE'
set -euo pipefail
CAP=$(docker ps -q -f name=captain-captain | head -1)
docker cp /tmp/caprover-provision.js "$CAP:/captain/data/caprover-provision.js"
docker cp /tmp/auth-caprover-nginx.ejs "$CAP:/captain/data/auth-caprover-nginx.ejs"
docker exec "$CAP" node /captain/data/caprover-provision.js 2>&1 | grep -v "Docker API Version Error" | grep -v "Wrapped:" | tee /tmp/logto-provision.log || true
REMOTE

echo "==> Reading deploy tokens from server"
TOKENS=$(ssh -o BatchMode=yes "root@$CAPROVER_HOST" "docker exec \$(docker ps -q -f name=captain-captain | head -1) cat /captain/data/zaur-auth-secrets.json 2>/dev/null")
DB_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['auth-db'])" "$TOKENS")
AUTH_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['auth'])" "$TOKENS")
ADMIN_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['auth-admin'])" "$TOKENS")

deploy_app() {
	local app="$1"
	local def="$2"
	local token="$3"
	shift 3
	cp "$def" captain-definition
	tar -cf "/tmp/${app}.tar" captain-definition "$@"
	curl -fsS --max-time 600 -X POST \
		"https://${CAPROVER_HOST}/api/v2/user/apps/appData/${app}" \
		-H "x-captain-app-token: ${token}" \
		-F "sourceFile=@/tmp/${app}.tar"
	rm -f captain-definition "/tmp/${app}.tar"
}

echo "==> Deploying auth-db (postgres)"
deploy_app auth-db "$ROOT/infra/deploy/auth-db.captain-definition" "$DB_TOKEN"

echo "==> Waiting for postgres..."
sleep 20

echo "==> Deploying auth (Logto)"
deploy_app auth "$ROOT/infra/deploy/auth.captain-definition" "$AUTH_TOKEN" infra/auth/Dockerfile

echo "==> Waiting for Logto OIDC..."
for i in $(seq 1 36); do
	if curl -sf "https://auth.zaur.app/oidc/.well-known/openid-configuration" >/dev/null 2>&1; then
		echo "Logto OIDC ready (attempt $i)"
		break
	fi
	echo "attempt $i..."
	sleep 10
done

echo "==> Deploying auth-admin (Logto console proxy)"
deploy_app auth-admin "$ROOT/infra/deploy/auth-admin.captain-definition" "$ADMIN_TOKEN" infra/auth/auth-admin.Dockerfile infra/auth/auth-admin.nginx.conf

echo ""
echo "==> Done"
echo "  OIDC issuer:  https://auth.zaur.app/oidc"
echo "  Admin console: https://auth-admin.zaur.app (create admin account on first visit)"
echo "  Secrets file:  /captain/data/zaur-auth-secrets.json on server"
echo ""
echo "Next: open admin console → create PKCE app for webmail, enable passkey sign-in."
