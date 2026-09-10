import { ConfigService } from '@nestjs/config';
import { CacheLockService } from './cache-lock.service';

const mockRedis = {
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  set: jest.fn(),
  eval: jest.fn().mockResolvedValue(1),
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedis),
}));

function createService(): CacheLockService {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'LOCK_KEY_PREFIX') return 'lock';
      if (key === 'REDIS_HOST') return 'localhost';
      return undefined;
    }),
  };

  return new CacheLockService(config as unknown as ConfigService);
}

describe('CacheLockService', () => {
  let service: CacheLockService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedis.eval.mockResolvedValue(1);
    service = createService();
  });

  it('returns an ownership token when the lock is free', async () => {
    mockRedis.set.mockResolvedValue('OK');

    const token = await service.acquire('job:1', 1000);

    expect(token).toEqual(expect.any(String));
    expect(mockRedis.set).toHaveBeenCalledWith(
      'lock:job:1',
      token,
      'PX',
      1000,
      'NX',
    );
  });

  it('returns null when another instance holds the lock', async () => {
    mockRedis.set.mockResolvedValue(null);

    await expect(service.acquire('job:1', 1000)).resolves.toBeNull();
  });

  it('fails open when Redis is unavailable so jobs still run', async () => {
    mockRedis.set.mockRejectedValue(new Error('redis down'));

    await expect(service.acquire('job:1', 1000)).resolves.toEqual(
      expect.any(String),
    );
  });

  it('rejects a non-positive TTL', async () => {
    await expect(service.acquire('job:1', 0)).rejects.toThrow(
      'Lock TTL must be a positive number of milliseconds',
    );
  });

  it('releases only when the token still owns the lock', async () => {
    await service.release('job:1', 'token-123');

    expect(mockRedis.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("get"'),
      1,
      'lock:job:1',
      'token-123',
    );
  });

  it('swallows release failures', async () => {
    mockRedis.eval.mockRejectedValue(new Error('redis down'));

    await expect(service.release('job:1', 'token-123')).resolves.toBeUndefined();
  });

  describe('withLock', () => {
    it('runs the callback and releases the lock', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const fn = jest.fn().mockResolvedValue('done');

      await expect(service.withLock('job:1', 1000, fn)).resolves.toBe('done');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('skips the callback when the lock is held elsewhere', async () => {
      mockRedis.set.mockResolvedValue(null);
      const fn = jest.fn();

      await expect(service.withLock('job:1', 1000, fn)).resolves.toBeUndefined();
      expect(fn).not.toHaveBeenCalled();
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });

    it('releases the lock when the callback throws', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const fn = jest.fn().mockRejectedValue(new Error('boom'));

      await expect(service.withLock('job:1', 1000, fn)).rejects.toThrow('boom');
      expect(mockRedis.eval).toHaveBeenCalled();
    });
  });
});
