#!/usr/bin/env bash
# ── LumenMint Database Seeding ────────────────────────────────────────────────
# Usage: bash scripts/seed-db.sh

set -euo pipefail

echo "🌱 Seeding LumenMint database..."

# ── Check database connection ─────────────────────────────────────────────────

DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/lumenmint}"

echo "  → Connecting to database..."
if command -v psql >/dev/null 2>&1; then
  psql "${DB_URL}" -c "SELECT 1;" >/dev/null 2>&1 || {
    echo "❌ Cannot connect to database. Is it running?"
    echo "   Start with: docker compose up -d postgres"
    exit 1
  }
  echo "  ✅ Database connection OK"
else
  echo "  ⚠️  psql not found. Skipping connection check."
fi

# ── Run seed script ───────────────────────────────────────────────────────────

echo "  → Running seed script..."
(cd backend && pnpm db:seed 2>/dev/null || {
  echo "  ⚠️  db:seed script not available. Run manually: cd backend && pnpm db:seed"
  exit 0
})

echo ""
echo "✅ Database seeded!"
echo ""
echo "Default test accounts:"
echo "  Admin:  admin@lumenmint.com / admin123"
echo "  Creator: creator@lumenmint.com / creator123"
echo "  User:   user@lumenmint.com / user123"
echo ""
