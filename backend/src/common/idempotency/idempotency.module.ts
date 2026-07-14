// ── Idempotency Module ───────────────────────────────────────────────────────

import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

@Global()
@Module({
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
