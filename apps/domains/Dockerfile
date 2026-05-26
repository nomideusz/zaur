FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/domains/package.json ./apps/domains/
RUN pnpm install --frozen-lockfile --filter @zaur/domains --prod --ignore-scripts

COPY apps/domains ./apps/domains

WORKDIR /app/apps/domains

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
