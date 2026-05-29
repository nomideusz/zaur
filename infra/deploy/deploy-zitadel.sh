#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

CAPROVER_HOST="${CAPROVER_HOST:-captain.zaur.app}"
PROVISION_SCRIPT="$ROOT/infra/auth/caprover-provision.js"

echo "==> Provisioning CapRover apps (zitadel-db, auth, auth-login) on $CAPROVER_HOST"
scp -o BatchMode=yes "$PROVISION_SCRIPT" "$ROOT/infra/auth/caprover-auth-nginx.ejs" "root@$CAPROVER_HOST:/tmp/"
ssh -o BatchMode=yes "root@$CAPROVER_HOST" <<'REMOTE'
set -euo pipefail
CAP=$(docker ps -q -f name=captain-captain | head -1)
docker cp /tmp/caprover-provision.js "$CAP:/captain/data/caprover-provision.js"
docker cp /tmp/caprover-auth-nginx.ejs "$CAP:/captain/data/caprover-auth-nginx.ejs"
docker exec "$CAP" node /captain/data/caprover-provision.js 2>&1 | grep -v "Docker API Version Error" | grep -v "Wrapped:" | tee /tmp/zitadel-provision.log || true
REMOTE

echo "==> Reading deploy tokens from server"
TOKENS=$(ssh -o BatchMode=yes "root@$CAPROVER_HOST" "docker exec \$(docker ps -q -f name=captain-captain | head -1) cat /captain/data/zaur-zitadel-secrets.json 2>/dev/null")
DB_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['zitadel-db'])" "$TOKENS")
AUTH_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['auth'])" "$TOKENS")
LOGIN_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['auth-login'])" "$TOKENS")

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

echo "==> Deploying zitadel-db (postgres)"
deploy_app zitadel-db "$ROOT/infra/deploy/zitadel-db.captain-definition" "$DB_TOKEN"

echo "==> Deploying auth (Zitadel API)"
deploy_app auth "$ROOT/infra/deploy/zitadel.captain-definition" "$AUTH_TOKEN" infra/auth/Dockerfile

echo "==> Waiting for login-client PAT bootstrap..."
for i in $(seq 1 30); do
	if ssh -o BatchMode=yes "root@$CAPROVER_HOST" "docker run --rm -v captain--zitadel-bootstrap:/b alpine test -s /b/login-client.pat" 2>/dev/null; then
		echo "login-client.pat ready"
		break
	fi
	sleep 10
done

echo "==> Deploying auth-login (Zitadel Login UI)"
deploy_app auth-login "$ROOT/infra/deploy/auth-login.captain-definition" "$LOGIN_TOKEN"

echo "==> Applying auth nginx routes for /ui/v2/login"
scp -o BatchMode=yes "$ROOT/infra/auth/apply-auth-nginx.js" "$ROOT/infra/auth/caprover-auth-nginx.ejs" "root@$CAPROVER_HOST:/tmp/"
ssh -o BatchMode=yes "root@$CAPROVER_HOST" "CAP=\$(docker ps -q -f name=captain-captain | head -1); docker cp /tmp/apply-auth-nginx.js \"\$CAP:/captain/data/apply-auth-nginx.js\"; docker cp /tmp/caprover-auth-nginx.ejs \"\$CAP:/captain/data/caprover-auth-nginx.ejs\"; docker exec \"\$CAP\" node /captain/data/apply-auth-nginx.js"

echo "==> Done. Secrets: /captain/data/zaur-zitadel-secrets.json on server"
