# Job Queue Module

Redis-backed job queue for reliable background processing.

## Features

- **Priorities**: Jobs sorted by priority with higher-priority jobs processed first
- **Retries**: Configurable max retries with exponential or fixed backoff
- **Dead Letter Queue**: Failed jobs moved to DLQ after exhausting retries
- **Deduplication**: SET NX prevents duplicate job submission
- **Delayed Jobs**: Schedule jobs for future execution

## Usage

```typescript
import { JobQueueService } from './job-queue.service';

// Enqueue a job
await queue.enqueue('email:send', { to: 'user@test.com' }, {
  priority: 'high',
  maxRetries: 3,
  delay: 0,
});

// Process jobs
queue.process('email:send', async (job) => {
  await emailService.send(job.data.to);
});

// Replay failed jobs
await queue.replayDeadLetter('email:send');
```

## Architecture

```
Producer → Redis Sorted Set → Worker (polling) → Handler
                                      ↓ (failure)
                                DLQ Sorted Set → Admin Replay
```
