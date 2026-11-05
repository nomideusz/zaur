FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/ui/package.json ./packages/ui/
COPY apps/stats/package.json ./apps/stats/
RUN pnpm install --frozen-lockfile --filter @zaur/stats...

# The suite's design system: tokens, primitives and fonts.
COPY packages/ui ./packages/ui
COPY apps/stats ./apps/stats

RUN pnpm --filter @zaur/stats build
RUN pnpm --filter @zaur/stats --prod deploy /out --legacy

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV STATS_DB=/data/stats.db
ENV GEO_DIR=/data/geo

COPY --from=builder /out ./
COPY --from=builder /app/apps/stats/build ./build

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data

EXPOSE 3000

CMD ["node", "build"]
