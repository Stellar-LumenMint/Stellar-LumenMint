// ── Job Queue Module ─────────────────────────────────────────────────────────

import { Module, Global } from '@nestjs/common';
import { JobQueueService } from './job-queue.service';

@Global()
@Module({
  providers: [JobQueueService],
  exports: [JobQueueService],
})
export class JobQueueModule {}
