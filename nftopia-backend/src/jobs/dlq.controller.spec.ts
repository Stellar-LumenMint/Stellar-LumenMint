import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DlqController } from './dlq.controller';
import { ContractEventDlq } from './entities/contract-event-dlq.entity';
import { ContractEvent } from './entities/contract-event.entity';
import { IndexerService } from './indexer.service';

describe('DlqController', () => {
  let controller: DlqController;
  let dlqRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let eventRepo: { create: jest.Mock; createQueryBuilder: jest.Mock };
  let indexerService: { processTransaction: jest.Mock };

  beforeEach(async () => {
    dlqRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      findOne: jest.fn(),
      save: jest.fn(),
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
      controllers: [DlqController],
      providers: [
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

    controller = module.get<DlqController>(DlqController);
  });

  describe('listDlqRecords', () => {
    it('should return paginated dlq records', async () => {
      const result = await controller.listDlqRecords();
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('manualReplay', () => {
    it('should replay and resolve a dlq record', async () => {
      const dlq = { id: '1', status: 'exhausted' } as ContractEventDlq;
      dlqRepo.findOne.mockResolvedValue(dlq);

      const result = await controller.manualReplay('1');

      expect(result.success).toBe(true);
      expect(dlq.status).toBe('resolved');
      expect(dlqRepo.save).toHaveBeenCalledWith(dlq);
    });

    it('should capture failure and return error during replay', async () => {
      const dlq = { id: '1', status: 'exhausted' } as ContractEventDlq;
      dlqRepo.findOne.mockResolvedValue(dlq);

      eventRepo.createQueryBuilder.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockRejectedValue(new Error('Manual Replay Error')),
      });

      const result = await controller.manualReplay('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Manual Replay Error');
      expect(dlqRepo.save).toHaveBeenCalledWith(dlq);
    });
  });
});
