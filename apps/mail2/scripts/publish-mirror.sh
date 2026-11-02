#!/usr/bin/env bash
# Copies this commit's mail2 build inputs into two-workspaces/webmail, the repo
# for the JMAP Webmail Railway template. Its main moves only on a release, so
# template users are not told about every commit in this monorepo. The paths are
# what apps/mail2/Dockerfile reads; its README is kept there, not overwritten.
# Run from the repo root: publish-mirror.sh <tag> <mirror-url>
set -euo pipefail
tag=$1 url=$2
paths=(LICENSE package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc apps/mail2 packages/ui packages/mail-core packages/server-auth)
sha=$(git rev-parse HEAD)
dir=$(mktemp -d)
git clone --quiet "$url" "$dir"
(cd "$dir" && rm -rf "${paths[@]}")
git archive HEAD "${paths[@]}" | tar -x -C "$dir"
cd "$dir"
git add -A
# Nothing new means a re-run after this step already succeeded.
git diff --cached --quiet && exit 0
git -c user.name="Zaur release" -c user.email=noreply@zaur.app commit --quiet -m "$tag" -m "From nomideusz/zaur@$sha"
git tag "$tag"
git push --quiet origin HEAD:main "refs/tags/$tag"
