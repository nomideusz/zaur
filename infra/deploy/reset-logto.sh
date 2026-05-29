#!/usr/bin/env bash
# Remove Logto + legacy Zitadel CapRover services and volumes.
set -euo pipefail

CAPROVER_HOST="${CAPROVER_HOST:-captain.zaur.app}"

echo "==> Stopping auth services on $CAPROVER_HOST"
ssh -o BatchMode=yes "root@$CAPROVER_HOST" <<'REMOTE'
set -euo pipefail
for svc in \
  srv-captain--auth \
  srv-captain--auth-login \
  srv-captain--auth-admin \
  srv-captain--auth-db \
  srv-captain--zitadel-db; do
  docker service rm "$svc" 2>/dev/null || true
done
sleep 8
for vol in \
  captain--auth-db-data \
  captain--zitadel-bootstrap \
  captain--zitadel-db-data \
  captain--auth-bootstrap; do
  docker volume rm -f "$vol" 2>/dev/null || true
done
rm -f /captain/data/zaur-auth-secrets.json /captain/data/zaur-zitadel-secrets.json
echo "Volumes and secrets removed; re-run deploy-logto.sh to bootstrap fresh."
REMOTE
