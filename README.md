<div align="center">

# 🌌 Stellar LumenMint

### The Stellar-Native NFT Marketplace & Creator Platform

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-%23FE5196?logo=conventionalcommits&logoColor=white)](https://conventionalcommits.org)

<!-- CI/CD Status Badges -->
[![Backend CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-backend.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-backend.yml)
[![Frontend CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-frontend.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-frontend.yml)
[![Mobile App CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-mobile-app.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-mobile-app.yml)
[![Admin CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-admin.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-admin.yml)
[![Soroban CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-soroban.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-soroban.yml)
[![Packages CI](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-packages.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-packages.yml)
[![Security Scan](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-security.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-security.yml)
[![Release](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-release.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-release.yml)

<!-- Tech Stack Badges -->
[![Stellar](https://img.shields.io/badge/Stellar-090020?logo=stellar&logoColor=white)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-7B2FF7?logo=rust&logoColor=white)](https://soroban.stellar.org)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js%2013-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)](https://expo.dev)
[![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)](https://www.rust-lang.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

</div>

---

## What is Stellar LumenMint?

Stellar LumenMint is a **production-grade Web3 NFT marketplace and creator platform** built natively on the **Stellar** blockchain and **Soroban** smart contract platform. It provides a complete ecosystem for minting, trading, auctioning, and managing NFTs — with a web marketplace, iOS/Android mobile app, admin dashboard, and a developer SDK/CLI.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 13)                  │
│        Web Marketplace · PWA · i18n · Storybook           │
├──────────────────────────────────────────────────────────┤
│                Mobile App (Expo / React Native)           │
│            iOS · Android · Wallet Integration             │
├──────────────────────────────────────────────────────────┤
│                  Admin Dashboard (Vite + React)            │
├──────────────────────────────────────────────────────────┤
│                   Backend (NestJS + GraphQL)               │
│   REST API · GraphQL · WebSockets · Rate Limiting         │
│   PostgreSQL · Redis · Meilisearch · Pino Logging         │
├──────────────────────────────────────────────────────────┤
│               Soroban Smart Contracts (Rust)               │
│   NFT · Marketplace Settlement · Collection Factory        │
│   Transaction Contract                                     │
├──────────────────────────────────────────────────────────┤
│               Developer Tooling (TypeScript)               │
│   SDK · CLI · AI Utilities · Shared Types                  │
└──────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

| Workspace | Technology | Purpose |
|-----------|-----------|---------|
| [`backend/`](./backend) | NestJS 11 + TypeORM + GraphQL + Swagger | REST & GraphQL API, Soroban RPC integration, WebSocket notifications |
| [`frontend/`](./frontend) | Next.js 13 + Tailwind CSS + Zustand | Web marketplace UI, PWA, i18n (EN/FR/ES/DE), Storybook |
| [`mobile-app/`](./mobile-app) | Expo 54 + React Native | iOS/Android wallet and marketplace with biometric auth |
| [`admin/`](./admin) | Vite 8 + React 19 + Tailwind 4 | Admin dashboard with glassmorphism UI |
| [`soroban/`](./soroban) | Rust + Soroban SDK 23 | Smart contracts: NFT, Marketplace, Collection Factory, Transaction |
| [`packages/`](./packages) | TypeScript | SDK, CLI, AI metadata tools, shared types |

---

## Key Features

### 🎨 NFT Marketplace
- Browse, search, and discover NFTs with Meilisearch full-text search
- Create and manage NFT collections with custom attributes
- Live auctions with Soroban-based settlement
- Fixed-price listings and offers
- Social features: user follows, collection likes
- Responsive design with dark/light mode and the **Lumen Minimal** design system

### ⛓️ Stellar & Soroban Integration
- **Stellar wallets**: Freighter, Albedo, WalletConnect
- **Soroban smart contracts**: NFT minting, marketplace settlement, collection factory, transaction history
- On-chain event indexing and transfer tracking
- Stellar account validation and management

### 📱 Mobile App
- Cross-platform iOS/Android via Expo
- Secure wallet management with biometrics
- HD wallet derivation (BIP39)
- Push notifications for bids, sales, and transfers

### 🔧 Developer Tooling
- **SDK**: Unified TypeScript client for REST, GraphQL, Soroban, and wallet operations
- **CLI**: Contract deployment, NFT operations, admin tasks
- **AI**: Metadata generation, search enrichment
- **Shared Types**: Type-safe interfaces across all packages

### 🛡️ Security & Reliability
- Rate limiting (Redis-backed), idempotency keys, audit logging
- CodeQL security scanning + dependency auditing (weekly)
- Docker multi-stage builds with health checks
- Prometheus metrics export
- CSRF token protection, HTTP exception filtering

### 🚀 DevOps
- Full CI/CD pipeline per workspace (lint → typecheck → test → build)
- Docker image publishing to GitHub Container Registry
- Manual deploy/rollback with health checks (staging & production)
- Conventional commit changelog generation
- Rust smart contract CI (fmt, clippy, WASM build, test)

---

## Quick Start

### Prerequisites
- **Node.js** 20+ (see [`.nvmrc`](./.nvmrc))
- **pnpm** 10+ (`npm install -g pnpm`)
- **Docker** (for PostgreSQL, Redis, Meilisearch)
- **Rust** 1.85+ (for Soroban contracts)

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure services
cd backend && docker-compose up -d

# 3. Start the backend API (http://localhost:3000)
cd backend && pnpm start:dev

# 4. Start the frontend marketplace (http://localhost:5000)
cd frontend && pnpm dev

# 5. (Optional) Start the admin dashboard
cd admin && pnpm dev

# 6. (Optional) Start the mobile app
cd mobile-app && pnpm start
```

---

## Testing

```bash
# Backend (Jest + Supertest)
cd backend && pnpm test

# Frontend (Jest + React Testing Library + Playwright E2E)
cd frontend && pnpm test          # Unit & integration
cd frontend && pnpm e2e           # Playwright E2E

# Mobile (Jest)
cd mobile-app && pnpm test

# Admin (Vitest)
cd admin && pnpm test

# Soroban (Cargo test)
cd soroban && cargo test --workspace
```

---

## Smart Contracts

| Contract | Description |
|----------|-------------|
| `nft_contract` | NFT minting, metadata, transfers, royalty enforcement |
| `marketplace_settlement` | Atomic trade settlement, escrow, fee distribution |
| `collection_factory` | Collection creation, management, and configuration |
| `transaction_contract` | On-chain transaction logging and history |

Contract source: [`soroban/contracts/`](./soroban/contracts) · [Contract Invariants](./soroban/CONTRACT_INVARIANTS.md) · [Security](./soroban/SECURITY.md)

---

## Documentation

| Document | Description |
|----------|-------------|
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Colors, typography, spacing, components, accessibility |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Dev setup, commit conventions, testing, code review |
| [QA-RESPONSIVENESS-CHECKLIST.md](./QA-RESPONSIVENESS-CHECKLIST.md) | Mobile & tablet responsiveness testing matrix |
| [packages/README.md](./packages/README.md) | SDK, CLI, AI package usage and API reference |
| [backend/TESTING.md](./backend/TESTING.md) | Backend service/controller test patterns |
| [frontend/README.md](./frontend/README.md) | Frontend architecture, tech stack, quick start |
| [mobile-app/NAVIGATION-README.md](./mobile-app/NAVIGATION-README.md) | Mobile app navigation architecture |
| [soroban/CONTRACT_INVARIANTS.md](./soroban/CONTRACT_INVARIANTS.md) | Smart contract safety invariants |
| [soroban/SECURITY.md](./soroban/SECURITY.md) | Smart contract security considerations |
| [.github/workflows/README.md](./.github/workflows/README.md) | CI/CD pipeline architecture |

---

## CI/CD Pipeline

Every workspace has automated CI triggered on push/PR:

| Pipeline | Steps | Badge |
|----------|-------|-------|
| **Backend** | lint, format, typecheck, test, build | [![Backend](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-backend.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-backend.yml) |
| **Frontend** | lint, format, typecheck, test, Next.js build | [![Frontend](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-frontend.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-frontend.yml) |
| **Mobile App** | typecheck, test, Expo config validate | [![Mobile](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-mobile-app.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-mobile-app.yml) |
| **Admin** | lint, typecheck, test, Vite build | [![Admin](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-admin.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-admin.yml) |
| **Soroban** | fmt, clippy, WASM build, cargo test | [![Soroban](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-soroban.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-soroban.yml) |
| **Packages** | typecheck, test, build (matrix) | [![Packages](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-packages.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-packages.yml) |
| **Security** | CodeQL, pnpm audit, cargo-audit (weekly) | [![Security](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-security.yml/badge.svg?branch=main)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-security.yml) |
| **Release** | Semver, changelog, Docker publish to GHCR | [![Release](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-release.yml/badge.svg)](https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-release.yml) |
| **Deploy** | Manual deploy/rollback with health checks | Manual |

---

## Contributing

We follow [Conventional Commits](https://www.conventionalcommits.org/). PRs require passing CI, an approving review, and up-to-date documentation.

```bash
# Commit format
<type>(<scope>): <description>

# Examples
feat(frontend): add dark mode toggle to navbar
fix(backend): resolve race condition in auction settlement
docs(sdk): add legacy migration guide
test(ui): add NFT grid responsive tests
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full development guide.

---


