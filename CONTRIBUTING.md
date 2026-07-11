# Contributing to Stellar‑LumenMint

Thanks for your interest in contributing! Below are 10 well-scoped issues ready for contributors. Pick one, open a PR, and help build the future of NFT marketplaces on Stellar.

---

## Open Issues for Contributors

### 1. 🟢 Frontend — Implement WalletConnect integration

**Workspace:** `frontend/`  
**Difficulty:** Intermediate  
**Time estimate:** 4–8 hours

The frontend currently supports Freighter and Albedo wallet flows, but WalletConnect is only a placeholder message in `components/wallet/WalletConnector.tsx`. Implement full WalletConnect v2 integration so users can connect with any WalletConnect‑compatible mobile wallet.

- Add `@walletconnect/web3wallet` or the Stellar‑specific WalletConnect package
- Build the connection flow: QR code display, session approval, disconnect
- Add error handling for rejected/expired sessions
- Ensure the connected wallet state integrates with the existing Zustand wallet store

**Files to touch:** `components/wallet/WalletConnector.tsx`, `stores/walletStore.ts`, `lib/stellar/`

---

### 2. 🟢 Frontend — Complete Spanish and German translations

**Workspace:** `frontend/`  
**Difficulty:** Beginner  
**Time estimate:** 2–4 hours

The project supports 4 locales (EN, FR, ES, DE), but the Spanish and German translation files are incomplete. Many keys that exist in `locales/en/common.json` are missing from `locales/es/common.json` and `locales/de/common.json`. Run `npm run validate-translations` to see the gaps, then fill in all missing keys.

- Run `cd frontend && npm run validate-translations` to list missing keys
- Translate missing strings into Spanish and German
- Verify with `npm run validate-translations` until 100% complete
- Native or fluent speakers preferred — machine translations are welcome as a starting point

**Files to touch:** `locales/es/common.json`, `locales/de/common.json`

---

### 3. 🟡 Backend — Replace `synchronize: true` with migration-driven schema control

**Workspace:** `backend/`**Difficulty:** Advanced
**Time estimate:** 8–12 hours

**Prerequisite:** Experience with TypeORM migrations required.

The backend currently uses TypeORM's `synchronize: true`, which auto‑creates tables from entity definitions. This is convenient for development but unsafe for production. Replace it with a proper migration workflow using TypeORM CLI migrations.

- Disable `synchronize` in the TypeORM config
- Generate initial migrations from the existing entities
- Create a `migrations/` directory if it doesn't exist and add generated files
- Add `npm run migration:generate` and `npm run migration:run` scripts
- Update `backend/README-SETUP.md` with the new migration workflow
- Verify all existing tests still pass after the change

**Files to touch:** `src/config/`, `package.json` (scripts), `backend/README-SETUP.md`

---

### 4. 🟡 Backend — Add rate limiting tests

**Workspace:** `backend/`  
**Difficulty:** Beginner  
**Time estimate:** 2–4 hours

The backend has Redis‑backed rate limiting guards, but they lack dedicated test coverage. Write unit and integration tests that verify the rate limiting behavior under normal and edge‑case conditions.

- Test that requests within the limit succeed
- Test that requests exceeding the limit return 429
- Test that the rate limit resets after the TTL window
- Test that different routes/endpoints have independent limits
- Use Jest mocks for Redis to avoid requiring a running Redis instance

**Files to touch:** `src/common/guards/`, `src/*.spec.ts`

---

### 5. 🟡 Mobile App — Build out Marketplace, Home, and Profile screens

**Workspace:** `mobile-app/`  
**Difficulty:** Intermediate  
**Time estimate:** 8–12 hours

The mobile app currently has foundation screens (`screens/Marketplace/sample.tsx`, `screens/Home/sample.tsx`, `screens/Profile/sample.tsx`) that are placeholder scaffolds. Build real screens with data fetching and navigation integration.

- **Marketplace** — fetch and display NFT listings from the backend REST API with a grid layout, pull‑to‑refresh, and detail navigation
- **Home** — build a dashboard with featured collections, trending NFTs, and quick actions
- **Profile** — show user info, owned NFTs, and transaction history from the backend
- Use the existing `LMTheme` for consistent v3.0 design styling
- Add loading states, error states, and empty states for each screen

**Files to touch:** `screens/Marketplace/`, `screens/Home/`, `screens/Profile/`, `hooks/`

---

### 6. 🟡 Admin — Implement admin authentication and backend integration

