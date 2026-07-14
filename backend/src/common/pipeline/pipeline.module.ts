// ── Pipeline Module ──────────────────────────────────────────────────────────

import { Module, Global } from '@nestjs/common';
import { PipelineService } from './pipeline.service';

@Global()
@Module({
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
