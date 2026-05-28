#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

APP="${1:-}"
if [[ "$APP" != "webmail" && "$APP" != "register" ]]; then
	echo "Usage: $0 webmail|register" >&2
	exit 1
fi

case "$APP" in
webmail)
	CAPROVER_APP=webmail
	DEF=infra/deploy/webmail.captain-definition
	TAR_PATHS=(pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc packages/sprite apps/webmail)
	;;
register)
	CAPROVER_APP=register
	DEF=infra/deploy/register.captain-definition
	TAR_PATHS=(pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc apps/register)
	;;
esac

cp "$DEF" captain-definition
cleanup() {
	rm -f captain-definition deploy.tar
}
trap cleanup EXIT

tar -cf deploy.tar captain-definition "${TAR_PATHS[@]}"

exec caprover deploy --caproverName captain -a "$CAPROVER_APP" -t deploy.tar
