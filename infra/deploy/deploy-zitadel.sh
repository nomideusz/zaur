#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

CAPROVER_HOST="${CAPROVER_HOST:-captain.zaur.app}"
PROVISION_SCRIPT="$ROOT/infra/auth/caprover-provision.mjs"

echo "==> Provisioning CapRover apps (zitadel-db, zitadel) on $CAPROVER_HOST"
scp -o BatchMode=yes "$PROVISION_SCRIPT" "root@$CAPROVER_HOST:/tmp/caprover-provision.mjs"
ssh -o BatchMode=yes "root@$CAPROVER_HOST" <<'REMOTE'
set -euo pipefail
CAP=$(docker ps -q -f name=captain-captain | head -1)
docker cp /tmp/caprover-provision.mjs "$CAP:/captain/data/caprover-provision.mjs"
docker exec "$CAP" node /captain/data/caprover-provision.mjs | tee /tmp/zitadel-provision.log
REMOTE

echo "==> Reading deploy tokens from server"
TOKENS=$(ssh -o BatchMode=yes "root@$CAPROVER_HOST" "docker exec \$(docker ps -q -f name=captain-captain | head -1) cat /captain/data/zaur-zitadel-secrets.json")
DB_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['zitadel-db'])" "$TOKENS")
ZITADEL_TOKEN=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['deployTokens']['zitadel'])" "$TOKENS")

deploy_tar() {
	local app="$1"
	local def="$2"
	shift 2
	cp "$def" captain-definition
	trap 'rm -f captain-definition deploy.tar' EXIT
	tar -cf deploy.tar captain-definition "$@"
	curl -fsS -X POST \
		"https://${CAPROVER_HOST}/api/v2/user/apps/appData/${app}?appToken=${2:-}" \
		-F "tarFile=@deploy.tar"
}

echo "==> Deploying zitadel-db (postgres)"
cp "$ROOT/infra/deploy/zitadel-db.captain-definition" captain-definition
tar -cf /tmp/zitadel-db.tar captain-definition
curl -fsS -X POST \
	"https://${CAPROVER_HOST}/api/v2/user/apps/appData/zitadel-db?appToken=${DB_TOKEN}" \
	-F "tarFile=@/tmp/zitadel-db.tar"
rm -f captain-definition /tmp/zitadel-db.tar

echo "==> Deploying zitadel"
cp "$ROOT/infra/deploy/zitadel.captain-definition" captain-definition
tar -cf /tmp/zitadel.tar captain-definition infra/auth/Dockerfile
curl -fsS -X POST \
	"https://${CAPROVER_HOST}/api/v2/user/apps/appData/zitadel?appToken=${ZITADEL_TOKEN}" \
	-F "tarFile=@/tmp/zitadel.tar"
rm -f captain-definition /tmp/zitadel.tar

echo "==> Done. Secrets on server: /captain/data/zaur-zitadel-secrets.json"
