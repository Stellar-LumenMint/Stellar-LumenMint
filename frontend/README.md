# LumenMint Frontend

Next.js 14 web application for the LumenMint NFT marketplace.

## Quick Start

```bash
cd frontend
pnpm install
pnpm dev
```

## Live Deployment

| | |
|---|---|
| **Production** | <https://stellar-indigo-pay.vercel.app> (Vercel, Root Directory `frontend`) |
| **Contracts** | Stellar Testnet — ids and explorer links in the [root README](../README.md#soroban-contracts-stellar-testnet) and [`soroban/deployments/manifest.json`](../soroban/deployments/manifest.json) |

Pushes to `main` deploy automatically via [`.github/workflows/stellar-lumenmint-vercel.yml`](../.github/workflows/stellar-lumenmint-vercel.yml); pull requests get a preview build. The deployed contract addresses are surfaced in the UI from [`lib/deployment.ts`](./lib/deployment.ts) and can be overridden per environment — see [`.env.example`](./.env.example).

## Architecture

```
frontend/
├── app/               # Next.js App Router pages
├── components/         # React components (ui, wallet, nft, layout)
│   ├── ui/             # Primitive components (Button, SearchInput)
│   ├── wallet/         # Stellar wallet integration
│   └── nft/            # NFT display components
├── lib/                # Shared library (stores, API, context, validation, telemetry)
├── hooks/              # Custom React hooks
├── stores/             # Zustand state stores
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── __tests__/          # Test files
```

## Key Technologies

- Next.js 14 (App Router)
- Tailwind CSS + CSS Modules
- Zustand (state management)
- Zod (form validation)
- Stellar SDK (wallet integration)
- Lucide React (icons)
