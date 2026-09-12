# Contributing to Stellar LumenMint

## Development Setup

This is a multi-workspace repository. There is **no workspace root install**:
each workspace has its own `package.json` and its own committed
`package-lock.json`, and dependencies are installed per workspace with npm.

```bash
# JavaScript workspaces
cd backend     && npm ci
cd ../frontend && npm ci
cd ../admin    && npm ci --legacy-peer-deps
cd ../mobile-app && npm ci
cd ../packages && npm install

# Rust contracts (requires rustup; the pinned toolchain is in
# soroban/rust-toolchain.toml and includes the wasm32 target plus clippy/rustfmt)
cd soroban && cargo build --workspace
```

The root `Makefile` wraps the common commands (`make help` lists them), and the
root `package.json` aggregates the typecheck/test scripts across workspaces.

```bash
# Start the backend API (http://localhost:3000), needs PostgreSQL/Redis/Meilisearch
cd backend && docker-compose up -d && npm run start:dev

# Start the marketplace (http://localhost:5000)
cd frontend && npm run dev
```

## Commit Conventions

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `ci`, `chore`, `style`

**Scopes:** `backend`, `frontend`, `mobile-app`, `admin`, `contracts`, `sdk`,
`cli`, `ai`, `ci`, `docker`

Write the body for the *why*. A change to settlement, authorization or storage
behaviour should say what was wrong before and what invariant now holds.

## Testing

Every gate below must pass before a change is proposed. CI runs the same set and
fails on any failure — there are no `|| echo` escape hatches.

```bash
# Backend (Jest)
cd backend && npm test && npx tsc --noEmit && npx eslint "src/**/*.ts"

# Frontend (Jest + React Testing Library; Playwright for E2E)
cd frontend && npm test && npx tsc --noEmit && npx eslint .

# Admin (Vitest)
cd admin && npm test && npx tsc --noEmit

# Mobile (Jest)
cd mobile-app && npm test

# Package workspace
cd packages && npm test

# Soroban contracts (unit tests, lint and formatting)
cd soroban && cargo test --workspace
cd soroban && cargo clippy --workspace --all-targets -- -D warnings
cd soroban && cargo fmt --all -- --check
```

Contract changes should come with a test that fails on the previous
implementation, not just one that passes on the new one.

## Code Review

All PRs require:

- Passing CI (lint, format, typecheck, test, build)
- At least one approving review
- A conventional commit message
- Relevant documentation updated — in particular, `soroban/CONTRACT_INVARIANTS.md`
  and the per-contract README/DEVELOPER guides when an interface changes

## Security

Do not open public issues for vulnerabilities. See [SECURITY.md](./SECURITY.md)
for the private reporting process, including the contract-specific path.

## Code of Conduct

Participation in this project is covered by the
[Contributor Covenant](./CODE_OF_CONDUCT.md). Report unacceptable behaviour to
the maintainers, or through a private security advisory if you would rather not
email. Reports are handled confidentially.

## Issues

See [GitHub Issues](https://github.com/Stellar-LumenMint/Stellar-LumenMint/issues)
for open tasks.

Issues labelled **good first issue** are scoped to be approachable without prior
context in the codebase; **help wanted** marks work where the design is settled
but the implementation is open. If an issue's description no longer matches the
code, say so on the issue rather than working around it — a stale issue is a bug
in its own right, and this repository has had several.
