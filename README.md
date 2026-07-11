<p align="center">
  <b>✦</b>
</p>

<h1 align="center">
  <b>Stellar‑LumenMint</b>
</h1>

<p align="center">
  <em>The curated NFT marketplace for the Stellar ecosystem.</em>
  <br />
  Mint, collect, and trade digital assets with zero‑gas efficiency.
</p>

<p align="center">
  <!-- CI/CD -->
  <a href="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-frontend.yml"><img src="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-frontend.yml/badge.svg" alt="Frontend CI" /></a>
  <a href="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-backend.yml"><img src="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-backend.yml/badge.svg" alt="Backend CI" /></a>
  <a href="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-mobile-app.yml"><img src="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-mobile-app.yml/badge.svg" alt="Mobile CI" /></a>
  <a href="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-stellar.yml"><img src="https://github.com/Stellar-LumenMint/Stellar-LumenMint/actions/workflows/stellar-lumenmint-stellar.yml/badge.svg" alt="Soroban CI" /></a>
  <br />
  <!-- Tech Stack -->
  <img src="https://img.shields.io/badge/Next.js-13-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-11-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/Expo-54-1b1f23?logo=expo" alt="Expo" />
  <img src="https://img.shields.io/badge/Soroban-SDK_23-0f766e?logo=stellar" alt="Soroban" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-14-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-cache-d82c20?logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite" alt="Vite" />
  <br />
  <!-- Meta -->
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/i18n-en_|_fr_|_es_|_de-4F46E5" alt="i18n" />
</p>

---

## Why Stellar‑LumenMint?

Most NFT platforms are slow, expensive, and cluttered. Stellar‑LumenMint takes a different path:

