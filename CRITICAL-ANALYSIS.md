# Stellar LumenMint — Critical Analysis & 250-Item Improvement Plan

**Prepared:** September 10, 2026
**Scope:** Full monorepo audit — `frontend/` (Next.js 13), `backend/` (NestJS 11), `soroban/` (4 Rust contracts), `mobile-app/` (Expo), `admin/` (Vite+React), `packages/` (SDK/CLI/AI/shared-types), CI/CD, tooling, docs.
**Method:** Static review of ~76,500 LOC TypeScript (frontend+backend) and ~16,000 LOC Rust across 1,101 files; targeted deep-reads of auth, Stellar/Soroban integration, storage, search, GraphQL, rate limiting, contracts, and workflows. No runtime/chain interaction performed.

---

## 1. Executive Summary

This is a large, ambitious, and unusually well-organized monorepo for a Stellar-native NFT marketplace. The codebase has real strengths:

- **Solid smart-contract hygiene**: `overflow-checks = true`, `panic = "abort"`, LTO, `#![no_std]`, `require_auth()` on nearly every state-changing path, reentrancy guards, front-run protection, pause managers, versioning/upgrade modules, and 3,305 lines of contract tests.
- **Real engineering scaffolding**: outbox, idempotency, job queue, pipeline, circuit breaker, Dataloaders, Meilisearch, metrics, audit module, graceful shutdown, typed GraphQL resolvers.
- **Good test culture**: 163 test files across workspaces (242+ tests claimed in `plan.md`).

However, the audit found systemic problems that undercut production-readiness. The ten most important:

