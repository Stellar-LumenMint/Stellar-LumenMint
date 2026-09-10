import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  ADVANCE_CURSOR_SQL,
  ContractEventIndexerJob,
  LAST_CONTRACT_EVENT_LEDGER_KEY,
} from './contract-event-indexer.job';
import { SystemSettings } from './system-settings.entity';
import { ContractEvent } from './entities/contract-event.entity';
import { MarketplaceSettlementClient } from '../modules/stellar/marketplace-settlement.client';

describe('ContractEventIndexerJob', () => {
  let job: ContractEventIndexerJob;
  let settingsRepo: jest.Mocked<
    Pick<Repository<SystemSettings>, 'findOne' | 'save'>
  >;
  let settlementClient: { getEventsSince: jest.Mock };
  let dataSource: { transaction: jest.Mock; query: jest.Mock };
  let manager: {
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    save: jest.Mock;
    query: jest.Mock;
  };
  let insertExecute: jest.Mock;

  beforeEach(async () => {
    settingsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    settlementClient = {
      getEventsSince: jest.fn(),
    };

    insertExecute = jest.fn().mockResolvedValue({ identifiers: [{}] });
    manager = {
      create: jest.fn((_entity: unknown, input: unknown) => input),
      createQueryBuilder: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: insertExecute,
      })),
      save: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue([]),
    };

    dataSource = {
      transaction: jest.fn(async (cb: (m: unknown) => Promise<void>) =>
        cb(manager),
      ),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractEventIndexerJob,
        {
          provide: getRepositoryToken(SystemSettings),
          useValue: settingsRepo,
        },
        {
          provide: getRepositoryToken(ContractEvent),
          useValue: { create: jest.fn() },
        },
        { provide: DataSource, useValue: dataSource },
        { provide: MarketplaceSettlementClient, useValue: settlementClient },
      ],
    }).compile();

    job = module.get<ContractEventIndexerJob>(ContractEventIndexerJob);
  });

  // loadCursor

  describe('loadCursor', () => {
    it('returns 0 when no cursor is stored', async () => {
      settingsRepo.findOne.mockResolvedValue(null);

      await expect(job.loadCursor()).resolves.toBe(0);
      expect(settingsRepo.findOne).toHaveBeenCalledWith({
        where: { key: LAST_CONTRACT_EVENT_LEDGER_KEY },
      });
    });

    it('returns the stored ledger value', async () => {
      settingsRepo.findOne.mockResolvedValue({
        key: LAST_CONTRACT_EVENT_LEDGER_KEY,
        value: '42',
      });

      await expect(job.loadCursor()).resolves.toBe(42);
    });
  });

  // advanceCursor — atomic monotonic upsert

  describe('advanceCursor', () => {
    it('runs the atomic monotonic upsert', async () => {
      await job.advanceCursor(20);

      expect(dataSource.query).toHaveBeenCalledWith(ADVANCE_CURSOR_SQL, [
        LAST_CONTRACT_EVENT_LEDGER_KEY,
        '20',
      ]);
    });

    it('never issues a read-then-write sequence', async () => {
      await job.advanceCursor(20);

      // Monotonicity is enforced in SQL, so no read is required first.
      expect(settingsRepo.findOne).not.toHaveBeenCalled();
      expect(settingsRepo.save).not.toHaveBeenCalled();
    });
  });

  // handleIndexing — checkpointing flow

  describe('handleIndexing', () => {
    it('checkpoints the cursor inside the same transaction as the events', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      settlementClient.getEventsSince.mockResolvedValue({
        events: [
          {
            contractId: 'contract-1',
            ledger: 100,
            txHash: 'tx-1',
            eventIndex: 0,
            type: 'bid',
          },
        ],
        latestLedger: 100,
      });

      await job.handleIndexing();

      expect(settlementClient.getEventsSince).toHaveBeenCalledWith(0);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(insertExecute).toHaveBeenCalledTimes(1);
      // Cursor advanced through the transaction manager, not the DataSource.
      expect(manager.query).toHaveBeenCalledWith(ADVANCE_CURSOR_SQL, [
        LAST_CONTRACT_EVENT_LEDGER_KEY,
        '100',
      ]);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('resumes from the stored cursor', async () => {
      settingsRepo.findOne.mockResolvedValue({
        key: LAST_CONTRACT_EVENT_LEDGER_KEY,
        value: '50',
      });
      settlementClient.getEventsSince.mockResolvedValue({
        events: [],
        latestLedger: 75,
      });

      await job.handleIndexing();

      expect(settlementClient.getEventsSince).toHaveBeenCalledWith(50);
      // Even an empty batch checkpoints, so an idle chain does not keep
      // re-scanning the same range.
      expect(manager.query).toHaveBeenCalledWith(ADVANCE_CURSOR_SQL, [
        LAST_CONTRACT_EVENT_LEDGER_KEY,
        '75',
      ]);
    });

    it('does not checkpoint when fetching events fails', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      settlementClient.getEventsSince.mockRejectedValue(
        new Error('RPC timeout'),
      );

      await job.handleIndexing();

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('does not checkpoint when the transaction rolls back', async () => {
      settingsRepo.findOne.mockResolvedValue(null);
      settlementClient.getEventsSince.mockResolvedValue({
        events: [],
        latestLedger: 100,
      });
      manager.query.mockRejectedValue(new Error('checkpoint failed'));

      await expect(job.handleIndexing()).resolves.toBeUndefined();
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });
});
