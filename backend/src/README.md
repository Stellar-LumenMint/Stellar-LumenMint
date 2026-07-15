# Backend API

NestJS REST + GraphQL API for the LumenMint NFT marketplace.

## Quick Start

```bash
cd backend
cp .env.example .env
docker-compose up -d   # Postgres, Redis, Meilisearch
pnpm install
pnpm start:dev
```

## Architecture

```
src/
├── modules/           # Feature modules (nft, collection, auction, listing, offer, payment, social)
├── auth/              # JWT + wallet-based authentication
├── graphql/           # GraphQL gateway (resolvers, middleware, context)
├── common/            # Guards, filters, interceptors, middleware, queue, audit, metrics
├── config/            # Stellar, CORS, CSRF configuration
├── services/          # Soroban RPC, Stellar account services
├── health/            # Health check endpoints
├── jobs/              # Background jobs (indexer, DLQ)
└── storage/           # IPFS + Arweave storage
```

## API Endpoints

| Prefix | Protocol | Purpose |
|---|---|---|
| `/api/` | REST | CRUD operations, auth, payments |
| `/graphql` | GraphQL | Flexible data queries |
| `/health` | REST | Liveness/readiness probes |
| `/metrics` | REST | Prometheus scrape |
