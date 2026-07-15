# LumenMint Frontend

Next.js 14 web application for the LumenMint NFT marketplace.

## Quick Start

```bash
cd frontend
pnpm install
pnpm dev
```

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