**Workspace:** `admin/`  
**Difficulty:** Intermediate  
**Time estimate:** 6–10 hours

The admin dashboard (`admin/README.md`) currently has no backend integration, routing, or authentication. Wire it up to the backend and add auth gating.

- Add React Router for admin‑specific routes (dashboard, collections, users, settings)
- Implement JWT‑based login flow against the backend's auth endpoints
- Add a protected route wrapper that redirects unauthenticated users to login
- Connect the existing stats cards to real API data from the backend
- Add a logout button and token persistence

**Files to touch:** `admin/src/`, add `react-router-dom` to `admin/package.json`

---

### 7. 🟡 Admin — Build collection moderation table

**Workspace:** `admin/`  
**Difficulty:** Intermediate  
**Time estimate:** 4–6 hours

As listed in the admin's "Recommended Next Modules," build a collection moderation table with filtering, status management, and bulk actions.

- Fetch collections from the backend API (`GET /api/v1/collections`)
- Render a sortable, filterable table with columns: name, creator, status, created date, NFT count
- Add status filters (pending, verified, flagged)
- Add approve/reject/flag actions per collection
- Add a detail panel or modal showing collection metadata and NFTs
- Handle loading, empty, and error states

**Files to touch:** `admin/src/`

---

### 8. 🔴 Soroban — Flesh out the `nft_contract` package

**Workspace:** `soroban/`  
**Difficulty:** Advanced  
**Time estimate:** 10–20 hours

The `soroban/contracts/nft_contract` package (`soroban/README.md`) is scaffold‑level compared to the more developed `collection_factory`, `marketplace_settlement`, and `transaction_contract` packages. Expand it into a fully‑functional NFT contract.

**Note:** The workspace uses `edition = "2021"` (stable Rust). Do not use edition 2024 features like `let` chains.

- Implement mint, burn, transfer, approve, and metadata update functions
- Add access control (owner, minter, burner roles)
- Add royalty support consistent with the marketplace settlement contract
- Add batch operations (batch mint, batch burn, batch transfer)
- Write comprehensive unit tests
- Update `soroban/README.md` to reflect the new contract capabilities

**Files to touch:** `soroban/contracts/nft_contract/src/`

---

### 9. 🔴 Soroban — Reformat code for edition 2021 and re-enable formatting check

**Workspace:** `soroban/`  
**Difficulty:** Beginner  
**Time estimate:** 1–2 hours

The Soroban contracts were originally written with `edition = "2024"` formatting rules. After downgrading to edition 2021 (Rust stable compatibility), the CI's `cargo fmt -- --check` step was made non‑fatal as a workaround. Run `cargo fmt` locally, commit the reformatted code, and restore the strict formatting check.

- Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- Add WASM target: `rustup target add wasm32-unknown-unknown`
- Run `cd soroban && cargo fmt` to reformat all contracts
- In `.github/workflows/stellar-lumenmint-stellar.yml`, remove `continue-on-error: true` from the fmt step
- Verify `cargo check && cargo test` still passes

**Files to touch:** `soroban/contracts/**/*.rs`, `.github/workflows/stellar-lumenmint-stellar.yml`

---

### 10. 🟢 Cross-cutting — Dark mode logo in Navbar, Footer, and Auth components

**Workspace:** `frontend/`  
**Difficulty:** Beginner  
**Time estimate:** 1–3 hours

The project has both light and dark logo variants (`stellar-lumenmint-logo.svg` and `stellar-lumenmint-logo-dark.svg`), but the Navbar (`components/navbar.tsx`), Footer (`components/Footer.tsx`), and auth login page all hardcode the light variant. Make them dark‑mode aware so the logo matches the current theme.

- Detect the current theme (Tailwind dark mode class or system preference)
- Conditionally render the dark logo variant when dark mode is active
- Ensure the logo is crisp at all breakpoints
- Test on both light and dark backgrounds

**Files to touch:** `components/navbar.tsx`, `components/Footer.tsx`, `app/[locale]/auth/login/page.tsx`

---

## How to Claim an Issue

1. Comment on the issue to let others know you're working on it.
2. Fork the repo and create a feature branch from `main`.
3. Keep changes scoped to the relevant workspace.
4. Run lint and tests for that workspace before opening a PR.
5. Reference the issue number in your PR description.

## Need Help?

Each workspace has its own README with setup instructions. Start there, and if you get stuck, open a discussion or ask in the issue comments.

---

*Happy building! The Stellar‑LumenMint team*
