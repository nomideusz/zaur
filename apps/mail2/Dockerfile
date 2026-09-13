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

# PUBLIC_* config is $env/dynamic/public — read at runtime, not baked into the
# build. mail2 reads no PUBLIC_* vars today; secrets come from the Dokploy env.
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

USER sveltekit

EXPOSE 3000

CMD ["node", "build"]
