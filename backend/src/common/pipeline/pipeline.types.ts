// ── Pipeline Types ───────────────────────────────────────────────────────────

/** A single step in a processing pipeline. */
export interface PipelineStep<TContext = Record<string, unknown>> {
  /** Step name (used for logging and error handling). */
  name: string;
  /** Execute this step. Returns the updated context. */
  execute: (context: TContext) => Promise<TContext>;
  /** Optional: compensate/rollback on failure. */
  compensate?: (context: TContext, error: Error) => Promise<void>;
  /** Whether to continue the pipeline if this step fails. Default: false. */
  continueOnFailure?: boolean;
  /** Maximum retries for this specific step. Default: 0. */
  maxRetries?: number;
  /** Backoff delay in ms between retries. Default: 1000. */
  retryDelayMs?: number;
}

/** Result of pipeline execution. */
export interface PipelineResult<TContext = Record<string, unknown>> {
  /** Whether the pipeline completed successfully. */
  success: boolean;
  /** The final context after pipeline execution. */
  context: TContext;
  /** The step where execution stopped, if it failed. */
  failedAtStep?: string;
  /** Error details, if the pipeline failed. */
  error?: Error;
  /** Duration of execution in ms. */
  durationMs: number;
  /** Per-step timing information. */
  stepTimings: StepTiming[];
}

/** Timing information for a single pipeline step. */
export interface StepTiming {
  step: string;
  durationMs: number;
  success: boolean;
  attempts: number;
  error?: string;
}

/** Options for pipeline execution. */
export interface PipelineOptions {
  /** Whether to halt on first step failure. Default: true. */
  haltOnFailure?: boolean;
  /** Timeout for the entire pipeline in ms. Default: 60000. */
  timeoutMs?: number;
  /** Whether to log step details. Default: true. */
  verbose?: boolean;
}
