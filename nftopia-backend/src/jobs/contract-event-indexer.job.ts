import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MarketplaceSettlementClient } from '../modules/stellar/marketplace-settlement.client';
import { SystemSettings } from './system-settings.entity';
import { ContractEvent } from './entities/contract-event.entity';
import { ContractEventDlq } from './entities/contract-event-dlq.entity';

/** SystemSettings key used to persist the contract-event cursor. */
export const LAST_CONTRACT_EVENT_LEDGER_KEY =
  'last_contract_event_indexed_ledger';

@Injectable()
export class ContractEventIndexerJob {
  private readonly logger = new Logger(ContractEventIndexerJob.name);

  constructor(
    private readonly settlementClient: MarketplaceSettlementClient,
    @InjectRepository(SystemSettings)
    private readonly settingsRepo: Repository<SystemSettings>,
    @InjectRepository(ContractEvent)
    private readonly eventRepo: Repository<ContractEvent>,
    private readonly dataSource: DataSource,
  ) {}

  // Runs every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async handleIndexing(): Promise<void> {
    this.logger.log('Starting contract event indexing job...');

    const fromLedger = await this.loadCursor();

    let events: Record<string, unknown>[];
    let latestLedger: number;

    try {
      const result = await this.settlementClient.getEventsSince(fromLedger);
      events = result.events;
      latestLedger = result.latestLedger;
    } catch (err) {
      this.logger.error(
        `Failed to fetch events from ledger ${fromLedger}. Cursor NOT advanced.`,
        err instanceof Error ? err.stack : err,
      );
      return;
    }

    try {
      await this.persistEvents(events);
    } catch (err) {
      this.logger.error(
        `Failed to persist ${events.length} event(s). Cursor NOT advanced.`,
        err instanceof Error ? err.stack : err,
      );
      return;
    }

    await this.advanceCursor(latestLedger);

    this.logger.log(
      `Contract event indexing completed. ` +
        `fromLedger=${fromLedger} toLedger=${latestLedger} eventsCount=${events.length}`,
    );
  }

  // Cursor helpers

  async loadCursor(): Promise<number> {
    const setting = await this.settingsRepo.findOne({
      where: { key: LAST_CONTRACT_EVENT_LEDGER_KEY },
    });
    return setting ? parseInt(setting.value, 10) : 0;
  }

  async advanceCursor(newLedger: number): Promise<void> {
    const current = await this.loadCursor();
    if (newLedger <= current) {
      this.logger.debug(
        `Cursor not advanced: newLedger=${newLedger} <= current=${current}`,
      );
      return;
    }
    await this.settingsRepo.save({
      key: LAST_CONTRACT_EVENT_LEDGER_KEY,
      value: String(newLedger),
    });
    this.logger.debug(`Cursor advanced: ${current} -> ${newLedger}`);
  }

  // Event persistence

  private async persistEvents(
    events: Record<string, unknown>[],
  ): Promise<void> {
    if (events.length === 0) return;

    let persistedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;

    const str = (v: unknown): string => (v == null ? '' : `${v as string}`);

    await this.dataSource.transaction(async (manager) => {
      for (const raw of events) {
        try {
          const contractId = str(raw['contractId'] ?? raw['contract_id']);
          const txHash = str(raw['txHash'] ?? raw['tx_hash']);
          const topic = raw['topic'] != null ? str(raw['topic']) : undefined;
          const eventType =
            raw['eventType'] != null
              ? str(raw['eventType'])
              : raw['type'] != null
                ? str(raw['type'])
                : undefined;

          const entity = manager.create(ContractEvent, {
            contractId,
            ledger: Number(raw['ledger'] ?? 0),
            txHash,
            eventIndex: Number(raw['eventIndex'] ?? raw['event_index'] ?? 0),
            topic,
            eventType,
            payload: raw,
          });

          const result = await manager
            .createQueryBuilder()
            .insert()
            .into(ContractEvent)
            .values(entity as any) // eslint-disable-line @typescript-eslint/no-unsafe-argument
            .orIgnore()
            .execute();

          const identifiers = result.identifiers as unknown[];
          if (identifiers.length === 0) {
            duplicateCount++;
          } else {
            persistedCount++;
          }
        } catch (err) {
          failedCount++;
          const contractId = str(raw['contractId'] ?? raw['contract_id']);
          const txHash = str(raw['txHash'] ?? raw['tx_hash']);
          const eventType =
            raw['eventType'] != null
              ? str(raw['eventType'])
              : raw['type'] != null
                ? str(raw['type'])
                : undefined;
          const ledger = Number(raw['ledger'] ?? 0);
          const eventIndex = Number(
            raw['eventIndex'] ?? raw['event_index'] ?? 0,
          );

          try {
            const dlqEntity = manager.create(ContractEventDlq, {
              contractId,
              ledger,
              txHash,
              eventIndex,
              eventType,
              payload: raw,
              errorMessage: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
              firstFailedAt: new Date(),
              lastFailedAt: new Date(),
              nextRetryAt: new Date(Date.now() + 60 * 1000), // Retry in 1 minute
              status: 'pending',
              attemptCount: 1,
            });
            await manager.save(ContractEventDlq, dlqEntity);
            this.logger.log(
              `dlqEnqueued: 1 for txHash=${txHash} index=${eventIndex}`,
            );
          } catch (dlqErr) {
            this.logger.error(
              `Failed to save to DLQ for txHash=${txHash}: ${String(dlqErr)}`,
            );
          }

          this.logger.warn(
            `Failed to persist event txHash=${str(raw['txHash'])} index=${str(raw['eventIndex'])}: ${String(err)}`,
          );
        }
      }
    });

    this.logger.log(
      `persistEvents: persisted=${persistedCount} duplicates=${duplicateCount} failed=${failedCount}`,
    );
  }
}
