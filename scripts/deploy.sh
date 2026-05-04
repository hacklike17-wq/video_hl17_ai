#!/usr/bin/env bash
# Deploy script — chạy TRÊN VPS (sau khi git pull).
# Usage: ./scripts/deploy.sh

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "❌ .env chưa tồn tại. Copy .env.example → .env và điền giá trị trước."
  exit 1
fi

echo "→ Pulling latest code..."
git pull --ff-only

echo "→ Ensuring data dir + perms (container app user is uid 100)..."
mkdir -p data
chown -R 100:101 data

echo "→ Building Docker images..."
docker compose build

echo "→ Starting services..."
docker compose up -d

echo "→ Waiting for app to be ready..."
sleep 5

echo "→ Running DB migrations..."
docker compose run --rm app sh -c "cd /app && npx tsx src/db/migrate.ts"

echo "→ Service status:"
docker compose ps

echo ""
echo "✓ Deploy xong. Kiểm tra logs: docker compose logs -f app"
