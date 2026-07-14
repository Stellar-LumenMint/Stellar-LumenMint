// ── Idempotency Service Tests ────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IdempotencyService } from './idempotency.service';

const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn(),
  ttl: jest.fn(),
};

jest.mock('ioredis', () => ({
  default: jest.fn(() => mockRedis),
}));

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyService,
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

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  describe('checkAndSet', () => {
    it('should return isDuplicate=false on first call', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.checkAndSet('tx-123', 'result-42');
      expect(result.isDuplicate).toBe(false);
      expect(result.originalResult).toBeUndefined();
      expect(mockRedis.set).toHaveBeenCalledWith(
        'idem:tx-123',
        'result-42',
        'EX',
        86400,
        'NX',
      );
    });

    it('should return isDuplicate=true on duplicate call', async () => {
      mockRedis.set.mockResolvedValue(null); // NX fails
      mockRedis.get.mockResolvedValue('result-42');

      const result = await service.checkAndSet('tx-123', 'result-99');
      expect(result.isDuplicate).toBe(true);
      expect(result.originalResult).toBe('result-42');
    });

    it('should fail open on Redis error (isDuplicate=false)', async () => {
      mockRedis.set.mockRejectedValue(new Error('Connection refused'));

      const result = await service.checkAndSet('tx-error', 'data');
      expect(result.isDuplicate).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const result = await service.exists('key-1');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);
      const result = await service.exists('key-1');
      expect(result).toBe(false);
    });

    it('should return false on Redis error', async () => {
      mockRedis.exists.mockRejectedValue(new Error('fail'));
      const result = await service.exists('key-err');
      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should delete an idempotency key', async () => {
      await service.remove('tx-delete');
      expect(mockRedis.del).toHaveBeenCalledWith('idem:tx-delete');
    });
  });

  describe('getTtl', () => {
    it('should return TTL in seconds', async () => {
      mockRedis.ttl.mockResolvedValue(3600);
      const ttl = await service.getTtl('key-fresh');
      expect(ttl).toBe(3600);
    });

    it('should return -1 on error', async () => {
      mockRedis.ttl.mockRejectedValue(new Error('fail'));
      const ttl = await service.getTtl('key-err');
      expect(ttl).toBe(-1);
    });
  });
});
