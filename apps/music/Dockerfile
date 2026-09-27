FROM node:24-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/music/package.json ./apps/music/
RUN pnpm install --frozen-lockfile --filter @zaur/music...

# Music wears mail2's design system: its tokens, primitives and fonts.
COPY apps/mail2/src/routes/styles ./apps/mail2/src/routes/styles
COPY apps/music ./apps/music

RUN pnpm --filter @zaur/music build
RUN pnpm --filter @zaur/music --prod deploy /out --legacy

FROM node:24-alpine AS runner

WORKDIR /app

# "Add from YouTube": yt-dlp (with its YouTube challenge solver, run on this
# image's node) and ffmpeg for tagging. yt-dlp is fetched fresh on every
# build, which is how it keeps up with YouTube.
RUN apk add --no-cache ffmpeg python3 py3-pip && \
	pip install --no-cache-dir --break-system-packages "yt-dlp[default]"

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV MUSIC_DIR=/music

COPY --from=builder /out ./
COPY --from=builder /app/apps/music/build ./build

# uid 1000, the owner of the library files on the host.
USER node

EXPOSE 3000

CMD ["node", "build"]
