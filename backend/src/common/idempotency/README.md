# Idempotency Module

Ensures safe retries by preventing duplicate processing of the same request.

## How It Works

Uses Redis `SET NX` (atomic set-if-not-exists) to track idempotency keys:

```typescript
const key = `idempotency:${requestId}`;
const success = await redis.set(key, 'processing', 'NX', 'EX', ttl);
if (!success) throw new ConflictException('Duplicate request');
```

## API

```typescript
import { IdempotencyService } from './idempotency.service';

// Check and set a key atomically
const ok = await idempotency.checkAndSet('req-123', 3600);

// Check if key exists
const exists = await idempotency.exists('req-123');

// Remove a key (after successful processing)
await idempotency.remove('req-123');

// Get remaining TTL
const ttl = await idempotency.getTtl('req-123');
```

## Fail-Open Design

If Redis is unavailable, idempotency checks default to allowing the request through (fail-open) with a warning log. This prevents Redis outages from blocking all traffic.
