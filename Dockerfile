# Dockerfile
FROM oven/bun:1.2-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY package.json bun.lock* ./
RUN bun install

RUN bun add hono-rate-limiter

COPY . .

RUN mkdir -p uploads

# Make entrypoint executable
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
