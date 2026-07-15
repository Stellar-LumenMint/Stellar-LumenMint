# Configuration

Environment-based configuration for the LumenMint backend.

## Stellar Config

Resolved from `getStellarConfig()` with validation:

```typescript
{
  network: 'TESTNET' | 'MAINNET',
  sorobanRpcUrl: string,
  horizonUrl: string,
  defaultTimeoutMs: number,
  sorobanRpcUrlIsFallback: boolean,
}
```

## CORS

CORS origins are configured via `CORS_ORIGIN` env var (comma-separated). The `CorsConfig` helper validates and normalizes URLs.

## CSRF Protection

CSRF tokens are generated per-session and validated on state-changing requests via the `CSRFTOKEN` utility.

## Environment Variables

See `.env.example` for all configuration options including:
- Database (Postgres connection pool)
- Redis (cache + queue)
- Meilisearch (full-text search)
- Stellar/Soroban (network, RPC, contract IDs)
- JWT (secret, expiry times)
- Stripe (payment integration)
