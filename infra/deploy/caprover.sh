#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

APP="${1:-}"
if [[ "$APP" != "webmail" && "$APP" != "register" && "$APP" != "dino" && "$APP" != "dino-archive" && "$APP" != "music" ]]; then
	echo "Usage: $0 webmail|register|dino|dino-archive|music" >&2
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
		pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc packages/ui packages/sprite packages/svelte-calendar apps/webmail
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
dino)
	CAPROVER_APP=dino
	cp infra/deploy/dino.captain-definition captain-definition
	tar -cf deploy.tar captain-definition \
		pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc packages/sprite apps/dinosaurus
	;;
dino-archive)
	CAPROVER_APP=dino-archive
	cp infra/deploy/dino-archive.captain-definition captain-definition
	tar -cf deploy.tar captain-definition \
		pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc apps/dinosaurus/server
	;;
music)
	CAPROVER_APP=music
	cp infra/deploy/music.captain-definition captain-definition
	tar -cf deploy.tar captain-definition apps/dinosaurus
	;;
esac

exec caprover deploy --caproverName captain -a "$CAPROVER_APP" -t deploy.tar
