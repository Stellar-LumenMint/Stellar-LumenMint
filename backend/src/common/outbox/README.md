# Outbox Module

Transactional event publishing pattern — ensures events are reliably published even if the original transaction fails.

## How It Works

1. **Write**: Events are written to the outbox table in the same database transaction as the business operation
2. **Relay**: A cron job (every 5 seconds) polls the outbox for pending events and publishes them
3. **Archive**: Processed events are moved to an archive after 30 days

## Usage

```typescript
import { OutboxService } from './outbox.service';

// Publish an event atomically with a DB transaction
await entityManager.transaction(async (em) => {
  await em.save(nft);
  await outbox.publish(em, 'nft.created', { nftId: nft.id });
});
```

## Reliability

- **At-least-once delivery**: Each event is retried with exponential backoff (max 10 attempts)
- **Idempotency**: Consumers use idempotency keys to handle duplicates
- **Overlap guard**: Relay cron job prevents concurrent relay runs
- **Recovery**: Failed events can be manually replayed via admin API
