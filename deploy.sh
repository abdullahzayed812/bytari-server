#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -d "$SCRIPT_DIR/web-dist" ] || [ -z "$(ls -A "$SCRIPT_DIR/web-dist" 2>/dev/null)" ]; then
  echo "❌ web-dist/ is empty. Run the local build script first:"
  echo "   ./build-and-sync.sh <user>@<vps-ip>"
  exit 1
fi

echo "🚀 Starting services..."
cd "$SCRIPT_DIR"
docker compose up -d --build

echo "✅ Deploy complete! Web app is live at https://bytari.vet"
