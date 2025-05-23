FROM node:18-alpine

WORKDIR /app

# Install dependencies and build tools including PostgreSQL client
RUN apk add --no-cache python3 make g++ build-base git curl iputils postgresql-client

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies and additional development tools
RUN pnpm install
RUN pnpm add -D ts-node

# Copy the rest of the application
COPY . .

# Make the start script executable
RUN chmod +x /app/start.sh

# Build the app
RUN pnpm build --verbose

# Expose port 3000 for the app
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production
# PostgreSQL connection details - these will be overridden by CapRover environment variables
ENV POSTGRES_HOST=srv-captain--postgres
ENV POSTGRES_PORT=5432
ENV POSTGRES_DB=zaur_news
ENV POSTGRES_USER=postgres
# API keys and passwords should be provided via environment variables
ENV RUN_MIGRATIONS=true

# Command to run the application with database migration
CMD ["/app/start.sh"] 