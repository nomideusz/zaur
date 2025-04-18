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

# Set environment variable
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "build/index.js"] 