1. **🔴 Wallet authentication is broken end-to-end.** The frontend (`frontend/lib/stellar/auth/nonce.ts`, `components/wallet/hooks/useStellarAuth.ts`) builds its *own* challenge message (`buildSignMessage`) and signs it via a 28-byte memo, ignoring the server-issued `message` returned by `POST /auth/wallet/challenge`. The backend (`auth.service.ts → buildChallengeMessage`) verifies a *different* message ("Stellar-LumenMint Wallet Authentication / Wallet: … / Nonce: … / Issued At: …"). The formats don't match, and the server's message is far too long for the memo, so **wallet login/linking cannot succeed**. There are two divergent signing paths (`nonce.ts` and `stellar-signature.guard.ts`'s `bid:{auctionId}:{amount}`) with no shared canonical-message code.
2. **🔴 RBAC is non-functional.** `buildTokenPair()` never puts `role` (or `isBanned`) in JWTs, but `RolesGuard` and `AdminController`/`MetricsController` check `user.role` from the JWT payload. `role` is therefore always `undefined` → every `@Roles(ADMIN)` endpoint returns 403 for everyone, including admins. Admin dashboard backend is unusable; the ban/unban feature can never be called.
3. **🔴 Refresh tokens are accepted as access tokens.** `GraphqlAuthMiddleware.resolveUser` and the REST `JwtStrategy` never check `payload.type === 'access'`, so a long-lived refresh token (7 days, no rotation, no revocation) grants full API access.
4. **🟠 CI is a false green.** Every verification step in the workflows ends with `|| echo "::warning::…"` — typecheck, lint, format, **tests, and build all pass (green) when they fail**. CI/CD badges on the README are meaningless.
5. **🟠 `synchronize: true` on TypeORM in both the REST and GraphQL apps**, alongside raw-SQL migrations that TypeORM never runs (`migrations`/`migrationsRun` unset). Three separate `create_collections` migrations exist. Schema drift in prod is a live risk.
6. **🟠 Dead infrastructure everywhere.** `OutboxService`, `IdempotencyService`, `PipelineService`, `JobQueueService`, and `CircuitBreaker` are registered but never used by any business module. `correlation-id`, `response-time`, and `security-headers` middleware exist but are registered nowhere. `backend/src/nft/` is a second, orphaned NFT module. Duplicate store trees in `frontend/`, `mobile-app/`, and duplicate contract types in `backend/`.
7. **🟠 Committed `.env.local` and permissive secrets handling.** `frontend/.env.local` is tracked in git (the `frontend/.gitignore` ignores `.env` but not `.env.local`). Soroban contract calls sign with a hot operator key (`STELLAR_OPERATOR_SECRET`) and `MarketplaceSettlementClient`/`SorobanService` don't bind on-chain `bidder`/`buyer` addresses to the authenticated JWT user.
8. **🟠 Rate limiting is bypassable.** `RedisRateGuard` trusts the `X-Forwarded-For` header verbatim; `AuthService.challengeRateLimitByIp` is an unbounded in-memory `Map` (per-instance, leaks memory).
9. **🟠 Two NestJS applications boot in one process** (REST on :3000 + a full second GraphQL Nest app on :3001, each with its own Postgres/Redis connections and `synchronize`), doubling connection pools and failure surface.
10. **🟡 Repo-hygiene debt**: 11 `sample.*` placeholder files, a stub root `package-lock.json` (96 bytes, empty `packages`), missing root `package.json`, `npm ci` vs `pnpm@10.26.1` contradiction, `next.config.js` claims PWA/`next-pwa` dependency but no PWA config, missing `lighthouserc.js` referenced by npm scripts, Spanish-only error messages in the API error filter, and a committed `frontend/.env.local`.

**Bottom line:** the architecture is above average; the *enforcement layer* (auth, authorization, CI gating, migrations, observability wiring) is where the real work is. The 250 items below are ordered within each category by severity; sections 6–8 give the prioritized rollout plan.

---

## 2. Category A — Frontend (50 items)

Severity legend: 🔴 critical · 🟠 high · 🟡 medium · 🟢 low

| # | Sev | Location | Issue → Recommended fix |
|---|-----|----------|--------------------------|
| A1 | 🔴 | `lib/stellar/auth/nonce.ts`, `components/wallet/hooks/useStellarAuth.ts` | Frontend rebuilds its own challenge message instead of signing the server-returned `message` → **use the server message**; delete `buildSignMessage` or keep it only as a legacy fallback; add an integration test against the exact backend format. |
| A2 | 🔴 | `lib/stellar/wallet/freighter.ts`, `components/wallet/hooks/useStellarAuth.ts` | Auth "signature" is a 28-byte memo inside a fake transaction; the server's `verifySignedMessage` expects a raw Ed25519 signature. Use Freighter's `signMessage`/`signBlob` API or match the exact server verification scheme; add a signature round-trip test. |
| A3 | 🟠 | `lib/api/fetchWithAuth.ts` | JWTs stored in `localStorage`/`sessionStorage` → XSS-exposed. Migrate to short-lived in-memory tokens + HttpOnly secure cookie refresh (or at minimum add storage isolation + auto-clear on idle). |
| A4 | 🟠 | `next.config.js` | Only 3 security headers; no CSP, no `Permissions-Policy`, no `Cross-Origin-Opener-Policy`, no `Strict-Transport-Security`, `poweredByHeader` not disabled. Add a real header set + CSP for `'self'` with scoped exceptions. |
| A5 | 🟠 | `package.json` | `next-pwa` dependency present but no PWA/`next-pwa` config (and it's unmaintained with Next 13). Either wire a proper `next.config.js` PWA/offline setup or remove the dependency and use `@serwist/next`. |
| A6 | 🟠 | `package.json` scripts | `lhci:collect` references `lighthouserc.js` which doesn't exist; `chromatic` script has a literal `<your-project-token>` placeholder. Fix or remove both. |
| A7 | 🟠 | `lib/firebase/uploadtofirebase.ts` | Upload path is `stellar-lumenmint/${file.name}` — no user namespace, no random ID, no size/type enforcement client-side, global-writable bucket rule risk. Use `users/{uid}/{uuid}` paths + file-type/size guards + Firebase Storage security rules file committed in repo. |
| A8 | 🟠 | `lib/stores/auth-store.ts` vs `features/auth/store/authStore.ts` | Two divergent auth stores. Consolidate on one (`lib/stores/`), re-export from the other, delete the duplicate. |
| A9 | 🟠 | `stores/walletStore.ts` vs `lib/stores/walletStore.ts` | Duplicate wallet stores; consolidate (same pattern as A8). |
| A10 | 🟡 | `app/[locale]/auth/logged-in/data/mock-data.ts` + `components/dashboard/` | Dashboard renders mock data instead of API data. Replace with real queries (`useDashboardStats`), keep mocks only in Storybook/`__fixtures__`. |
| A11 | 🟡 | `app/[locale]/TestImageUpload/page.tsx`, `app/[locale]/test-responsive/page.tsx`, `components/ResponsiveDemo.tsx` | Test/demo pages shipped in the app. Move under `__experimental`/dev-only routes or remove; keep `test-responsive` behind a flag if wanted. |
| A12 | 🟡 | `components/Skeleton/PopluarThisWeekSkeleton.tsx` | Typo `Popluar` → rename to `PopularThisWeekSkeleton` and update imports. |
| A13 | 🟡 | `app/[locale]/auth/logged-in/components/skelletons/` | Folder typo `skelletons` → `skeletons`. |
| A14 | 🟡 | `hooks/graphql/generated.ts` | Generated GraphQL types are committed. Add a CI check that `npm run graphql:codegen` produces no diff (or wire codegen into the build pipeline against the real schema). |
| A15 | 🟡 | `lib/CSRFTOKEN.ts` + pages | CSRF token plumbing exists in some pages but not all mutating flows; centralize CSRF token fetch/attach in `fetchWithAuth` and the Apollo link instead of per-page. |
| A16 | 🟡 | `middleware.ts` | Locale redirect uses a manual list of 4 locales; sync with `next-intl` config and add a trailing-slash/query-preservation regression test. |
| A17 | 🟡 | `package.json` dependencies | Runtime deps pollution: `eslint`, `autoprefixer`, `@types/*` in `dependencies`; both `lottie-react` and `@lottiefiles/dotlottie-react`; `shadcn-ui` (a CLI) as a runtime dep; `gsap`+`framer-motion` overlap. Prune/relocate. |
| A18 | 🟡 | `app/[locale]/creator-dashboard/*` | Creator dashboard has 9 pages with duplicated layout/skeleton code; extract shared `DashboardShell` + query hooks. |
| A19 | 🟡 | `components/wallet/WalletModal.tsx`, `WalletConnector.tsx` | No error recovery when extension is mid-connect; add wallet-provider timeout + retry + cancellation handling. |
| A20 | 🟡 | `components/wallet/WalletNetworkStatus.tsx` | Only shows testnet/mainnet label; add automatic mismatch warning → prompt to switch network before transactions. |
| A21 | 🟡 | `hooks/useGasEstimation.ts` | Gas estimation is a stub/experimental; wire it to real Soroban simulation results from the backend. |
| A22 | 🟡 | `components/autions/AuctionCountdown.tsx` | Client-side countdown only; add server-time skew correction (NTP offset from API) to prevent bid windows ending early/late. |
| A23 | 🟡 | `lib/services/marketplace.ts`, `marketplace-mapper.ts` | API response mapping duplicated in multiple services; centralize schema→UI mappers with zod validation of API payloads. |
| A24 | 🟡 | `lib/errors/serverErrorMapper.ts` | Error mapping is message-string-based; switch to stable error codes from the API (see B-28). |
| A25 | 🟡 | `components/ErrorBoundary.tsx` | Global error boundary doesn't report to PostHog/telemetry; add error reporting + retry action. |
| A26 | 🟡 | `components/image/OptimizedImage.tsx` | `next/image` not used everywhere (custom component); add `sizes`/priority heuristics and LCP-aware loading for above-the-fold NFTs. |
| A27 | 🟡 | `app/[locale]/marketplace/[nftId]/NFTDetailClient.tsx` | Heavy client component; split into server component shell + streamed sections; prefetch adjacent NFTs for instant pagination. |
| A28 | 🟡 | `features/*/store/*Store.ts` (3 stores) | Zustand stores lack selectors/persistence middleware consistency; align on `createJSONStorage` + versioned migrations. |
| A29 | 🟡 | `lib/stores/preferences-store.ts` | Persisted preferences are unversioned; add schema version + migration path. |
| A30 | 🟡 | `components/ui/toast.tsx` | Toast system duplicates; check against sonner/radix pattern and unify accessibility (aria-live regions exist elsewhere — reuse `LiveRegion`). |
| A31 | 🟡 | `components/LazyLoading.tsx` + hooks | `useOptimizedFetch`/`useDebounce` test components committed (`hooks/DebounceTestComponent.tsx`, `OptimizedFetchTestComponent.tsx`); remove dev artifacts. |
| A32 | 🟡 | `components/navbar.tsx` + `account-entry-menu.tsx` | Two menus handle auth state separately; extract one `UserMenu` component fed by the auth store. |
| A33 | 🟡 | `app/[locale]/auth/*` screens | Login/register forms don't disable submit during pending; add loading/disabled states + success transitions (many tests exist; keep them green). |
| A34 | 🟡 | `lib/validation/auth.ts` | Client validation duplicated with `screens/Auth/utils/validation.ts` (mobile) — extract to `packages/shared-types` for a single source of truth. |
| A35 | 🟡 | `hooks/useTranslation.ts` + `locales/` | Translation keys drift risk; wire `validate-translations` into CI and lint for missing keys in components. |
| A36 | 🟡 | `app/[locale]/layout.tsx` + `TelemetryProvider.tsx` | Telemetry initialized unconditionally; gate on consent/`NEXT_PUBLIC_UI_TELEMETRY_ENABLED` at config load, not after mount. |
| A37 | 🟡 | `lib/telemetry/reliability/queue.ts` | Telemetry queue in `localStorage` can grow unbounded; cap entries and add TTL. |
| A38 | 🟡 | `app/[locale]/creator/[usernameOrId]/creator-profile-client.tsx` | Creator profile fetches on client only; add server-side prefetch/SSR metadata (creator SEO is a marketplace differentiator). |
| A39 | 🟡 | `components/InstallPrompt.tsx` | PWA install prompt shows without deferred-prompt eligibility checks on iOS; add `beforeinstallprompt` capture + dismissal memory. |
| A40 | 🟡 | `app/offline/page.tsx` | Offline page exists but no service worker actually serves it; wire the SW (see A5). |
| A41 | 🟡 | `components/marketplace/MarketplaceFilters.tsx` | Filters are URL-state only in some paths, local state in others; unify on URL search params for shareability/deep-linking. |
| A42 | 🟡 | `hooks/useBreakpoint.ts` + `utils/breakpoints.ts` | Breakpoint logic duplicated; consolidate and add SSR-safe hydration handling to avoid layout shift. |
| A43 | 🟡 | `components/ProtectedRoute.tsx` | Redirect-only protection; flashes protected content before redirect on slow loads; add loading skeleton state. |
| A44 | 🟡 | `lib/stellar/wallet/walletconnect.ts` | WalletConnect v1-era patterns; verify against current `@walletconnect` modal spec or remove dead code. |
| A45 | 🟡 | `lib/stellar/client.ts` | `allowHttp: network === "testnet"` — hardcoded; make it a build-time env flag. |
| A46 | 🟡 | `components/creator/creator-follow-button.tsx` | Optimistic update without rollback on error; add rollback + dedupe. |
| A47 | 🟡 | `components/Vault.tsx` | "Vault" component unclear/unused? Verify usage; remove or document. |
| A48 | 🟡 | `app/[locale]/marketplace/auction/[auctionId]/page.tsx` | Auction detail page missing real-time bid stream; subscribe to notifications gateway when available. |
| A49 | 🟢 | `components/web-vitals.tsx` | Web-vitals reporting exists but results not sampled/aggregated; add sampling and dashboard export. |
| A50 | 🟢 | `__mocks__/fileMock.js`, `babel.config.js`, `eslintrc.json` | Legacy tooling files (babel config + eslintrc) — migrate to the Next 13/ESLint flat config convention used by backend; verify jest uses `next/jest`-compatible config. |

---

## 3. Category B — Backend (50 items)

| # | Sev | Location | Issue → Recommended fix |
|---|-----|----------|--------------------------|
| B1 | 🔴 | `auth/auth.service.ts` + `frontend` | Wallet challenge/verify protocol mismatch (see A1/A2) — server returns `message`, client must sign exactly that; add a contract test (`verifyWalletChallenge` ↔ real signature). |
| B2 | 🔴 | `auth/auth.service.ts` `buildTokenPair` | JWT payload never includes `role`/`isBanned`; add `role` (and `isBanned` check at strategy) so `RolesGuard` works. |
| B3 | 🔴 | `auth/auth.service.ts` `linkWallet` | Queries `WalletSession` DB rows that are never created (`generateWalletChallenge` stores in Redis) → wallet linking to an existing account is broken. Unify on one challenge store. |
| B4 | 🔴 | `graphql/middleware/auth.middleware.ts`, `auth/jwt.strategy.ts` | Accept refresh tokens as access tokens; enforce `type === 'access'` in both paths and reject refresh tokens on protected routes. |
| B5 | 🔴 | `app.module.ts`, `graphql/graphql.module.ts` | `synchronize: true` in both TypeORM configs while raw-SQL migrations exist but are never executed. Set `synchronize: false`, `migrationsRun: true`, and register the migration files (or convert to TypeORM migrations). |
| B6 | 🟠 | `auth/auth.service.ts` `assertChallengeRateLimit` | In-memory unbounded `Map` — replace with Redis-based limiter shared with `RedisRateGuard`. |
| B7 | 🟠 | `common/guards/redis-rate.guard.ts` | Trusts `X-Forwarded-For` verbatim → spoofable. Use `req.ip` with `trust proxy` configured (and a proxy allowlist), or hash the real client IP. |
| B8 | 🟠 | `main.ts` | Two Nest apps (REST + GraphQL gateway) in one process with duplicated Postgres/Redis/JWT setup. Merge into one app with a single TypeORM/Redis connection and a GraphQL route, or run as separate processes with shared config. |
| B9 | 🟠 | `main.ts` | `X-Powered-By: Stellar-LumenMint` + platform version headers on every response — remove (info disclosure) and set `app.disable('x-powered-by')`. |
| B10 | 🟠 | `main.ts` | `json({ limit: '10mb' })` globally — reduce to ~1–2MB or scope large limits to upload routes only. |
| B11 | 🟠 | `modules/stellar/soroban.service.ts`, `marketplace-settlement.client.ts` | On-chain addresses (`bidder`, `buyer`, `seller`) are taken from request params, not bound to the authenticated user. Validate `bidder === request.user.walletAddress` before invoking contracts. |
| B12 | 🟠 | `modules/stellar/soroban.service.ts` `submitTransaction` | All contract submissions signed by hot `STELLAR_OPERATOR_SECRET`; moves to an explicit per-user signing flow (client signs, server only relays/verifies) or a KMS-backed signer. |
| B13 | 🟠 | `common/idempotency/idempotency.service.ts` | Fail-open on Redis errors — dangerous for money-moving ops (double-execution risk). Make fail-open configurable per route; fail-closed for payment/auction endpoints. |
| B14 | 🟠 | `common/outbox/outbox.service.ts` | `relayPendingEvents` has an in-process only guard — two instances relay the same event concurrently (double-publish). Add `FOR UPDATE SKIP LOCKED` row claim or Redis lease. |
| B15 | 🟠 | `common/queue`, `common/pipeline`, `common/idempotency`, `common/outbox`, `common/resilience` | All registered but unused by any business module. Either wire them into real flows (e.g., outbox for NFT events → Meilisearch, idempotency on payment routes) or remove them; dead infra is a maintenance tax. |
| B16 | 🟠 | `common/middleware/*` | `correlation-id`, `response-time`, `security-headers` middleware exist but are never registered in `main.ts`. Register them; add request IDs to pino logs (distributed tracing). |
| B17 | 🟠 | `common/filters/http-exception.filter.ts` | Hardcoded Spanish error messages (`'Error en la solicitud'`) in a multilingual product — make the filter locale-aware or use stable error codes only. |
| B18 | 🟠 | `admin/admin.controller.ts` + `RolesGuard` | Blocked by B2; after fixing role issuance, add tests for admin ban/unban flows. |
| B19 | 🟠 | `common/metrics/metrics.controller.ts` | Dual auth (broken RolesGuard + `?token=`) — pick one (token-only with constant-time compare via `crypto.timingSafeEqual`), and gate `/metrics` from the public router. |
| B20 | 🟠 | `auth/auth.service.ts` `refreshTokens` | No rotation/revocation: a leaked refresh token works for 7 days and survives password changes. Add rotation (issue new pair, invalidate old) + per-user token version/session table. |
| B21 | 🟠 | `auth/auth.service.ts` `registerWithEmail` | `isEmailVerified: false` but no verification flow exists and login doesn't check it. Add email verification (token + TTL + resend + rate limit) or drop the field. |
| B22 | 🟠 | `auth/auth.service.ts` | No server-side password policy (length/complexity), no breach-list check, no per-user login throttling beyond global rate limit. Add class-validator rules on DTOs + scrypt cost tuning (N=2^17). |
| B23 | 🟠 | `modules/stellar/soroban.service.ts` `toScVal` | `u32`/`u64`/`i128` casts via `Number`/`BigInt(String())` throw raw `RangeError`s on bad input → 500s. Validate ranges and throw `BadRequestException`. |
| B24 | 🟠 | `marketplace-settlement.client.ts` | `acceptOffer` returns `''` on missing XDR — an empty string hides failure. Throw a typed error instead. |
| B25 | 🟠 | `marketplace-settlement.client.ts` `executeSale`/`executeBundle`/`placeBid` | `amount` accepted with no numeric validation before `BigInt` — validate decimal string format/range in DTOs (see B23). |
| B26 | 🟠 | `app.module.ts` CacheModule | `cache-manager-redis-store` is legacy/unmaintained; migrate to `@keyv/redis` or ioredis-backed cache-manager v7 store. |
| B27 | 🟠 | `modules/bid/bid.service.ts` + `StellarSignatureGuard` | Signed bid messages (`bid:{auctionId}:{amount}`) have no nonce/timestamp → replayable; add expiry + nonce and bind `publicKey` to the authenticated user. |
| B28 | 🟡 | `common/pipes/validation.pipe.ts`, `main.ts` | `enableImplicitConversion: true` in the global pipe — type coercion can bypass validation; disable it and add explicit `@Type()` decorators. |
| B29 | 🟡 | `main.ts` Swagger | `/api/docs` exposed without auth in all envs; gate behind env flag or auth. |
| B30 | 🟡 | `graphql/graphql.module.ts` | GraphQL gateway also enables `GRAPHQL_PLAYGROUND_ENABLED`/`introspection` from env; enforce disabled in production explicitly. |
| B31 | 🟡 | `modules/notifications/notifications.gateway.ts` | WS auth verifies JWT but not `type === 'access'`; also add per-user connection cap and heartbeat timeout. |
| B32 | 🟡 | `modules/social/social.service.ts` | Follow/like endpoints need idempotency (double-tap creates dupes); add unique constraints + `ON CONFLICT DO NOTHING`. |
| B33 | 🟡 | `modules/order/order.service.ts`, `modules/payment/payment.service.ts` | Payment/order flows don't use the outbox/idempotency infra (see B15) — wire them; payments must be exactly-once. |
| B34 | 🟡 | `jobs/contract-event-indexer.job.ts` | Event indexer cursor handling — verify it persists `latestLedger` atomically per batch (crash-resume); add cursor checkpoint tests. |
| B35 | 🟡 | `search/search.service.ts` | `ensureSettings()` is memoized in-process only; concurrent workers each re-apply settings. Make it idempotent-safe or run once at startup. |
| B36 | 🟡 | `search/search.listener.ts` | Meilisearch re-index on entity events; verify it's wired to real module events (not just in-memory emitter) and handles delete events. |
| B37 | 🟡 | `storage/storage.service.ts` | Dedupe-by-hash returns the *original uploader's* record for a new uploader (misattribution). Store per-user references or return metadata only. |
| B38 | 🟡 | `storage/ipfs.service.ts`, `arweave.service.ts` | Upload retries use in-memory queue; for durable jobs move to outbox/DB queue (ties to B15). |
| B39 | 🟡 | `services/soroban-rpc.service.ts` | Retry config is static; expose via metrics and add circuit breaker around RPC calls (B15). |
| B40 | 🟡 | `modules/auction/auction.service.ts` | Auction settlement relies on contract; add server-side cron for ending expired auctions and reconciling off-chain state. |
| B41 | 🟡 | `modules/listing/listing.service.ts`, `modules/offer/offer.service.ts` | Same reconciliation gap for listings/offers; add state machine consistency checks vs on-chain events. |
| B42 | 🟡 | `seed.ts` | Seed script not wired to any npm script in a usable way and may not match current schema; document + align with migrations. |
| B43 | 🟡 | `common/audit/audit.service.ts` | Audit log writes user agent/IP; verify it redacts PII and is wired to admin actions (currently only partially). |
| B44 | 🟡 | `config/cors.config.ts` | `CORS_ORIGIN` vs `CORS_ALLOWED_ORIGINS`/`CORS_ORIGIN_DEV` overlap confusing; document precedence and validate URLs at startup (regex, not `new URL` without scheme). |
| B45 | 🟡 | `main.ts` CORS | `exposedHeaders` lists `X-Content-Type-Options`/`X-Frame-Options` — those are response headers, not CORS-exposed headers; clean up. |
| B46 | 🟡 | `graphql/resolvers/*` | Resolver auth via middleware only; add `@Guard`-style field-level protection and depth/alias attack protection on the Apollo server. |
| B47 | 🟡 | `graphql/loaders/*` | Dataloaders exist — verify N+1 coverage on collection→NFT→owner chains with a perf test (`BENCHMARK.md` exists; wire it into CI). |
| B48 | 🟡 | `modules/collection/analytics-cron.job.ts` | Analytics cron recomputes stats; add lock to prevent overlap and backfill logic for missed days. |
| B49 | 🟡 | `jobs/dlq-retry.worker.ts` | DLQ retry worker — add max-age poisoning guard (drop events older than N days) and DLQ metrics. |
| B50 | 🟢 | `app.controller.ts`, `app.service.ts`, `health/` | Health checks don't include Redis/Postgres/Meilisearch dependencies; add readiness probes for each (needed for K8s/deploy workflow). |

---

## 4. Category C — Smart Contracts (50 items)

*Grounding note: deep-read `nft_contract` (lib/storage), `collection_factory` (factory), `marketplace_settlement` (settlement_core); remaining items marked "verify" reference files inspected structurally.*

| # | Sev | Location | Issue → Recommended fix |
|---|-----|----------|--------------------------|
| C1 | 🔴 | `marketplace_settlement/src/settlement_core.rs` | `emergency_withdrawal_enabled: true` hardcoded at `initialize` — emergency withdrawal should be explicitly enabled later by governance, not default-on at deploy. |
| C2 | 🔴 | `marketplace_settlement` — verify `execute_sale`/`execute_bundle` | Confirm `buyer.require_auth()` (or the operator) is enforced before transferring NFT + paying seller; add a test for unauthenticated execution. |
| C3 | 🟠 | `collection_factory/src/factory.rs` `verify_factory_origin` | Invokes `is_fact` on an *arbitrary caller-supplied* contract — a malicious contract can return `true`; treat as advisory only or check deployer via `env.deployer()` provenance. |
| C4 | 🟠 | `collection_factory/src/factory.rs` | `get_collections_by_factory` iterates all collections — unbounded loop; add pagination (`start`, `limit`). |
| C5 | 🟠 | `marketplace_settlement/src/settlement_core.rs` `get_supported_assets` | Assets stored as a single growing `Vec` — O(n) rewrite per add; switch to keyed map + capped list views. |
| C6 | 🟠 | `marketplace_settlement/src/settlement_core.rs` `add_supported_asset` | O(n) scan per add with no upper bound; cap supported assets (e.g., 64) and use a map keyed by asset. |
| C7 | 🟠 | `collection_factory/src/factory.rs` `initialize` | `fee_asset` accepted without validation — verify it's a token contract (check `balance` call) before use. |
| C8 | 🟠 | `nft_contract/src/token.rs` — verify | `mint` must enforce `IsPaused` and `MAX_SUPPLY_HARD_CAP` (1,000,000) on every path incl. `batch_mint`; add tests for paused mint. |
| C9 | 🟠 | `nft_contract/src/storage.rs` | Batch rate limiting via `LastBatchTime`/`BatchCount` — verify it resets correctly per window and can't be bypassed by alternating callers. |
| C10 | 🟠 | `marketplace_settlement/src/auction_engine.rs` — verify | No anti-sniping extension (bids in last N blocks extend auction). Standard for auctions; add or document the design decision. |
| C11 | 🟠 | `marketplace_settlement/src/security/rate_limiter.rs` | Per-address on-chain rate limits are coarse; verify limits are enforced on *writes only* and can't be gamed by splitting accounts. |
| C12 | 🟠 | `marketplace_settlement/src/dispute_resolution.rs` | `arbitration_quorum: 3` is fixed at initialize and there's no on-chain arbitrators list management — verify arbitrators can be set and rotated. |
| C13 | 🟠 | `transaction_contract/src/security/resource_guard.rs` | Verify max operations/footprint enforced *before* any state mutation (guard ordering). |
| C14 | 🟠 | `transaction_contract/src/execution_engine.rs` | Multi-op transactions must validate all ops before executing any (atomicity) — verify + test partial-failure rollback. |
| C15 | 🟠 | `nft_contract/src/upgrade.rs` | Upgrade path allows arbitrary storage-version jumps; restrict to +1 migration chain and add migration tests. |
| C16 | 🟠 | `nft_contract/src/royalty.rs` | `MAX_ROYALTY_BPS = 10_000` (100%) allowed per token — consider capping at 25–50% and enforcing on marketplace settlement too. |
| C17 | 🟠 | `marketplace_settlement` `AdminConfig.max_royalty_percentage: 5000` | 50% royalty ceiling — confirm product intent; otherwise lower. |
| C18 | 🟡 | All contracts | No fuzz/property tests (`proptest`) on amounts/addresses/edge timestamps; add property tests for math utils (`math_utils`), fee splits, and royalty math (rounding must always favor seller, never lose value). |
| C19 | 🟡 | All contracts | No invariant tests asserting storage invariants (e.g., total_supply == sum of balances). Add a post-condition test suite. |
| C20 | 🟡 | `Cargo.toml` | `soroban-sdk = "23"` pinned to major only — pin exact patch version for reproducible builds (lockfile exists, but workspace dep should be precise). |
| C21 | 🟡 | `contracts/*/Cargo.toml` | Add `rust-version`, lints (`#![warn(clippy::pedantic)]` where reasonable), and deny `unsafe` code attributes. |
| C22 | 🟡 | `marketplace_settlement/src/fee_manager.rs` | Verify fee recipient/collector is a settable address with only-admin auth; add withdrawal cap per period. |
| C23 | 🟡 | `marketplace_settlement/src/pause_manager.rs` | Per-module pause exists — add a global emergency pause and a `deadline`-style timelock for pause toggling. |
| C24 | 🟡 | `marketplace_settlement/src/security/reentrancy_guard.rs` | Guard is per-transaction; verify it also protects cross-contract calls (token transfers that invoke back). |
| C25 | 🟡 | `marketplace_settlement/src/security/frontrun_protection.rs` | Commitment-reveal bids exist; verify the commitment is bound to the auction id + bidder and that reveal enforces minimum increment. |
| C26 | 🟡 | `marketplace_settlement/src/atomic_swap.rs` | Atomic swap of NFTs between arbitrary contracts — verify both tokens are *known/allowlisted* to avoid swapping for fake tokens. |
| C27 | 🟡 | `marketplace_settlement/src/settlement_core.rs` | No `get_fee_config` view / admin-config update functions visible; add getters + events for config changes (auditability). |
| C28 | 🟡 | `marketplace_settlement` events | Emit events for *all* admin actions (fee changes, pause, blocklist, allowlist, withdrawal) — audit trail. |
| C29 | 🟡 | `nft_contract/src/events.rs` | Verify transfer events include `from`, `to`, `token_id`, and a block/ledger reference for off-chain indexers. |
| C30 | 🟡 | `nft_contract/src/metadata.rs` | `set_token_uri`/`set_base_uri` must be blocked when `MetadataFrozen`; verify freeze is irreversible and covered by tests. |
| C31 | 🟡 | `nft_contract/src/transfer.rs` | ERC-721-style `safe_transfer_from` — verify the `to` address is checked (contract vs account) to avoid burning NFTs to contracts. |
| C32 | 🟡 | `nft_contract/src/access_control.rs` | Roles are `u32` discriminants — verify `has_role` is checked in *every* guarded path incl. `set_pause`/`grant_role`/`revoke_role`. |
| C33 | 🟡 | `collection_factory` | `create_collection` deploys with caller-chosen `salt` — two failed deploys with same salt could cause address collisions; document/validate salt uniqueness. |
| C34 | 🟡 | `collection_factory` | Overflow-fee path charges a flat fee; consider per-tier pricing and `MaxCollectionsPerCreator` upgrade path (exists via `update_creator_limit` — good; add timelock). |
| C35 | 🟡 | `collection_factory` | `withdraw_fees` only allows `to == admin` — allow a designated treasury address distinct from admin. |
| C36 | 🟡 | `transaction_contract/src/signature_manager.rs` | Multi-sig thresholds — verify threshold can't be set to 0 and quorum changes require current quorum. |
| C37 | 🟡 | `transaction_contract/src/recovery_system.rs` | Recovery timelock — verify recovery can't be triggered before timelock and cancels pending ops. |
| C38 | 🟡 | `transaction_contract/src/gas_optimizer.rs` | Verify it doesn't reorder state-mutating ops in a way that breaks atomicity (see C14). |
| C39 | 🟡 | `transaction_contract/src/utils/parameter_encoder.rs` | Parameter length limits before encode to avoid gas bombs; verify. |
| C40 | 🟡 | All contracts — `version()` | Version strings embed build info; ensure `get_version` doesn't leak deployment-time info that aids targeting (acceptable — keep). |
| C41 | 🟡 | `marketplace_settlement/src/utils/math_utils.rs` | Verify all percentage/bps math uses checked mul/div ordering to avoid precision loss; add exhaustive boundary tests (0, 10000, i128::MAX). |
| C42 | 🟡 | `marketplace_settlement/src/utils/time_utils.rs` | Auction/sale expiry uses ledger timestamps — verify `expires_at > now` on create and monotonic handling. |
| C43 | 🟡 | `deployments/manifest.json` | Empty deployments manifest; add deployment recording script output so deploys are reproducible and auditable. |
| C44 | 🟡 | `scripts/deploy_all.sh` | Deploy scripts shell-only; add `set -euo pipefail`, env validation, and require explicit `--network` flag (avoid accidental mainnet deploys). |
| C45 | 🟡 | `soroban/scripts/verify_contract.sh` | Verify script exists — wire it into CI after deploy and assert `version()` matches git SHA. |
| C46 | 🟡 | CI workflow `stellar-lumenmint-soroban.yml` | Ensure it runs `cargo test --workspace` *and* `cargo clippy -- -D warnings` (many repos skip clippy denial); make failures hard. |
| C47 | 🟡 | `SECURITY.md` / `CONTRACT_INVARIANTS.md` | Docs exist — add a threat-model section and link each invariant to its test (traceability matrix). |
| C48 | 🟡 | `nft_contract/src/test/benchmarks.rs` | Benchmarks not run in CI; add a budget-check job (e.g., wasm size < 64KB, storage ops bounds). |
| C49 | 🟢 | `contracts/*/Makefile` | Makefiles use `cargo build` directly; standardize on `soroban contract build` and pin toolchain (rust-toolchain.toml). |
| C50 | 🟢 | `marketplace_settlement/src/main.rs` | A `main.rs` exists in a `no_std` contract — verify it's only for tests/build tooling and doesn't ship in the wasm (strip if so). |

---

## 5. Category D — Codebase / Architecture (50 items)

| # | Sev | Location | Issue → Recommended fix |
|---|-----|----------|--------------------------|
| D1 | 🟠 | `backend/src/nft/` vs `backend/src/modules/nft/` | Two NFT modules; `src/nft` is orphaned (AppModule imports `modules/nft`). Delete `src/nft` after confirming no imports. |
| D2 | 🟠 | `backend/src/shared/contracts/marketplace-settlement.types.ts` vs `backend/src/modules/shared/contracts/…` | Duplicate contract types that have already diverged; keep one and re-export. |
| D3 | 🟠 | `mobile-app/stores/authStore.ts` vs `mobile-app/src/stores/authStore.ts` | Duplicate mobile auth store; consolidate. |
| D4 | 🟠 | `mobile-app/screens/Auth/*` vs `mobile-app/src/screens/auth/*` | Two full auth screen trees; keep the `src/` one (has tests), remove the other. |
| D5 | 🟠 | `mobile-app/hooks/useAuth.ts`, `App.tsx`, `app/_layout.tsx` vs `src/` | Multiple entry/nav conventions in the same app; pick one (Expo Router vs manual navigators) and delete the other. |
| D6 | 🟠 | 11 `sample.*` files | `mobile-app/lib/wallet/sample.ts`, `lib/api/sample.ts`, `screens/*/sample.tsx`, `app/auth/sample.tsx`, `app/tabs/sample.tsx`, `screens/Home/sample.tsx` etc. — placeholder code shipped to users. Delete all. |
| D7 | 🟠 | Root `package-lock.json` (96B stub) | Empty `packages: {}` lockfile breaks root tooling; remove it or generate a real monorepo lockfile. |
| D8 | 🟠 | Root | No root `package.json`; add one with workspace scripts (test-all, lint-all, typecheck-all) so contributors have one entry point. |
| D9 | 🟠 | `README.md` + `packageManager` fields | `pnpm@10.26.1` declared in backend/frontend but README instructs `npm ci` per workspace and repo ships npm lockfiles; pick one package manager and standardize CI. |
| D10 | 🟠 | `frontend/.env.local` | Committed to git (`.gitignore` misses `.env.local`); remove from history, add `!.env.example` guard + `.env.local` to frontend `.gitignore`. |
| D11 | 🟠 | `backend/migrations/` | Three `create_collections` migrations (`20260325100000`, `20260326020000`, `20260328000000`) + duplicate timestamp prefix `20260325010000` used by both `listings` and `orders` — dedupe, order, and make TypeORM run them (B5). |
| D12 | 🟡 | `backend/src/users/` vs `backend/src/modules/` | Auth/users split across `src/users`, `src/auth`, `src/modules/*` — consolidate shared entities into a coherent `modules/` layout. |
| D13 | 🟡 | `backend/src/modules/shared/` | Module-named `shared` folder is a smell; move shared contracts to `src/common/contracts`. |
| D14 | 🟡 | `frontend/hooks/graphql/generated.ts` | ~large generated file committed; add a codegen freshness CI check (A14). |
| D15 | 🟡 | `backend/src/common/README.md`, `common/*/README.md` | 8 READMEs documenting infra that isn't wired (see B15) — keep only if code is wired; otherwise remove both code and docs. |
| D16 | 🟡 | `backend/README-SETUP.md` + `backend/README.md` | Two backend READMEs; merge or delete the redundant one. |
| D17 | 🟡 | `backend/verify-auth.js` | Standalone verification script at backend root, undocumented; move to `scripts/` with usage docs or remove. |
| D18 | 🟡 | `frontend/components/ui/styled-button.tsx` vs `button.tsx` | Two button components; consolidate on the `cva`-based one. |
| D19 | 🟡 | `frontend/lib/stores/` vs `frontend/stores/` vs `frontend/features/*/store/` | Three store locations; standardize on `lib/stores` + feature stores only. |
| D20 | 🟡 | `frontend/utils/` vs `frontend/lib/utils.ts` | Duplicate `utils`; merge into `lib/utils` with submodules. |
| D21 | 🟡 | `mobile-app/hooks/`, `mobile-app/lib/`, `mobile-app/src/`, `mobile-app/components/`, `mobile-app/screens/`, `mobile-app/navigation/` | Six top-level source dirs; flatten to `src/` with feature folders. |
| D22 | 🟡 | `admin/src` | Admin is small (8 files) — consider folding into `frontend/` workspace or documenting it as standalone; currently unmanaged deps (no lint/test scripts beyond vitest). |
| D23 | 🟡 | `packages/package.json` | Root packages workspace only has stub-ish scripts? Verify `build`/`test` scripts exist for each package and CI matrix runs them (workflow exists — confirm paths). |
| D24 | 🟡 | `packages/sdk/src/legacy.ts` | Legacy API surface; document deprecation and add migration guide (README exists — verify content parity). |
| D25 | 🟡 | `packages/ai/src/index.ts` | AI package (metadata generation) — no tests; add unit tests with mocked providers. |
| D26 | 🟡 | `packages/cli/src/index.ts` | CLI untested; add smoke tests for help/deploy dry-run. |
| D27 | 🟡 | `backend/src/app.controller.spec.ts` + `app.controller.ts` | Health/app controllers minimal; add readiness integration checks (B50). |
| D28 | 🟡 | `frontend/eslintrc.json` | ESLint 8 config file named `eslintrc.json` (not `.eslintrc.json`?) — verify it's picked up; migrate to flat config like backend. |
| D29 | 🟡 | `frontend/babel.config.js` + `jest.config` absent | Jest likely relies on `babel.config.js`; add explicit `jest.config.js` with `next/jest` and SWC for consistency with `@swc/jest` dep. |
| D30 | 🟡 | `frontend/codegen.ts` + `graphql:codegen` | Codegen requires a running backend schema; document a `schema.graphql` file source-of-truth in repo (backend has `graphql/schema.graphql` — wire codegen to it). |
| D31 | 🟡 | `frontend/components.json` + `shadcn-ui` dep | shadcn components partially vendored; remove the runtime `shadcn-ui` dependency. |
| D32 | 🟡 | `backend/tsconfig.json` vs `tsconfig.build.json` | Verify `exclude` correctness (specs excluded from build); add `noUnusedLocals`/`noUnusedParameters` strictness. |
| D33 | 🟡 | `backend/eslint.config.mjs` | `--fix` in the `lint` npm script mutates files on lint; separate `lint` (check) from `lint:fix`. |
| D34 | 🟡 | `backend/nest-cli.json` | Verify sourceRoot/collection defaults match `src/` layout after D12 consolidation. |
| D35 | 🟡 | `frontend/app/layout.tsx` vs `app/[locale]/layout.tsx` vs `app/page.tsx` | Root layout + locale layout duplication; verify metadata/i18n precedence and static generation config (`dynamicParams`). |
| D36 | 🟡 | `frontend/app/[locale]/auth/logged-in/types/index.ts` | Page-local types duplicating `types/`; move to shared types. |
| D37 | 🟡 | `frontend/types/api.ts` vs `types/marketplace.ts` vs `types/stellar.ts` | API types duplicated with generated `hooks/graphql/generated.ts`; define the boundary (generated wins, hand-written only for non-GraphQL REST). |
| D38 | 🟡 | `frontend/lib/config.ts` | `API_CONFIG` reads `NEXT_PUBLIC_*` — centralize and validate at build time (fail build on missing required env in production). |
| D39 | 🟡 | `backend/src/modules/transaction/` (11 DTO files) | Transaction module has many thin DTOs; add a shared `pagination` DTO base class. |
| D40 | 🟡 | `backend/src/modules/collection/__tests__/` | Test dirs mixed: `__tests__/`, `*.spec.ts`, `*.test.ts`, `*.controller.test.ts` — standardize on `*.spec.ts` in `src` (matches jest config). |
| D41 | 🟡 | `backend/test/setEnv.ts` + `jest-e2e.json` | E2E setup env-dependent; document required services (Postgres/Redis) in TESTING.md and add a CI e2e job. |
| D42 | 🟡 | `frontend/e2e/*.spec.ts` | Only 2 Playwright specs; add auth + mint + auction flows; wire into CI (workflow references? verify frontend workflow runs e2e). |
| D43 | 🟡 | `backend/src/graphql/schema.graphql` | Committed schema may drift from resolvers; add schema drift check (codegen against resolvers vs file). |
| D44 | 🟡 | `backend/src/graphql/resolvers/base.resolver.ts` | `health` query on GraphQL root — move to dedicated resolver and gate introspection. |
| D45 | 🟡 | `scripts/setup-dev.sh`, `seed-db.sh`, `deploy-contracts.sh` | Root scripts underdocumented and may conflict with `soroban/scripts/*`; document or consolidate into a `Makefile`/`turbo` pipeline. |
| D46 | 🟡 | `.vscode/` | Check for machine-specific settings committed; add `*.code-workspace` to gitignore. |
| D47 | 🟡 | `LICENSE` (MIT) + `CONTRIBUTING.md` | Good docs exist — add DCO/CLA note and CODEOWNERS. |
| D48 | 🟡 | `.github/workflows/README.md` | Documents pipeline architecture — update it to reflect the fixes in B15/D11 (docs parity). |
| D49 | 🟢 | `frontend/package.json` `analyze` script | Uses `ANALYZE=true` but no `@next/bundle-analyzer` dep; fix or remove. |
| D50 | 🟢 | `frontend/cors.json` | Unused `cors.json` in frontend root; remove or document (CORS is a backend concern). |

---

## 6. Category E — General / Engineering (50 items)

| # | Sev | Location | Issue → Recommended fix |
|---|-----|----------|--------------------------|
| E1 | 🔴 | All CI workflows | Every verification step ends in `|| echo "::warning::…"` → green CI on failure. Make typecheck/lint/test/build **hard-fail**; keep warnings only for optional checks. |
| E2 | 🔴 | `stellar-lumenmint-backend.yml` | `cache-dependency-path` references `backend/pnpm-lock.yaml` (doesn't exist) — fix paths per actual lockfiles. |
| E3 | 🟠 | All workflows | Only `backend/**` has path filters checked; verify all 8 workspace workflows actually match their workspace paths and run on PRs. |
| E4 | 🟠 | No workflow | No dependency-bump automation; add Dependabot (weekly, grouped) for npm/cargo/GitHub Actions. |
| E5 | 🟠 | No workflow | No secret scanning; add Gitleaks/TruffleHog step to CI + pre-commit. |
| E6 | 🟠 | `stellar-lumenmint-security.yml` | Security scan runs weekly only and CodeQL is the only SAST; add `npm audit`/`cargo audit` on every PR (fast mode). |
| E7 | 🟠 | `stellar-lumenmint-release.yml` | Verify release job only publishes to GHCR on tags and uses `GITHUB_TOKEN` scoped minimally; add a **dry-run** mode. |
| E8 | 🟠 | `stellar-lumenmint-deploy.yml` | Manual deploy to staging/production with health checks — verify it requires explicit approval environment and pins commit SHAs. |
| E9 | 🟠 | Repo root | No root `SECURITY.md`/`VULNERABILITY.md` policy — add (soroban has one; product-wide is missing). |
| E10 | 🟠 | `backend/Dockerfile` | Backend-only Dockerfile; frontend/admin/mobile have no container images — add multi-stage Dockerfiles or document deploy target. |
| E11 | 🟠 | `backend/docker-compose.yml` | Compose includes Postgres/Redis/Meilisearch? Verify healthchecks + volumes + no default credentials. |
| E12 | 🟡 | Observability | No OpenTelemetry tracing; add OTel instrumentation to backend (HTTP, GraphQL, Soroban RPC spans) with the existing Prometheus metrics. |
| E13 | 🟡 | Observability | Pino logs lack request IDs (correlation middleware exists but unused — B16); add `reqId` to all log records. |
| E14 | 🟡 | Observability | No error tracking (Sentry/Bugsnag); add to backend + frontend with PII scrubbing. |
| E15 | 🟡 | `metrics` | `MetricsInterceptor` exists; verify metrics cover DB query latency, Redis, RPC, GraphQL resolver timings — add missing. |
| E16 | 🟡 | `graceful-shutdown.ts` | Lifecycle hook exists; verify it drains HTTP + WS + Redis + DB connections in order and is registered (it's in `common/lifecycle` — confirm `app.enableShutdownHooks()` is called in main.ts; it is not visible). |
| E17 | 🟡 | Rate limiting | RedisRateGuard is global — GraphQL gateway has no rate limit; add `@graphql`-scoped limiting + auth-endpoint specific limits. |
| E18 | 🟡 | Auth | No account enumeration hardening (login error is uniform — good); add timing-safe login path for non-existent users. |
| E19 | 🟡 | Auth | No MFA/2FA option; roadmap item — TOTP for email accounts. |
| E20 | 🟡 | Auth | No session invalidation on password change; add token-version claim and bump on password/email change. |
| E21 | 🟡 | Secrets | `.env.example` contains a real-looking `COLLECTION_FACTORY_CONTRACT_ID` and a placeholder `TRANSACTION_CONTRACT_ID` — document rotation/verification; ensure prod secrets only via CI secrets. |
| E22 | 🟡 | Secrets | Soroban operator key in env only — add key-rotation runbook + `STELLAR_OPERATOR_PUBLIC_KEY` consistency check at startup. |
| E23 | 🟡 | Deploy | No IaC (Terraform/K8s manifests) for Postgres/Redis/Meilisearch; add or document managed-service plan. |
| E24 | 🟡 | Deploy | No blue/green or canary strategy documented in `stellar-lumenmint-deploy.yml` — add rollback verification step. |
| E25 | 🟡 | Monitoring | No uptime checks (Synthetics) on REST + GraphQL + WS endpoints; add synthetic health checks. |
| E26 | 🟡 | Alerts | Metrics exist but no alerting rules (e.g., p95 latency, RPC error rate, queue depth); add Prometheus alert rules + runbook links. |
| E27 | 🟡 | Testing | No coverage thresholds anywhere; add per-workspace coverage gates (e.g., ≥70% for critical modules) and publish coverage reports. |
| E28 | 🟡 | Testing | E2E for marketplace (Playwright) only 2 specs; add wallet-signup, mint, list, bid flows (ties to A42/D42). |
| E29 | 🟡 | Testing | Mobile app tests use mocked expo-secure-store; add device-flow tests for biometrics + deep links. |
| E30 | 🟡 | Testing | No contract integration test against a local Soroban devnet in CI; add `soroban dev` + contract-deploy + happy-path test job. |
| E31 | 🟡 | Docs | README claims "production-grade" and lists features (auctions, push notifications) — verify parity; where features are partial, mark them alpha. |
| E32 | 🟡 | Docs | `plan.md` claims "All 57 test suites passing (242 tests)" — CI doesn't verify this (E1); add a `test-all` script that actually runs everything and enforces it. |
| E33 | 🟡 | Versioning | No CHANGELOG automation wired to conventional commits (release workflow mentions changelog — verify it runs `standard-version`/`semantic-release`); add if missing. |
| E34 | 🟡 | Versioning | Monorepo versioning strategy undefined (packages all `0.x`, backend `0.0.1`); adopt fixed-version or per-workspace with changelogs. |
| E35 | 🟡 | PR hygiene | No PR template; add one with test/security checklist. |
| E36 | 🟡 | PR hygiene | No branch protection docs for `main` (CI + review + up-to-date); document required status checks matching the fixed workflows. |
| E37 | 🟡 | Issue hygiene | No issue templates (bug/feature/security); add them. |
| E38 | 🟡 | Dependency hygiene | `frontend` pins `tailwindcss 3.3.3` + `@tailwindcss/postcss 4.0.15` together — version skew; align Tailwind v3 or v4 consistently. |
| E39 | 🟡 | Dependency hygiene | `next 13.5.1` is old (known CVEs fixed in 13.5.x patch line); bump to latest 13.5.x/14.x after verifying `serverActions` behavior change. |
| E40 | 🟡 | Dependency hygiene | `stellar-sdk ^13.3.0` (backend) vs `@stellar/stellar-sdk ^14.6.1` (frontend) — two SDK majors; unify. |
| E41 | 🟡 | Dependency hygiene | `eslint 8.49.0` (frontend) vs `eslint 9` (backend) — two majors; unify to flat config. |
| E42 | 🟡 | Node versions | `.nvmrc` says 20, workflows use 20, environment/README say 20+ — standardize and add `engines` field to workspaces. |
| E43 | 🟡 | Local dev | `docker-compose` only covers backend deps; add a dev script that starts frontend/admin/mobile against it (`scripts/setup-dev.sh` exists — verify it works end-to-end). |
| E44 | 🟡 | Performance | Frontend bundle: multiple heavy libs (gsap, framer-motion, lottie×2); add bundle-budget CI (webpack-bundle-analyzer is a dep — wire `analyze`). |
| E45 | 🟡 | Performance | Backend GraphQL N+1 risk mitigated by loaders (good) — add an Apollo usage-reporting/`@apollo/server` plugin for cost limits. |
| E46 | 🟡 | Performance | Meilisearch sync on every NFT write without batching; batch by 100ms debounce or outbox (ties to B15). |
| E47 | 🟡 | Compliance | No privacy policy/terms in repo; add links + cookie/consent handling for telemetry (PostHog) — GDPR basics. |
| E48 | 🟡 | Compliance | Telemetry data retention/config not documented; add `lib/telemetry/config.ts` retention + opt-out docs. |
| E49 | 🟢 | Developer experience | No `Makefile`/task runner at root (see D45) — add `make dev/test/lint` aliases. |
| E50 | 🟢 | Developer experience | No pre-commit hooks config (husky/lint-staged) despite existing tooling; add to catch lint/secret/format issues pre-push. |

---

## 7. Cross-Cutting Systemic Issues (the "why" summary)

1. **Enforcement is fake until it's wired.** The largest bucket of work is not writing new features — it's connecting existing, well-built components (outbox, idempotency, circuit breaker, security middleware, audit, roles, CI gates) to the code paths that matter (payments, auctions, admin, deploys). Half the "infrastructure" in this repo is museum-grade.
2. **Identity is not bound to on-chain actions.** Wallet signatures are treated as proof of account, but the signed message formats disagree between client and server, the bid guard ignores the authenticated user, and the operator key signs everything server-side. Fixing B1/B2/B3/B11/B12 is the single highest-value workstream.
3. **CI gives zero protection today.** Everything `|| echo warning`. Any of the 250 items is worthless if regressions can merge silently.
4. **Duplication is the tax on future work.** At least 8 parallel module/store trees will keep drifting; consolidation (Category D) prevents bugs like A8/A9/D1–D5 from recurring.

---

## 8. Prioritized Rollout Plan

### Phase 0 — P0 (Security & correctness, ~20 items) — *do first*
Frontend: A1, A2, A3, A4, A6 · Backend: B1, B2, B3, B4, B5, B6, B7, B11, B12, B20, B21 · Contracts: C1, C2 · General: E1, E2

### Phase 1 — P1 (Reliability & hardening, ~40 items)
Frontend: A5, A7, A8, A9, A10, A11 · Backend: B8, B9, B10, B13–B19, B22–B27 · Contracts: C3–C10 · Codebase: D1–D11 · General: E3–E11

### Phase 2 — P2 (Quality of life, scale, docs — remainder)
Everything else, batched per category.

### Execution mechanics (for the implementation phase)
- **One commit per item**, conventional commit format: `fix(backend): reject refresh tokens on protected routes` / `feat(frontend): use server-issued challenge message for wallet auth`.
- **Batch of 20 per push**, ordered P0 → P1 → P2; push to `main` only after the batch's workspace checks pass (typecheck + tests + build for the touched workspaces).
- **Verify per workspace**: backend `npm run test && npx tsc --noEmit && npm run build`; frontend `npm test && next build`; soroban `cargo fmt --check && cargo clippy -- -D warnings && cargo test --workspace`.
- **New code must be test-first where behavior changes** (especially B1–B5: add a failing test, then fix).
- Do **not** bundle multiple improvements into one commit; each commit must stand alone and keep the tree green.

### Suggested first batch (P0, 20 items — security first)
1. `fix(backend): issue role claim in JWTs and reject refresh tokens as access tokens` (B2+B4)
2. `fix(frontend): sign the server-issued challenge message for wallet auth` (A1)
3. `fix(frontend): match Freighter signing to backend verification scheme` (A2)
4. `fix(backend): unify wallet challenge store so linkWallet works` (B3)
5. `fix(backend): disable TypeORM synchronize and wire real migrations` (B5)
6. `fix(backend): move challenge rate limiting to Redis` (B6)
7. `fix(backend): stop trusting X-Forwarded-For in rate limiting` (B7)
8. `fix(backend): bind on-chain bidder/buyer to the authenticated user` (B11)
9. `fix(backend): stop signing all Soroban txs with the operator key; add per-user signing flow` (B12)
10. `feat(backend): rotate and revoke refresh tokens` (B20)
11. `feat(backend): add email verification flow` (B21)
12. `fix(contracts): require explicit enable for emergency withdrawal` (C1)
13. `test(contracts): add auth-negative tests for execute_sale/execute_bundle` (C2)
14. `fix(ci): make backend typecheck/lint/test/build hard-fail` (E1)
15. `fix(ci): correct cache-dependency-path and per-workspace filters` (E2)
16. `fix(backend): add correlation/security middleware registration and request IDs` (B16)
17. `fix(frontend): remove committed .env.local and fix .gitignore` (D10)
18. `fix(backend): harden rate limiting + remove X-Powered-By branding` (B9+B27)
19. `fix(frontend): add missing security headers and disable poweredByHeader` (A4)
20. `chore: add gitleaks secret scan to CI and pre-commit` (E5)

---

## 9. Quick reference — files that need the most attention

| File | Why |
|------|-----|
| `backend/src/auth/auth.service.ts` | B1, B3, B6, B20, B21, B22 |
| `backend/src/main.ts` | B8, B9, B10, B16, B28, B29, B45 |
| `backend/src/common/guards/redis-rate.guard.ts` | B7 |
| `backend/src/app.module.ts` + `graphql/graphql.module.ts` | B5, B8, B46 |
| `frontend/lib/stellar/auth/nonce.ts`, `components/wallet/hooks/useStellarAuth.ts` | A1, A2 |
| `frontend/lib/api/fetchWithAuth.ts` | A3 |
| `frontend/next.config.js` | A4, A5 |
| `soroban/contracts/marketplace_settlement/src/settlement_core.rs` | C1–C6 |
| All 8 `.github/workflows/*.yml` | E1, E2, E3, E5 |
| `frontend/.env.local`, `frontend/.gitignore` | D10 |
| `backend/migrations/*.sql` | D11, B5 |

---

*End of analysis. Sections 2–6 contain the 250 items (50 per category). Phase 0 items (P0) are the recommended starting batch of 20.*