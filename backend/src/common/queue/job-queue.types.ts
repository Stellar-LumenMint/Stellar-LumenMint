// ── Job Queue Types ─────────────────────────────────────────────────────────

/** Status of a job as it moves through the queue lifecycle. */
export type JobStatus = 'pending' | 'active' | 'completed' | 'failed' | 'delayed';

/** Priority levels for job scheduling. Lower number = higher priority. */
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 5,
  LOW = 8,
  BACKGROUND = 10,
}

/** Retry backoff strategy. */
export type BackoffStrategy = 'fixed' | 'exponential';

/** Configuration for a job queue. */
export interface QueueConfig {
  /** Queue name (used as Redis key prefix). */
  name: string;
  /** Maximum retry attempts before moving to DLQ. Default: 3. */
  maxRetries?: number;
  /** Backoff strategy. Default: 'exponential'. */
  backoffStrategy?: BackoffStrategy;
  /** Base delay in ms for retries. Default: 1000. */
  backoffDelayMs?: number;
  /** Maximum backoff delay in ms. Default: 60000. */
  maxBackoffDelayMs?: number;
  /** TTL in seconds for completed jobs. Default: 86400 (24h). */
  completedJobTtlSeconds?: number;
  /** TTL in seconds for failed jobs. Default: 604800 (7 days). */
  failedJobTtlSeconds?: number;
  /** Remove successfully completed jobs. Default: false. */
  removeOnComplete?: boolean;
  /** Remove failed jobs. Default: false. */
  removeOnFail?: boolean;
}

/** Options when enqueuing a job. */
export interface EnqueueOptions {
  /** Unique job ID for deduplication. If not provided, auto-generated. */
  jobId?: string;
  /** Priority (1 = highest). Default: NORMAL (5). */
  priority?: JobPriority;
  /** Delay in ms before the job becomes available. */
  delayMs?: number;
  /** Maximum retry attempts for this specific job (overrides queue default). */
  maxRetries?: number;
  /** Time-to-live in ms; job is discarded if not started within this window. */
  ttlMs?: number;
}

/** A job stored in the queue. */
export interface Job<T = Record<string, unknown>> {
  /** Unique job ID. */
  id: string;
  /** Queue name this job belongs to. */
  queueName: string;
  /** The job payload. */
  data: T;
  /** Current status. */
  status: JobStatus;
  /** Priority (1 = highest). */
  priority: number;
  /** Current retry attempt count. */
  attemptsMade: number;
  /** Maximum retry attempts allowed. */
  maxRetries: number;
  /** When the job was created (ISO string). */
  createdAt: string;
  /** When the job should be processed (ISO string) — may be in the future for delayed jobs. */
  processAt: string;
  /** When the job was last updated (ISO string). */
  updatedAt: string;
  /** Error message from last failure, if any. */
  lastError?: string;
  /** Stack trace from last failure, if any. */
  lastErrorStack?: string;
  /** When this job expires and should be cleaned up (ISO string). */
  expiresAt?: string;
}

/** Handler function that processes a job. */
export type JobHandler<T = Record<string, unknown>> = (job: Job<T>) => Promise<void>;

/** Job queue statistics. */
export interface QueueStats {
  name: string;
  pending: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  deadLettered: number;
  total: number;
  oldestPendingAgeMs: number | null;
}
