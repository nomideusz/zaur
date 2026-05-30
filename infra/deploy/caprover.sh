#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

APP="${1:-}"
if [[ "$APP" != "webmail" && "$APP" != "register" ]]; then
	echo "Usage: $0 webmail|register" >&2
	exit 1
fi

cleanup() {
	rm -f captain-definition deploy.tar
}
trap cleanup EXIT

case "$APP" in
webmail)
	CAPROVER_APP=webmail
	cp infra/deploy/webmail.captain-definition captain-definition
	tar -cf deploy.tar captain-definition \
		pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc packages/ui packages/sprite apps/webmail
	;;
register)
	CAPROVER_APP=register
	pnpm --filter @zaur/ui build:css
	tar -cf deploy.tar \
		--exclude=node_modules \
		--exclude=.data \
		--exclude=test-results \
		--exclude=playwright-report \
		-C apps/register .
	;;
esac

exec caprover deploy --caproverName captain -a "$CAPROVER_APP" -t deploy.tar
