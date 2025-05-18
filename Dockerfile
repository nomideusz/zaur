FROM node:18-alpine

WORKDIR /app

# Install dependencies and build tools
RUN apk add --no-cache python3 make g++ build-base sqlite sqlite-dev git curl iputils

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Configure for native modules
RUN echo '{"pnpm":{"onlyBuiltDependencies":["better-sqlite3","sqlite3"]}}' > .npmrc

# Install dependencies with specific flags for better-sqlite3
RUN npm install better-sqlite3 --build-from-source && pnpm install

# Create directories for SQLite data
RUN mkdir -p /app/data

# Copy the rest of the application
COPY . .

# Make the start script executable
RUN chmod +x /app/start.sh

# Build the app
RUN pnpm build

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
ENV BETTER_SQLITE3_FORCE_LOAD=true

# Command to run the application with database migration
CMD ["/app/start.sh"] 