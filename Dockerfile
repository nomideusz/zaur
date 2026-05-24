FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG PUBLIC_JMAP_SERVER_URL=https://mail.zaur.app
ARG PUBLIC_APP_NAME=ZAUR Webmail
ENV PUBLIC_JMAP_SERVER_URL=$PUBLIC_JMAP_SERVER_URL
ENV PUBLIC_APP_NAME=$PUBLIC_APP_NAME

RUN pnpm build
RUN pnpm prune --prod

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV BODY_SIZE_LIMIT=50M

RUN addgroup --system --gid 1001 nodejs && \
	adduser --system --uid 1001 sveltekit

COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER sveltekit

EXPOSE 3000

CMD ["node", "build"]
