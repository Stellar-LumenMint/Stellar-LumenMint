// ── Redis Job Queue Service ──────────────────────────────────────────────────

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import {
  Job,
  JobStatus,
  JobPriority,
  QueueConfig,
  EnqueueOptions,
  JobHandler,
  QueueStats,
} from './job-queue.types';

const REDIS_PREFIX = 'jobq';
const DLQ_SUFFIX = 'dlq';

function redisKey(queueName: string, suffix: string): string {
  return `${REDIS_PREFIX}:${queueName}:${suffix}`;
}

@Injectable()
export class JobQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly redis: Redis;
  private readonly handlers = new Map<string, JobHandler>();
  private readonly configs = new Map<string, Required<QueueConfig>>();
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  private polling = false;
  private readonly pollIntervalMs = 500;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
      password: configService.get('REDIS_PASSWORD') || undefined,
      db: parseInt(configService.get('REDIS_DB') || '0', 10),
      lazyConnect: true,
    });

    void this.redis.connect().catch((err: Error) => {
      this.logger.warn(`Redis connection failed for job queue: ${err.message}`);
    });
  }

  onModuleDestroy(): void {
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
    void this.redis.quit();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /** Register a queue with a handler function. */
  registerQueue<T = Record<string, unknown>>(
    config: QueueConfig,
    handler: JobHandler<T>,
  ): void {
    const resolved: Required<QueueConfig> = {
      name: config.name,
      maxRetries: config.maxRetries ?? 3,
      backoffStrategy: config.backoffStrategy ?? 'exponential',
      backoffDelayMs: config.backoffDelayMs ?? 1000,
      maxBackoffDelayMs: config.maxBackoffDelayMs ?? 60000,
      completedJobTtlSeconds: config.completedJobTtlSeconds ?? 86400,
      failedJobTtlSeconds: config.failedJobTtlSeconds ?? 604800,
      removeOnComplete: config.removeOnComplete ?? false,
      removeOnFail: config.removeOnFail ?? false,
    };

    this.configs.set(config.name, resolved);
    this.handlers.set(config.name, handler as JobHandler);
    this.logger.log(`Queue '${config.name}' registered`);
  }

  /** Enqueue a job for processing. */
  async enqueue<T = Record<string, unknown>>(
    queueName: string,
    data: T,
    options?: EnqueueOptions,
  ): Promise<string> {
    const config = this.configs.get(queueName);
    if (!config) throw new Error(`Queue '${queueName}' is not registered`);

    const jobId = options?.jobId ?? randomUUID();
    const now = Date.now();
    const delayMs = options?.delayMs ?? 0;

    const job: Job<T> = {
      id: jobId,
      queueName,
      data,
      status: delayMs > 0 ? 'delayed' : 'pending',
      priority: options?.priority ?? JobPriority.NORMAL,
      attemptsMade: 0,
      maxRetries: options?.maxRetries ?? config.maxRetries,
      createdAt: new Date(now).toISOString(),
      processAt: new Date(now + delayMs).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };

    const key = redisKey(queueName, `job:${jobId}`);
    const exists = await this.redis.exists(key);
    if (exists) {
      throw new Error(`Job '${jobId}' already exists in queue '${queueName}'`);
    }

    await this.redis.set(key, JSON.stringify(job));

    if (delayMs > 0) {
      await this.redis.zadd(
        redisKey(queueName, 'delayed'),
        now + delayMs,
        jobId,
      );
    } else {
      await this.redis.zadd(
        redisKey(queueName, 'pending'),
        job.priority * 1e15 + now,
        jobId,
      );
    }

    this.logger.debug(`Enqueued job ${jobId} in queue '${queueName}'`);
    return jobId;
  }

  /** Get a job by ID. */
  async getJob<T = Record<string, unknown>>(
    queueName: string,
    jobId: string,
  ): Promise<Job<T> | null> {
    const key = redisKey(queueName, `job:${jobId}`);
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as Job<T>) : null;
  }

  /** Get statistics for a queue. */
  async getStats(queueName: string): Promise<QueueStats> {
    const pending = await this.redis.zcard(redisKey(queueName, 'pending'));
    const active = await this.redis.zcard(redisKey(queueName, 'active'));
    const delayed = await this.redis.zcard(redisKey(queueName, 'delayed'));
    const completed = await this.redis.zcard(redisKey(queueName, 'completed'));
    const failed = await this.redis.zcard(redisKey(queueName, 'failed'));
    const deadLettered = await this.redis.zcard(
      redisKey(queueName, DLQ_SUFFIX),
    );

    // Get oldest pending job age
    let oldestPendingAgeMs: number | null = null;
    const oldestJobs = await this.redis.zrange(
      redisKey(queueName, 'pending'),
      0,
      0,
    );
    if (oldestJobs.length > 0) {
      const job = await this.getJob(queueName, oldestJobs[0]);
      if (job) {
        oldestPendingAgeMs = Date.now() - new Date(job.createdAt).getTime();
      }
    }

    return {
      name: queueName,
      pending,
      active,
      delayed,
      completed,
      failed,
      deadLettered,
      total: pending + active + delayed + completed + failed + deadLettered,
      oldestPendingAgeMs,
    };
  }

  /** Start polling for all registered queues. */
  startPolling(): void {
    if (this.polling) return;
    this.polling = true;
    this.logger.log('Job queue polling started');

    for (const queueName of this.configs.keys()) {
      const interval = setInterval(() => {
        void this.processNext(queueName);
      }, this.pollIntervalMs);
      this.pollingIntervals.set(queueName, interval);

      // Also process delayed jobs
      const delayedInterval = setInterval(() => {
        void this.moveDelayedJobs(queueName);
      }, 1000);
      this.pollingIntervals.set(`${queueName}:delayed`, delayedInterval);
    }
  }

  /** Stop polling for all registered queues. */
  stopPolling(): void {
    this.polling = false;
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval);
    }
    this.pollingIntervals.clear();
    this.logger.log('Job queue polling stopped');
  }

  // ── Private: Job Processing ──────────────────────────────────────────────

  private async processNext(queueName: string): Promise<void> {
    const config = this.configs.get(queueName);
    if (!config) return;

    try {
      // Atomically pop the highest-priority pending job
      const result = await this.redis.zpopmin(
        redisKey(queueName, 'pending'),
        1,
      );
      if (!result || result.length === 0) return;

      const jobId = result[0];
      const job = await this.getJob(queueName, jobId);
      if (!job) return;

      // Mark as active
      job.status = 'active';
      job.updatedAt = new Date().toISOString();
      await this.redis.set(
        redisKey(queueName, `job:${jobId}`),
        JSON.stringify(job),
      );
      await this.redis.zadd(
        redisKey(queueName, 'active'),
        Date.now(),
        jobId,
      );

      // Execute handler
      const handler = this.handlers.get(queueName);
      if (!handler) {
        throw new Error(`No handler registered for queue '${queueName}'`);
      }

      await handler(job);

      // Success
      await this.markCompleted(queueName, jobId, config);
    } catch (err) {
      // The jobId might not be available if zpopmin failed
      this.logger.error(
        `Error processing job in queue '${queueName}': ${(err as Error).message}`,
      );
    }
  }

  private async markCompleted(
    queueName: string,
    jobId: string,
    config: Required<QueueConfig>,
  ): Promise<void> {
    await this.redis.zrem(redisKey(queueName, 'active'), jobId);

    if (config.removeOnComplete) {
      await this.redis.del(redisKey(queueName, `job:${jobId}`));
    } else {
      const job = await this.getJob(queueName, jobId);
      if (job) {
        job.status = 'completed';
        job.updatedAt = new Date().toISOString();
        await this.redis.set(
          redisKey(queueName, `job:${jobId}`),
          JSON.stringify(job),
        );
        await this.redis.zadd(
          redisKey(queueName, 'completed'),
          Date.now(),
          jobId,
        );
        await this.redis.expire(
          redisKey(queueName, `job:${jobId}`),
          config.completedJobTtlSeconds,
        );
      }
    }
  }

  private async markFailed(
    queueName: string,
    jobId: string,
    error: Error,
    config: Required<QueueConfig>,
  ): Promise<void> {
    await this.redis.zrem(redisKey(queueName, 'active'), jobId);

    let job = await this.getJob(queueName, jobId);
    if (!job) return;

    job.attemptsMade++;
    job.lastError = error.message;
    job.lastErrorStack = error.stack;
    job.updatedAt = new Date().toISOString();

    if (job.attemptsMade < job.maxRetries) {
      // Retry with backoff
      const delayMs = this.calculateBackoff(config, job.attemptsMade);
      job.status = 'delayed';
      job.processAt = new Date(Date.now() + delayMs).toISOString();
      await this.redis.set(
        redisKey(queueName, `job:${jobId}`),
        JSON.stringify(job),
      );
      await this.redis.zadd(
        redisKey(queueName, 'delayed'),
        Date.now() + delayMs,
        jobId,
      );
      this.logger.debug(
        `Job ${jobId} failed, retry ${job.attemptsMade}/${job.maxRetries} in ${delayMs}ms`,
      );
    } else {
      // Max retries exceeded → DLQ
      job.status = 'failed';
      await this.redis.set(
        redisKey(queueName, `job:${jobId}`),
        JSON.stringify(job),
      );
      await this.redis.zadd(
        redisKey(queueName, 'failed'),
        Date.now(),
        jobId,
      );
      await this.redis.zadd(
        redisKey(queueName, DLQ_SUFFIX),
        Date.now(),
        jobId,
      );
      await this.redis.expire(
        redisKey(queueName, `job:${jobId}`),
        config.failedJobTtlSeconds,
      );
      this.logger.warn(
        `Job ${jobId} exhausted retries (${job.maxRetries}) — moved to DLQ`,
      );
    }
  }

  private async moveDelayedJobs(queueName: string): Promise<void> {
    const now = Date.now();
    const jobIds = await this.redis.zrangebyscore(
      redisKey(queueName, 'delayed'),
      0,
      now,
      'LIMIT',
      0,
      20,
    );

    for (const jobId of jobIds) {
      const job = await this.getJob(queueName, jobId);
      if (!job) {
        await this.redis.zrem(redisKey(queueName, 'delayed'), jobId);
        continue;
      }

      job.status = 'pending';
      job.updatedAt = new Date().toISOString();
      await this.redis.set(
        redisKey(queueName, `job:${jobId}`),
        JSON.stringify(job),
      );
      await this.redis.zrem(redisKey(queueName, 'delayed'), jobId);
      await this.redis.zadd(
        redisKey(queueName, 'pending'),
        job.priority * 1e15 + now,
        jobId,
      );
    }
  }

  private calculateBackoff(
    config: Required<QueueConfig>,
    attempt: number,
  ): number {
    if (config.backoffStrategy === 'fixed') {
      return config.backoffDelayMs;
    }
    // Exponential: delay * 2^(attempt-1)
    const delay = Math.min(
      config.backoffDelayMs * Math.pow(2, attempt - 1),
      config.maxBackoffDelayMs,
    );
    return delay;
  }
}
