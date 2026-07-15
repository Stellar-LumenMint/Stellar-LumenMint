# Pipeline Module

Sequential step execution with compensation (rollback) support for multi-step operations.

## Usage

```typescript
import { PipelineService } from './pipeline.service';

const result = await pipeline.execute([
  {
    name: 'mint-nft',
    execute: async () => await nftService.mint(data),
    compensate: async (result) => await nftService.burn(result.id),
    maxRetries: 2,
  },
  {
    name: 'index-metadata',
    execute: async (ctx) => await search.index(ctx['mint-nft'].id),
    compensate: async (ctx) => await search.delete(ctx['mint-nft'].id),
  },
  {
    name: 'notify-creator',
    execute: async (ctx) => await notify.send(ctx['mint-nft']),
    // No compensation needed (non-critical)
  },
]);
```

## Features

- **Per-step retries**: Each step can retry independently
- **Compensation**: Failed steps trigger compensation for all previously successful steps
- **Timing**: Each step is instrumented with duration tracking
- **Context passing**: Each step receives results from previous steps
