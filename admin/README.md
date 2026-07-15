# LumenMint Admin Panel

Administrative dashboard for managing the LumenMint NFT marketplace.

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- react-i18next (internationalization: en, es)
- Lucide React (icons)
- Vitest (testing)

## Getting Started

```bash
cd admin
pnpm install
pnpm dev
```

## Features

- Dashboard with collection/transaction/wallet stats
- Collection verification and moderation
- User management
- Recent activity feed
- Network status indicator
- Quick actions panel

## Internationalization

Translations in `src/locales/`:
- `en.json` — English
- `es.json` — Spanish

## Testing

```bash
pnpm test
```

Tests use Vitest with React Testing Library.
