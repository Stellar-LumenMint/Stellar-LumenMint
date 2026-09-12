# Stellar LumenMint — Production Readiness Review

**Scope:** the whole monorepo — `soroban/` (Rust contracts), `backend/` (NestJS), `frontend/`
(Next.js), `admin/` (Vite + React), `mobile-app/` (Expo), `packages/` (SDK / CLI / AI /
shared types), CI and tooling.
**Method:** static review of the contracts and the TypeScript workspaces, followed by
running every gate (typecheck, lint, format, unit tests, contract tests, production
build) against the checked-out tree.
**Status of this document:** reviewed and kept current. An earlier revision was a
long list of candidate findings; each one was triaged, and everything that blocked a
production launch was fixed and is covered by a regression test. What remains open is
listed honestly in [Open items](#4-open-items).

---

## 1. Verification gates

Everything below is what CI runs and what was run locally on this tree.

```bash
# TypeScript workspaces (backend, frontend, admin, packages)
npm run typecheck
npm run lint
npm run format:check

# Unit / integration suites
npm --prefix backend test        # 600+
npm --prefix frontend test       # 400+
npm --prefix admin test
npm --prefix mobile-app test

# Rust contracts
cd soroban && cargo test --workspace && cargo clippy --workspace --all-targets

# Production frontend build (also emits and registers the PWA service worker)
cd frontend && npm run build
```

All of the above pass on the current `main`. The CI workflows in
`.github/workflows/` run the same commands; their verification steps fail the job on
failure — none of them are wrapped in `|| echo` or `continue-on-error`.

---

## 2. Smart contracts

The contracts were the highest-risk area: several entry points accepted calls and
recorded state without ever moving assets. Each of these is now a real settlement path
with tests that would fail against the old behaviour.

**Fixed-price sales** settle end to end — the lot is escrowed when the sale is created,
the price is split into creator royalty, platform fee and seller proceeds through one
validated distribution, each share is paid, and the token is delivered out of escrow.

**NFT-for-NFT trades** no longer just flip a status flag. Both sides' items are escrowed
and both legs move in the single execution call.

**Bundle listings** escrow every item, settle in one call, and release escrow on cancel.
The bundle entry points the backend calls (`execute_bundle`, `cancel_bundle`) exist and
match the client's argument list.

**Auctions** settle like a sale: the hammer price is split and paid, the escrowed lot is
delivered to the winner, and an unmet reserve returns both the leading bidder's deposit
and the lot to the seller. Bids are escrowed on placement, the displaced leader is
repaid as they are outbid (including a bidder raising their own bid), and every refund
path repays all outstanding deposits through one accounting helper so the bid book can
never disagree with the contract balance. Creation escrows the lot, so a winner cannot
be left without the token. The reserve rule was inverted (a reserve above the opening
price was rejected, which made every valid bid clear it); it now behaves as a floor.

**Royalties** are keyed by `(nft_contract, token_id)`. They previously shared a single
empty key, so configuring one token silently reconfigured every other, and
`get_royalty_info` returned whichever token was written last. Royalties are opt-in: an
unconfigured token still sells, with the full price flowing through the normal split.

**Authorization** is enforced on every state-changing entry point, including the two
that were missing it: royalty configuration (owner- or admin-authorized) and rate-limit
administration (admin-authorized).

**Storage** no longer grows a single shared entry. Transactions, auctions, bids, Dutch
pricing, escrows and the fee ledger each live in their own persistent entry, so one
write cannot rewrite every record, and instance storage does not grow without bound.
Where the previous `Map<u64, …>` lookups returned fabricated defaults on a miss, the
helpers now return `Option`/`Result` so "not found" cannot be mistaken for a real value.

**Ledger TTL** is refreshed on state-changing calls, so long-lived records do not
silently expire.

**Execution ordering** in the transaction contract is real: operations run in dependency
order regardless of how they were declared, cycles are detected, and the returned gas
settings are the ones that were actually applied.

**Dispute resolution** no longer strands escrow in a split outcome, and its
configuration is admin-authorized.

Every change above is covered by contract tests (150+ in the workspace).

---

## 3. Backend, auth and client hardening

**Contract ABI alignment.** `SorobanService` had no encoder for the contract's actual
argument types; the settlement client sent strings where the contracts expect
`Address`, `u64`, `symbol`, `i128` and `Asset` structs, so most settlement calls could
not have succeeded. A dedicated ScVal encoder layer now matches the on-chain signatures,
and unit tests pin the encoding.

**Authorization.** Four controllers were reachable anonymously. Payment intents, payouts,
bundle execution/cancellation and the collection-factory mint/transfer/royalty routes
now require an authenticated session; payouts additionally require the admin role.
Bundle settlement and cancellation act on the authenticated caller rather than on a
`buyerId`/`sellerId` supplied in the request body. Read-only lookups stay public.

**Session handling.** Access tokens carry `role`, `isBanned` and `type`. The REST
strategy, the GraphQL middleware and the notifications gateway all reject a token whose
type is not `access`, so a refresh token can no longer be used as an access token, and
refresh checks the token type and version.

**Wallet authentication** signs the server-issued challenge message. The client no longer
rebuilds its own message, which produced signatures the server could never verify.

**Rate limiting** keys per user when authenticated and otherwise uses Express's resolved
`req.ip`, which honours the `trust proxy` configuration. The guard no longer reads the
raw `X-Forwarded-For` header, which a directly-reachable client could have varied to
land in a fresh bucket on every request. Wallet-challenge limiting is stored in the
shared cache rather than an unbounded per-process map.

**Error semantics.** A malformed payout address returns 400 instead of surfacing a bare
`Error` as 500.

**Schema safety.** TypeORM `synchronize` is gated to local development; production-like
environments must run migrations.

**Secrets.** No `.env` / `.env.local` files are tracked; only `.env.example` is committed.

---

## 4. Open items

These are known and accepted for now. None of them is a security hole or a correctness
defect in a shipped flow; they are follow-ups.

1. **Unused subsystems retained.** `OutboxService`, `IdempotencyService`,
   `JobQueueService`, `PipelineService` and the circuit breaker are implemented, tested
   and registered, but no business module consumes them yet. They are kept because they
   are the intended seams for asynchronous delivery and external API resilience; wiring
   or deleting them is a deliberate follow-up rather than an oversight.
2. **Two NestJS applications in one process.** The REST API and the GraphQL gateway run
   as two apps in a single process, each with its own database and cache connections.
   This doubles the connection pool and the failure surface; splitting them into separate
   deployments is an infrastructure change, not a code fix.
3. **Proxied deployments must set `TRUST_PROXY=true`.** Rate limiting and client IP
   attribution rely on Express's trust-proxy setting. It is documented in
   `backend/.env.example`; forgetting it behind a proxy degrades per-IP limiting to
   counting the proxy instead of the client.
4. **Mainnet migration.** Contract deployment and network migration are explicitly out
   of scope for this review; the deployment scripts and manifest target testnet.

---

## 5. What is strong

- Contracts compile under `#![no_std]` with `overflow-checks`, `panic = "abort"` and LTO,
  and every state-changing entry point requires authorization and a reentrancy guard.
- All monetary arithmetic goes through checked helpers; distributions are validated to
  sum exactly before any transfer.
- Test coverage is real, not nominal: the backend, frontend, admin, mobile and contract
  suites all run in CI and fail loudly.
- The security headers on the frontend are complete (CSP, HSTS, frame/object/feature
  restrictions), and the PWA manifest and service worker are now generated and
  registered by the build rather than checked in as stale artifacts.
- The repository is clean: no tracked build output, no committed secrets, a lockfile
  for every workspace, and no `sample.*` placeholder files left behind.
