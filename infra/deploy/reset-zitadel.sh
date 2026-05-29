#!/usr/bin/env bash
# Wipe Zitadel state for a clean first-instance bootstrap (no mail users on Zitadel yet).
set -euo pipefail

CAPROVER_HOST="${CAPROVER_HOST:-captain.zaur.app}"

echo "==> Stopping Zitadel-related services on $CAPROVER_HOST"
ssh -o BatchMode=yes "root@$CAPROVER_HOST" <<'REMOTE'
set -euo pipefail
for svc in srv-captain--auth srv-captain--auth-login srv-captain--zitadel srv-captain--zitadel-db; do
  docker service rm "$svc" 2>/dev/null || true
done
sleep 8
for vol in captain--zitadel-bootstrap captain--zitadel-db-data captain--auth-bootstrap; do
  docker volume rm -f "$vol" 2>/dev/null || true
done
rm -f /captain/data/zaur-zitadel-secrets.json
echo "Volumes and secrets removed; re-run deploy-zitadel.sh to bootstrap fresh."
REMOTE
