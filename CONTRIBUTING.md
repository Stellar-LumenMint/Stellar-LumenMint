# Contributing to Stellar LumenMint

## Development Setup

```bash
# Install dependencies (uses pnpm workspaces)
pnpm install

# Start backend
cd backend && pnpm start:dev

# Start frontend
cd frontend && pnpm dev

# Start mobile app
cd mobile-app && pnpm start

# Start admin panel
cd admin && pnpm dev
```

## Commit Conventions

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `chore`, `style`

**Scopes:** `backend`, `frontend`, `mobile`, `admin`, `soroban`, `sdk`, `cli`, `ai`, `ci`, `docker`

## Testing

```bash
# Backend
cd backend && pnpm test

# Frontend
cd frontend && pnpm test

# Mobile
cd mobile-app && pnpm test

# Admin
cd admin && pnpm test

# Soroban
cd soroban && cargo test --workspace
```

## Code Review

All PRs require:
- Passing CI (lint, typecheck, test, build)
- At least one approving review
- Conventional commit message format
- Relevant documentation updated

## Issues

See [GitHub Issues](https://github.com/Stellar-LumenMint/Stellar-LumenMint/issues) for open tasks (issues #1-#10).
