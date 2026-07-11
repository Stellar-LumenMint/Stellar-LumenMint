import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DlqRetryWorker } from './dlq-retry.worker';
import { ContractEventDlq } from './entities/contract-event-dlq.entity';
import { ContractEvent } from './entities/contract-event.entity';
import { IndexerService } from './indexer.service';

describe('DlqRetryWorker', () => {
  let worker: DlqRetryWorker;
  let dlqRepo: jest.Mocked<Partial<Repository<ContractEventDlq>>>;
  let eventRepo: { create: jest.Mock; createQueryBuilder: jest.Mock };
  let indexerService: { processTransaction: jest.Mock };

  beforeEach(async () => {
    dlqRepo = {
      find: jest.fn<any, any>(),
      save: jest.fn<any, any>(),
    };

    const mockQueryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ identifiers: [{ id: 1 }] }),
    };

    indexerService = { processTransaction: jest.fn() };

    eventRepo = {
      create: jest.fn().mockImplementation((val: unknown) => val),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DlqRetryWorker,
        {
          provide: getRepositoryToken(ContractEventDlq),
          useValue: dlqRepo,
        },
        {
          provide: getRepositoryToken(ContractEvent),
          useValue: eventRepo,
        },
        {
          provide: IndexerService,
          useValue: indexerService,
        },
      ],
    }).compile();

    worker = module.get<DlqRetryWorker>(DlqRetryWorker);
  });

  it('should successfully retry and resolve a pending DLQ event', async () => {
    const event = {
      id: '1',
      status: 'pending',
      attemptCount: 0,
    } as ContractEventDlq;
    (dlqRepo.find as jest.Mock).mockResolvedValue([event]);

    await worker.handleRetries();

    expect(event.attemptCount).toBe(1);
    expect(event.status).toBe('resolved');
    expect(dlqRepo.save).toHaveBeenCalledWith(event);
  });

  it('should mark event as exhausted if max attempts reached', async () => {
    const event = {
      id: '1',
      status: 'retrying',
      attemptCount: 4,
    } as ContractEventDlq;
    (dlqRepo.find as jest.Mock).mockResolvedValue([event]);

    eventRepo.createQueryBuilder.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockRejectedValue(new Error('Db Error')),
    });

    await worker.handleRetries();

    expect(event.attemptCount).toBe(5);
    expect(event.status).toBe('exhausted');
    expect(dlqRepo.save).toHaveBeenCalledWith(event);
  });

  it('should increase attempt and update nextRetryAt on failure', async () => {
    const event = {
      id: '1',
      status: 'pending',
      attemptCount: 1,
      nextRetryAt: new Date(0),
    } as ContractEventDlq;
    (dlqRepo.find as jest.Mock).mockResolvedValue([event]);

    eventRepo.createQueryBuilder.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockRejectedValue(new Error('Db Error')),
    });

    const before = Date.now();
    await worker.handleRetries();

    expect(event.attemptCount).toBe(2);
    expect(event.status).toBe('retrying');
    expect(event.nextRetryAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(dlqRepo.save).toHaveBeenCalledWith(event);
  });
});
