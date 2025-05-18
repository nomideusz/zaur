FROM node:18-alpine

WORKDIR /app

# Install dependencies and build tools
RUN apk add --no-cache python3 make g++ build-base sqlite sqlite-dev git curl iputils

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies with explicit handling of native modules
RUN pnpm add -D node-gyp && \
    pnpm config set registry https://registry.npmjs.org/ && \
    pnpm config set node-linker hoisted && \
    pnpm config set --global node_gyp $(npm prefix -g)/lib/node_modules/node-gyp/bin/node-gyp.js && \
    pnpm install --frozen-lockfile

# Create directories for SQLite data
RUN mkdir -p /app/data

# Copy the rest of the application
COPY . .

# Make the start script executable
RUN chmod +x /app/start.sh

# Build the app
RUN pnpm build

# Ensure native modules are built correctly
RUN cd node_modules/better-sqlite3 && \
    npm run build-release

# Expose port 3000 for the app
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV RETHINKDB_HOST=10.0.1.57
ENV RETHINKDB_PORT=28015
ENV RETHINKDB_DB=zaur_news
ENV RUN_MIGRATIONS=false
ENV GNEWS_API_KEY=cc03f767a7e5ad02b401b8e599212b99

# Command to run the application with database migration
CMD ["/app/start.sh"] 