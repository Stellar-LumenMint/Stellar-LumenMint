import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheLockService } from '../../common/locks';
import { AnalyticsService } from './analytics.service';

/** Upper bound on how long an aggregation may hold its lock. */
export const ANALYTICS_LOCK_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AnalyticsCronJob {
  private readonly logger = new Logger(AnalyticsCronJob.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cacheLock: CacheLockService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const lockKey = `analytics:aggregate:${date}`;

    // Every instance fires this cron at midnight; the lease ensures the day's
    // aggregation runs once instead of N times (and never concurrently).
    const token = await this.cacheLock.acquire(lockKey, ANALYTICS_LOCK_TTL_MS);
    if (token === null) {
      this.logger.log(
        `Analytics aggregation for ${date} is already running elsewhere; skipping`,
      );
      return;
    }

    try {
      this.logger.log(`Running analytics aggregation for ${date}`);
      await this.analyticsService.aggregateStatsForDate(date);
    } catch (error) {
      // Log and swallow so a failed run does not produce an unhandled
      // rejection and the lock is still released in `finally`.
      this.logger.error(
        `Analytics aggregation failed for ${date}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    } finally {
      await this.cacheLock.release(lockKey, token);
    }
  }
}
