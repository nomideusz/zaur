FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/mail-core/package.json ./packages/mail-core/
COPY packages/server-auth/package.json ./packages/server-auth/
COPY apps/mail2/package.json ./apps/mail2/
RUN pnpm install --frozen-lockfile --filter @zaur/mail2...

COPY packages/ui ./packages/ui
COPY packages/mail-core ./packages/mail-core
COPY packages/server-auth ./packages/server-auth
COPY apps/mail2 ./apps/mail2

# PUBLIC_* config (PUBLIC_TRACEWAY_DSN) is read at runtime, not baked into the
# build; secrets come from the Dokploy env.
RUN pnpm --filter @zaur/mail2 build
RUN pnpm --filter @zaur/mail2 --prod deploy /out --legacy

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Attachment uploads post binaries of up to 25 MB through /api/upload.
ENV BODY_SIZE_LIMIT=50M
# Same layout as the webmail container on purpose: mount the SAME host
# directory at /app/.data in both services and they read one session store —
# that is what lets mail2 borrow webmail's login (README → Deploying).
ENV STORE_DB_PATH=/app/.data/store.sqlite

RUN addgroup --system --gid 1001 nodejs && \
	adduser --system --uid 1001 sveltekit && \
	mkdir -p /app/.data && \
	chown -R sveltekit:nodejs /app/.data

COPY --from=builder /out ./
COPY --from=builder /app/apps/mail2/build ./build
# The public demo (DEMO_JMAP_URL=http://127.0.0.1:9911, src/lib/server/demo.ts)
# runs over this fake mail server; restarting it every 30 minutes resets the
# sample mailbox. The real client never starts it.
COPY --from=builder /app/apps/mail2/tests/smoke/fake-jmap.mjs ./demo/fake-jmap.mjs

USER sveltekit

EXPOSE 3000

CMD ["sh", "-c", "if [ -n \"$DEMO_JMAP_URL\" ]; then while :; do timeout 1800 node demo/fake-jmap.mjs; done & fi; exec node build"]
