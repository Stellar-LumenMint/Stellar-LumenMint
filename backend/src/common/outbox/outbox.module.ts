// ── Outbox Module ────────────────────────────────────────────────────────────

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OutboxService } from './outbox.service';
import { OutboxEvent } from './outbox.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([OutboxEvent]),
    EventEmitterModule,
  ],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class OutboxModule {}
