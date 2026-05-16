#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")/mobile"

echo "📦 Building Expo web app..."
docker run --rm \
  -v "${MOBILE_DIR}:/app" \
  -w /app \
  node:20-alpine \
  sh -c "npm ci && npx expo export --platform web"

echo "🚀 Starting services..."
cd "$SCRIPT_DIR"
docker compose up -d --build

echo "✅ Deploy complete! Web app is live at https://bytari.vet"
