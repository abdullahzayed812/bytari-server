# Use Bun base image
FROM oven/bun:1.2-alpine

# Set working directory
WORKDIR /app

# Install curl and any other dependencies
RUN apk add --no-cache curl

# Copy dependency files first (for caching)
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Install additional packages
RUN bun add hono-rate-limiter

# Copy the rest of the project
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose app port
EXPOSE 3001

# Run migrations, seeds, then start app
# Combine everything into one CMD layer
CMD bun run db/migrations/migrate.ts && \
    bun run db/seeds/index.ts && \
    echo "🚀 Starting the app..." && \
    bun run start
