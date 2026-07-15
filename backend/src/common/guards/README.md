# Guards

NestJS guards for request authorization and rate limiting.

## Redis Rate Guard

`RedisRateGuard` — Rate limits API requests using Redis counters.

```typescript
@UseGuards(RedisRateGuard)
@Controller('api')
```

Configured via `RATE_LIMITS` in shared-types constants. Returns `429 Too Many Requests` when exceeded.

## JWT Auth Guard

`JwtAuthGuard` — Validates JWT tokens on protected endpoints.

```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@Request() req) { return req.user; }
```

Extended by `GqlAuthGuard` for GraphQL resolvers.

## CSRF Protection

CSRF tokens are validated on state-changing endpoints (POST, PUT, DELETE). Tokens are generated per-session via the `CSRFTOKEN` utility and included in request headers as `X-CSRF-Token`.
