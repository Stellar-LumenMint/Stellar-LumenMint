# LumenMint Platform

Production-ready Web3 NFT marketplace and creator platform built on Stellar and Soroban.

## Monorepo Structure

| Workspace | Technology | Purpose |
|---|---|---|
| `backend/` | NestJS + TypeORM + GraphQL | REST + GraphQL API, Soroban integration |
| `frontend/` | Next.js 14 + Tailwind | Web marketplace UI |
| `mobile-app/` | Expo + React Native | iOS/Android wallet and marketplace |
| `admin/` | Vite + React 18 | Admin dashboard |
| `soroban/` | Rust + Soroban SDK | Smart contracts (NFT, marketplace, factory) |
| `packages/` | TypeScript | SDK, CLI, AI utilities, shared types |

## Quick Start

```bash
pnpm install
cd backend && docker-compose up -d && pnpm start:dev
cd frontend && pnpm dev
```

## Documentation

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — Colors, typography, components
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Dev setup, commit conventions
- [QA-RESPONSIVENESS-CHECKLIST.md](./QA-RESPONSIVENESS-CHECKLIST.md) — Mobile testing

## CI/CD

All workspaces have automated CI (lint, typecheck, test, build) via GitHub Actions. See [.github/workflows/README.md](.github/workflows/README.md).
