FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openldap-clients

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY packages/ui/package.json ./packages/ui/
COPY apps/register/package.json ./apps/register/
RUN pnpm install --frozen-lockfile --filter @zaur/register --prod --ignore-scripts

COPY packages/ui ./packages/ui
COPY apps/register ./apps/register

RUN pnpm --filter @zaur/ui build:css

WORKDIR /app/apps/register

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
