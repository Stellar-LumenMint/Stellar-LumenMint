// ── Outbox Service ───────────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxEvent, OutboxStatus } from './outbox.entity';

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly MAX_ATTEMPTS = 10;
  private readonly BATCH_SIZE = 50;
  private relayProcessing = false;

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Persist an event to the outbox within a transaction.
   *
   * Call this within your service's TypeORM transaction to guarantee
   * the event is only published if the transaction commits.
   *
   * ```typescript
   * await this.dataSource.transaction(async (manager) => {
   *   const nft = await manager.save(Nft, nftData);
   *   await this.outboxService.createInTransaction(manager, {
   *     eventType: 'nft.created',
   *     aggregateId: nft.id,
   *     payload: { nftId: nft.id, owner: nft.owner },
   *   });
   * });
   * ```
   */
  async createInTransaction(
    manager: EntityManager,
    event: {
      eventType: string;
      aggregateId: string;
      payload: Record<string, unknown>;
    },
  ): Promise<void> {
    const outboxEvent = manager.create(OutboxEvent, {
      eventType: event.eventType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      status: 'pending' as OutboxStatus,
      attempts: 0,
    });
    await manager.save(OutboxEvent, outboxEvent);
  }

  /**
   * Publish a single outbox event (used by the relay or manual replay).
   * Returns true if the event was successfully published.
   */
  async publishEvent(event: OutboxEvent): Promise<boolean> {
    try {
      this.eventEmitter.emit(event.eventType, event.payload);
      event.status = 'published';
      event.publishedAt = new Date();
      event.attempts += 1;
      await this.outboxRepo.save(event);

      this.logger.debug(`Published outbox event ${event.id} (${event.eventType})`);
      return true;
    } catch (err) {
      event.lastError = err instanceof Error ? err.message : String(err);
      event.attempts += 1;

      if (event.attempts >= this.MAX_ATTEMPTS) {
        event.status = 'failed';
        this.logger.warn(
          `Outbox event ${event.id} exhausted retries (${this.MAX_ATTEMPTS})`,
        );
      } else {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delayMs = Math.min(
          1000 * Math.pow(2, event.attempts - 1),
          300_000, // Max 5 minutes
        );
        event.nextRetryAt = new Date(Date.now() + delayMs);
      }

      await this.outboxRepo.save(event);
      return false;
    }
  }

  /**
   * Get pending outbox events (oldest first, with retry time respected).
   */
  async getPendingEvents(limit: number = this.BATCH_SIZE): Promise<OutboxEvent[]> {
    return this.outboxRepo.find({
      where: [
        {
          status: 'pending',
          attempts: 0,
        },
        {
          status: 'pending',
          nextRetryAt: LessThanOrEqual(new Date()),
        },
      ],
      order: { createdAt: 'ASC' },
      take: limit,
    });
  }

  /**
   * Get failed outbox events for manual inspection.
   */
  async getFailedEvents(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ events: OutboxEvent[]; total: number }> {
    const [events, total] = await this.outboxRepo.findAndCount({
      where: { status: 'failed' },
      order: { updatedAt: 'DESC' },
      skip: offset,
      take: limit,
    });
    return { events, total };
  }

  /**
   * Manually replay a failed outbox event.
   */
  async replayEvent(eventId: string): Promise<boolean> {
    const event = await this.outboxRepo.findOne({ where: { id: eventId } });
    if (!event) {
      throw new Error(`Outbox event ${eventId} not found`);
    }
    if (event.status === 'published') {
      throw new Error(`Outbox event ${eventId} already published`);
    }

    event.status = 'pending';
    event.attempts = 0;
    event.lastError = undefined;
    event.nextRetryAt = new Date();
    await this.outboxRepo.save(event);

    return this.publishEvent(event);
  }

  /**
   * Archive old published/failed events.
   */
  async archiveOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 86400000);
    const result = await this.outboxRepo
      .createQueryBuilder()
      .update(OutboxEvent)
      .set({ status: 'archived' as OutboxStatus })
      .where('status IN (:...statuses)', {
        statuses: ['published', 'failed'],
      })
      .andWhere('updatedAt < :cutoff', { cutoff })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Archived ${result.affected} old outbox events`);
    }
    return result.affected ?? 0;
  }

  // ── Cron: Outbox Relay ──────────────────────────────────────────────────

  /** Relays pending outbox events every 5 seconds. */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async relayPendingEvents(): Promise<void> {
    // Guard against overlapping cron executions
    if (this.relayProcessing) return;
    this.relayProcessing = true;

    try {
      const events = await this.getPendingEvents();
      if (events.length === 0) return;

      let published = 0;
      let failed = 0;

      for (const event of events) {
        const success = await this.publishEvent(event);
        if (success) published++;
        else failed++;
      }

      if (published > 0 || failed > 0) {
        this.logger.debug(
          `Outbox relay: published=${published}, failed=${failed}, pending=${events.length - published - failed}`,
        );
      }
    } finally {
      this.relayProcessing = false;
    }
  }

  /** Archives old events daily. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyArchive(): Promise<void> {
    await this.archiveOldEvents(30);
  }
}
