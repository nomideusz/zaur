FROM node:18-alpine

WORKDIR /app

# Install dependencies including ping (iputils for ping)
RUN apk add --no-cache iputils && npm install -g pnpm

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    sqlite3 \
    libsqlite3-dev

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# After npm install
RUN npm rebuild better-sqlite3 --build-from-source

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

# Command to run the application with database migration
CMD ["/app/start.sh"] 