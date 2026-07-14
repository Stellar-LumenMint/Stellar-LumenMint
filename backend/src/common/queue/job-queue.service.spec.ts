// ── Job Queue Service Tests ──────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JobQueueService } from './job-queue.service';
import { JobPriority } from './job-queue.types';

// Mock ioredis
const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  expire: jest.fn().mockResolvedValue(1),
  zadd: jest.fn().mockResolvedValue(1),
  zrem: jest.fn().mockResolvedValue(1),
  zcard: jest.fn().mockResolvedValue(0),
  zpopmin: jest.fn().mockResolvedValue([]),
  zrange: jest.fn().mockResolvedValue([]),
  zrangebyscore: jest.fn().mockResolvedValue([]),
};

jest.mock('ioredis', () => ({
  default: jest.fn(() => mockRedis),
}));

describe('JobQueueService', () => {
  let service: JobQueueService;
  let handler: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobQueueService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_HOST') return 'localhost';
              if (key === 'REDIS_PORT') return '6379';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JobQueueService>(JobQueueService);
    handler = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    service.stopPolling();
  });

  describe('registerQueue', () => {
    it('should register a queue with a handler', () => {
      service.registerQueue({ name: 'test-queue' }, handler);
      expect(() =>
        service.enqueue('test-queue', {}),
      ).not.toThrow();
    });
  });

  describe('enqueue', () => {
    it('should enqueue a job and return a job ID', async () => {
      service.registerQueue({ name: 'enqueue-test' }, handler);
      mockRedis.exists.mockResolvedValue(0);

      const jobId = await service.enqueue('enqueue-test', { foo: 'bar' });
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.zadd).toHaveBeenCalled();
    });

    it('should reject duplicate job IDs', async () => {
      service.registerQueue({ name: 'dup-test' }, handler);
      mockRedis.exists.mockResolvedValue(1);

      await expect(
        service.enqueue('dup-test', {}, { jobId: 'existing' }),
      ).rejects.toThrow(/already exists/);
    });

    it('should enqueue a delayed job', async () => {
      service.registerQueue({ name: 'delay-test' }, handler);
      mockRedis.exists.mockResolvedValue(0);

      const jobId = await service.enqueue(
        'delay-test',
        { data: 'delayed' },
        { delayMs: 10000 },
      );
      expect(jobId).toBeDefined();
      expect(mockRedis.zadd).toHaveBeenCalled();
    });

    it('should throw for unregistered queues', async () => {
      await expect(service.enqueue('nonexistent', {})).rejects.toThrow(
        /not registered/,
      );
    });
  });

  describe('getJob', () => {
    it('should return a job by ID', async () => {
      service.registerQueue({ name: 'get-test' }, handler);

      const mockJob = {
        id: 'job-1',
        queueName: 'get-test',
        data: { x: 1 },
        status: 'pending',
        priority: 5,
        attemptsMade: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        processAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockJob));

      const job = await service.getJob('get-test', 'job-1');
      expect(job).toBeDefined();
      expect(job?.id).toBe('job-1');
      expect(job?.data).toEqual({ x: 1 });
    });

    it('should return null for nonexistent jobs', async () => {
      service.registerQueue({ name: 'get-test' }, handler);
      mockRedis.get.mockResolvedValue(null);

      const job = await service.getJob('get-test', 'nonexistent');
      expect(job).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      service.registerQueue({ name: 'stats-test' }, handler);
      mockRedis.zcard.mockResolvedValue(5);
      mockRedis.zrange.mockResolvedValue([]);

      const stats = await service.getStats('stats-test');
      expect(stats.name).toBe('stats-test');
      expect(stats.pending).toBe(5);
      expect(stats.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('startPolling / stopPolling', () => {
    it('should start and stop polling without errors', () => {
      service.registerQueue({ name: 'poll-test' }, handler);
      service.startPolling();
      expect(() => service.stopPolling()).not.toThrow();
    });
  });
});
