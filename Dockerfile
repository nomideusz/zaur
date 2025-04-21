FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the app
RUN pnpm build

# Expose port 3000 for the app
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV RETHINKDB_HOST=rethink.zaur.app
ENV RETHINKDB_PORT=28015
ENV RETHINKDB_DB=zaur_news

# Create startup script
RUN echo '#!/bin/sh\n\
echo "Running database migrations and setup..."\n\
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/json-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT\n\
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/migrations/news-to-rethinkdb.ts --host=$RETHINKDB_HOST --port=$RETHINKDB_PORT\n\
node --experimental-specifier-resolution=node --loader ts-node/esm src/lib/server/create-indexes.ts\n\
echo "Starting the application..."\n\
exec node build/index.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Command to run the application with database migration
CMD ["/app/start.sh"] 