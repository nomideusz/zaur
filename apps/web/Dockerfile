FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/ui/package.json ./packages/ui/
COPY packages/sprite/package.json ./packages/sprite/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --filter @zaur/web...

COPY packages/ui ./packages/ui
COPY packages/sprite ./packages/sprite
COPY apps/web ./apps/web

RUN pnpm --filter @zaur/web build
RUN pnpm --filter @zaur/web --prod deploy /out --legacy

# Copy the prerendered site into the production deployment folder.
RUN cp -r apps/web/dist /out/dist

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4173

COPY --from=builder /out ./

EXPOSE 4173

CMD ["node", "static-server.mjs"]
