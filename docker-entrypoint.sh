#!/bin/sh
set -e

bun run db/migrations/migrate.ts

bun run db/seeds/index.ts

echo "🚀 Starting the app..."
bun run start
