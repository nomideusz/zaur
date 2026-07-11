FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/sprite/package.json ./packages/sprite/
COPY packages/mail-core/package.json ./packages/mail-core/
COPY apps/webmail/package.json ./apps/webmail/
RUN pnpm install --frozen-lockfile --filter @zaur/webmail...

COPY packages/ui ./packages/ui
COPY packages/sprite ./packages/sprite
COPY packages/mail-core ./packages/mail-core
COPY apps/webmail ./apps/webmail

# PUBLIC_* config is $env/dynamic/public — read at runtime, not baked into the
# build. Set PUBLIC_JMAP_SERVER_URL / PUBLIC_APP_NAME on the container instead.
RUN pnpm --filter @zaur/webmail build
RUN pnpm --filter @zaur/webmail --prod deploy /out --legacy

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BODY_SIZE_LIMIT=50M
ENV PUSH_SUBSCRIPTIONS_PATH=/app/.data/push-subscriptions.json
ENV STORE_DB_PATH=/app/.data/store.sqlite

RUN addgroup --system --gid 1001 nodejs && \
	adduser --system --uid 1001 sveltekit && \
	mkdir -p /app/.data && \
	chown -R sveltekit:nodejs /app/.data

COPY --from=builder /out ./
COPY --from=builder /app/apps/webmail/build ./build

USER sveltekit

EXPOSE 3000

CMD ["node", "build"]
