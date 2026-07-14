#!/usr/bin/env bash
# ── LumenMint Dev Environment Setup ───────────────────────────────────────────
# Usage: bash scripts/setup-dev.sh

set -euo pipefail

echo "🔧 Setting up Stellar LumenMint development environment..."

# ── Check prerequisites ───────────────────────────────────────────────────────

command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required. Install: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker not found — some services require Docker"; }
command -v rustc >/dev/null 2>&1 || { echo "⚠️  Rust not found — Soroban contracts require Rust"; }

echo "✅ Prerequisites checked"

# ── Install dependencies ──────────────────────────────────────────────────────

echo ""
echo "📦 Installing dependencies..."

# Backend
echo "  → backend"
(cd backend && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

# Frontend
echo "  → frontend"
(cd frontend && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

# Mobile
echo "  → mobile-app"
(cd mobile-app && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

# Admin
echo "  → admin"
(cd admin && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

# Packages
echo "  → packages/shared-types"
(cd packages/shared-types && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

echo "  → packages/sdk"
(cd packages/sdk && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

echo "  → packages/cli"
(cd packages/cli && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

echo "  → packages/ai"
(cd packages/ai && pnpm install --frozen-lockfile 2>/dev/null || pnpm install) &

wait

echo "✅ Dependencies installed"

# ── Environment files ─────────────────────────────────────────────────────────

echo ""
echo "📝 Setting up environment files..."

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env 2>/dev/null || cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lumenmint
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-change-in-production
HORIZON_URL=https://horizon-testnet.stellar.org
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=dev-key
PORT=3000
NODE_ENV=development
EOF
  echo "  → backend/.env created"
fi

if [ ! -f frontend/.env.local ]; then
  cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3000/graphql
EOF
  echo "  → frontend/.env.local created"
fi

echo "✅ Environment files ready"

# ── Build packages ────────────────────────────────────────────────────────────

echo ""
echo "🔨 Building shared packages..."
(cd packages/shared-types && pnpm build 2>/dev/null || echo "  ⚠️  shared-types build skipped (tsc not configured)")
(cd packages/sdk && pnpm build 2>/dev/null || echo "  ⚠️  sdk build skipped (tsc not configured)")
(cd packages/cli && pnpm build 2>/dev/null || echo "  ⚠️  cli build skipped (tsc not configured)")

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "🎉 Development environment is ready!"
echo ""
echo "Quick start:"
echo "  docker compose up -d              # Start Postgres + Redis"
echo "  cd backend && pnpm start:dev      # Start API server"
echo "  cd frontend && pnpm dev           # Start frontend"
echo ""
