import { AnalyticsCronJob } from './analytics-cron.job';
import type { AnalyticsService } from './analytics.service';
import type { CacheLockService } from '../../common/locks';

describe('AnalyticsCronJob', () => {
  let job: AnalyticsCronJob;
  let analyticsService: { aggregateStatsForDate: jest.Mock };
  let cacheLock: { acquire: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    analyticsService = { aggregateStatsForDate: jest.fn().mockResolvedValue(undefined) };
    cacheLock = {
      acquire: jest.fn().mockResolvedValue('token-1'),
      release: jest.fn().mockResolvedValue(undefined),
    };

    job = new AnalyticsCronJob(
      analyticsService as unknown as AnalyticsService,
      cacheLock as unknown as CacheLockService,
    );
  });

  it('runs the aggregation and releases the lock when acquired', async () => {
    await job.handleCron();

    expect(analyticsService.aggregateStatsForDate).toHaveBeenCalledTimes(1);
    expect(cacheLock.release).toHaveBeenCalledWith(
      expect.stringContaining('analytics:aggregate:'),
      'token-1',
    );
  });

  it('skips the aggregation when another instance holds the lock', async () => {
    cacheLock.acquire.mockResolvedValue(null);

    await job.handleCron();

    expect(analyticsService.aggregateStatsForDate).not.toHaveBeenCalled();
    expect(cacheLock.release).not.toHaveBeenCalled();
  });

  it('releases the lock and swallows errors when aggregation fails', async () => {
    analyticsService.aggregateStatsForDate.mockRejectedValue(
      new Error('aggregation failed'),
    );

    await expect(job.handleCron()).resolves.toBeUndefined();
    expect(cacheLock.release).toHaveBeenCalledTimes(1);
  });

  it('scopes the lock by day so a rerun the next day is not blocked', async () => {
    await job.handleCron();

    const key = cacheLock.acquire.mock.calls[0][0] as string;
    const today = new Date().toISOString().slice(0, 10);
    expect(key).toBe(`analytics:aggregate:${today}`);
  });
});
