// ── Outbox Service Tests ─────────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OutboxService } from './outbox.service';
import { OutboxEvent } from './outbox.entity';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockRepo: Record<string, jest.Mock>;
  let mockEventEmitter: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        { provide: getRepositoryToken(OutboxEvent), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  describe('createInTransaction', () => {
    it('should create an outbox event within a transaction manager', async () => {
      const mockManager = {
        create: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({}),
      };

      await service.createInTransaction(mockManager as any, {
        eventType: 'nft.created',
        aggregateId: 'nft-1',
        payload: { nftId: 'nft-1' },
      });

      expect(mockManager.create).toHaveBeenCalled();
      expect(mockManager.save).toHaveBeenCalled();
    });
  });

  describe('publishEvent', () => {
    it('should emit the event and mark as published', async () => {
      mockRepo.save.mockResolvedValue({});

      const event = {
        id: 'evt-1',
        eventType: 'nft.created',
        payload: { nftId: '1' },
        status: 'pending',
        attempts: 0,
      } as OutboxEvent;

      const result = await service.publishEvent(event);
      expect(result).toBe(true);
      expect(event.status).toBe('published');
      expect(event.publishedAt).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'nft.created',
        { nftId: '1' },
      );
    });

    it('should mark as failed after max attempts', async () => {
      mockRepo.save.mockResolvedValue({});

      const event = {
        id: 'evt-1',
        eventType: 'nft.created',
        payload: {},
        status: 'pending',
        attempts: 9, // Will become 10 on next attempt = MAX_ATTEMPTS
      } as OutboxEvent;

      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('emit failed');
      });

      const result = await service.publishEvent(event);
      expect(result).toBe(false);
      expect(event.status).toBe('failed');
      expect(event.attempts).toBe(10);
    });
  });

  describe('replayEvent', () => {
    it('should replay a failed event', async () => {
      const event = {
        id: 'evt-failed',
        eventType: 'nft.created',
        payload: {},
        status: 'failed',
        attempts: 5,
      } as OutboxEvent;

      mockRepo.findOne.mockResolvedValue(event);
      mockRepo.save.mockResolvedValue({});
      mockEventEmitter.emit.mockReturnValue({});

      const result = await service.replayEvent('evt-failed');
      expect(result).toBe(true);
      expect(event.status).toBe('published');
      expect(event.attempts).toBe(1);
      expect(event.lastError).toBeUndefined();
    });

    it('should throw if event is already published', async () => {
      const event = {
        id: 'evt-pub',
        eventType: 'nft.created',
        payload: {},
        status: 'published',
      } as OutboxEvent;

      mockRepo.findOne.mockResolvedValue(event);

      await expect(service.replayEvent('evt-pub')).rejects.toThrow(
        /already published/,
      );
    });
  });

  describe('getFailedEvents', () => {
    it('should return failed events with pagination', async () => {
      mockRepo.findAndCount.mockResolvedValue([
        [{ id: 'f1' }, { id: 'f2' }],
        2,
      ]);

      const result = await service.getFailedEvents(10, 0);
      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('archiveOldEvents', () => {
    it('should archive old published and failed events', async () => {
      const qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const count = await service.archiveOldEvents(30);
      expect(count).toBe(5);
    });
  });
});