- **Zero‑gas minting** — built on Stellar, where transactions cost fractions of a cent.
- **Gallery‑first design** — a quiet, editorial interface that lets the art speak.
- **Full‑stack ownership** — web, mobile, API, admin, and on‑chain contracts in a single monorepo.
- **Creator sovereignty** — royalties, provenance, and curation tools natively supported.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Stellar‑LumenMint Platform                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
│   │   Frontend    │   │  Mobile App   │   │    Admin     │                │
│   │ Next.js 13    │   │   Expo 54    │   │   Vite 8    │                │
│   │ Tailwind 3    │   │ React Native │   │  React 19   │                │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘                │
│          │                  │                  │                         │
│          └──────────────────┼──────────────────┘                         │
│                             │                                            │
│                    ┌────────▼────────┐                                   │
│                    │     Backend      │                                   │
│                    │   NestJS 11      │                                   │
│                    │  REST + GraphQL  │                                   │
│                    └────────┬────────┘                                   │
│                             │                                            │
│     ┌───────────────┬───────┼───────┬───────────────┐                   │
│     ▼               ▼       │       ▼               ▼                   │
│  PostgreSQL      Redis       │   Meilisearch    IPFS / Arweave           │
│  (persistence)  (cache)      │   (search)      (asset storage)           │
│                              │                                           │
├──────────────────────────────┼───────────────────────────────────────────┤
│                    Stellar Network                                       │
│                              │                                           │
│                    ┌─────────▼─────────┐                                 │
│                    │     Soroban        │                                 │
│                    │  Smart Contracts   │                                 │
│                    │  (Rust / WASM)     │                                 │
│                    └───────────────────┘                                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Web** | [Next.js 13](https://nextjs.org) · [React 18](https://react.dev) · [Tailwind CSS 3](https://tailwindcss.com) · [Apollo GraphQL](https://www.apollographql.com) · [Zustand](https://zustand.docs.pmnd.rs) |
| **Mobile** | [Expo 54](https://expo.dev) · [React Native 0.73](https://reactnative.dev) · [Stellar SDK](https://stellar.org) |
| **API** | [NestJS 11](https://nestjs.com) · [TypeORM](https://typeorm.io) · [GraphQL](https://graphql.org) · [Swagger](https://swagger.io) |
| **Data** | [PostgreSQL](https://www.postgresql.org) · [Redis](https://redis.io) · [Meilisearch](https://www.meilisearch.com) |
| **Storage** | [IPFS](https://ipfs.tech) · [Arweave](https://www.arweave.org) |
| **Contracts** | [Soroban SDK 23](https://soroban.stellar.org) · [Rust](https://www.rust-lang.org) · WASM |
| **Admin** | [React 19](https://react.dev) · [Vite 8](https://vitejs.dev) · [Tailwind CSS 4](https://tailwindcss.com) |
| **DevOps** | [Docker](https://www.docker.com) · [GitHub Actions](https://github.com/features/actions) · [Jest](https://jestjs.io) |

---

## Features

- 🔐 **Stellar wallet auth** — sign in with Freighter, Albedo, or email/password. Challenge‑response verification with JWT sessions.
- 🖼️ **NFT minting & collections** — create, mint, and manage NFT collections with rich metadata, attributes, and IPFS/Arweave storage.
- 🏷️ **Marketplace listings** — fixed‑price listings with buy, cancel, and transfer flows.
- ⚡ **Auctions & bidding** — time‑bound auctions with automatic settlement via Soroban contracts.
- 🔍 **Full‑text search** — discover NFTs and profiles through Meilisearch‑powered fuzzy search.
- 🌐 **Internationalization** — locale‑aware routing with EN, FR, ES, DE translations and validation.
- 📱 **PWA support** — installable web app with offline fallback.
- 🎨 **Gallery‑first design** — minimal, editorial UI that puts the art front and center. Dark and light modes.
- 📊 **Admin dashboard** — internal operations console for moderation, analytics, and platform management.

---

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Docker** & Docker Compose
- **Rust** toolchain with `wasm32-unknown-unknown` target (for Soroban contracts)
- **Soroban CLI** (for contract deployment)

### 1. Backend & Dependencies

```bash
cd backend
cp .env.example .env

# docker-compose.yml expects these values explicitly
printf '\nDB_USER=postgres\nDB_PASSWORD=postgres\nDB_NAME=stellar_lumenmint\nDB_HOST=localhost\nDB_PORT=5433\n' >> .env

# align DATABASE_URL with the compose port mapping
sed -i 's|localhost:5432|localhost:5433|' .env

docker compose up -d      # PostgreSQL, Redis, Meilisearch
npm install
npm run start:dev
```

The API is now live:

| Service | URL |
|---------|-----|
| REST API | `http://localhost:3000/api/v1` |
| Swagger Docs | `http://localhost:3000/api/docs` |
| GraphQL | `http://localhost:3001/graphql` |

### 2. Web Frontend

```bash
cd ../frontend
npm install

# Create the environment file
cat > .env.local <<'EOF'
NEXT_PUBLIC_BASE_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
EOF

npm run dev                # → http://localhost:5000
```

### 3. Mobile App

```bash
cd ../mobile-app
npm install
npm start                  # then npm run android, npm run ios, or npm run web
```

### 4. Admin Dashboard

```bash
cd ../admin
npm install
npm run dev
```

### 5. Soroban Contracts

```bash
cd ../soroban
rustup target add wasm32-unknown-unknown
cargo build --workspace
cargo test --workspace
```

---

## Repository Structure

```
.
├── frontend/          Next.js marketplace (web app, PWA, i18n)
├── backend/           NestJS API, GraphQL, PostgreSQL, Redis
├── mobile-app/        Expo React Native (iOS + Android)
├── admin/             Vite + React operations dashboard
├── soroban/           Rust smart contracts (Soroban)
│   └── contracts/
│       ├── collection_factory/
│       ├── marketplace_settlement/
│       ├── transaction_contract/
│       └── nft_contract/
├── .github/
│   └── workflows/     CI/CD pipelines for all workspaces
├── DESIGN_SYSTEM.md   Visual language, tokens, and components
└── plan.md            Rebranding summary and design decisions
```

---

## Testing

Every workspace has its own test suite. Run them all from root:

```bash
# Backend — unit + e2e
cd backend && npm test && npm run test:e2e

# Frontend — Jest + accessibility
cd ../frontend && npm test

# Mobile — Jest
cd ../mobile-app && npm test

# Soroban — Rust tests
cd ../soroban && cargo test --workspace
```

Additional quality checks:

```bash
cd frontend && npm run validate-translations   # i18n completeness
cd frontend && npm run lint                    # ESLint
cd backend  && npm run lint                    # ESLint + Prettier
cd admin    && npm run lint                    # ESLint
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Design System](DESIGN_SYSTEM.md) | Visual language, color tokens, typography, motion, components |
| [Frontend](frontend/README.md) | Web app architecture, routing, wallet integration, PWA |
| [Backend](backend/README.md) | API surface, modules, database, storage, security |
| [Mobile](mobile-app/README.md) | Expo app, auth flow, wallet services, navigation |
| [Admin](admin/README.md) | Dashboard shell, setup, recommended next modules |
| [Soroban](soroban/README.md) | Smart contracts, deployment, verification, security |

---

## Contributing

We welcome contributions. Here's how:

1. **Fork & branch** — create a feature branch from `main`.
2. **Scope your changes** — keep work focused on a single workspace.
3. **Follow conventions** — each workspace has its own lint and format rules; run them before committing.
4. **Write tests** — add or update tests for your changes.
5. **Update docs** — if your change affects setup, architecture, or behavior, update the relevant README.
6. **Open a PR** — describe what you've done and why. Link any related issues.

Need inspiration? Check the [admin roadmap](admin/README.md#-recommended-next-modules) or the [Soroban contract packages](soroban/README.md#-contract-packages) for areas ready for contribution.

---

## License

MIT © Stellar‑LumenMint

---

<p align="center">
  Built with ❤️ on <a href="https://stellar.org">Stellar</a>
</p>
