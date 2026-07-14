// ── Pipeline Orchestrator ────────────────────────────────────────────────────

import { Injectable, Logger } from '@nestjs/common';
import {
  PipelineStep,
  PipelineResult,
  PipelineOptions,
  StepTiming,
} from './pipeline.types';

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  /**
   * Execute a pipeline of steps sequentially.
   *
   * Steps are executed in order. On failure:
   * - If `haltOnFailure` is true (default), the pipeline stops and runs
   *   compensation functions for already-completed steps in reverse order.
   * - If a step has `maxRetries` > 0, it will be retried before failing.
   * - If a step has `continueOnFailure` set, the pipeline continues even
   *   if that step fails (its error is logged but not propagated).
   *
   * @param name - Pipeline name (for logging).
   * @param steps - Ordered array of pipeline steps.
   * @param initialContext - The initial context passed to the first step.
   * @param options - Pipeline execution options.
   * @returns PipelineResult with success status, final context, and timings.
   */
  async execute<TContext = Record<string, unknown>>(
    name: string,
    steps: PipelineStep<TContext>[],
    initialContext: TContext,
    options: PipelineOptions = {},
  ): Promise<PipelineResult<TContext>> {
    const startTime = Date.now();
    const {
      haltOnFailure = true,
      timeoutMs = 60000,
      verbose = true,
    } = options;

    const timings: StepTiming[] = [];
    let context: TContext = { ...initialContext };
    const completedSteps: PipelineStep<TContext>[] = [];

    this.logStart(name, steps.length, verbose);

    for (const step of steps) {
      const stepStart = Date.now();
      let attempt = 0;
      const maxRetries = step.maxRetries ?? 0;
      let lastError: Error | undefined;

      // Retry loop
      while (attempt <= maxRetries) {
        try {
          // Execute step
          context = await this.executeWithTimeout(
            step.execute,
            context,
            timeoutMs,
          );

          completedSteps.push(step);
          const duration = Date.now() - stepStart;
          timings.push({
            step: step.name,
            durationMs: duration,
            success: true,
            attempts: attempt + 1,
          });

          this.logStepSuccess(name, step.name, duration, attempt, verbose);
          lastError = undefined;
          break;
        } catch (err) {
          lastError = err as Error;
          attempt++;

          if (attempt <= maxRetries) {
            const delay = (step.retryDelayMs ?? 1000) * Math.pow(2, attempt - 1);
            this.logger.warn(
              `[${name}] Step '${step.name}' failed (attempt ${attempt}/${maxRetries + 1}), ` +
                `retrying in ${delay}ms: ${lastError.message}`,
            );
            await this.sleep(delay);
          }
        }
      }

      if (lastError) {
        // Step failed after all retries
        const duration = Date.now() - stepStart;
        timings.push({
          step: step.name,
          durationMs: duration,
          success: false,
          attempts: attempt,
          error: lastError.message,
        });

        if (step.continueOnFailure) {
          this.logger.warn(
            `[${name}] Step '${step.name}' failed but continueOnFailure is set — continuing`,
          );
          continue;
        }

        if (haltOnFailure) {
          // Compensate completed steps in reverse order
          await this.compensate(completedSteps, context, lastError);

          return {
            success: false,
            context,
            failedAtStep: step.name,
            error: lastError,
            durationMs: Date.now() - startTime,
            stepTimings: timings,
          };
        }
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.log(
      `[${name}] Pipeline completed successfully in ${totalDuration}ms ` +
        `(${steps.length} steps)`,
    );

    return {
      success: true,
      context,
      durationMs: totalDuration,
      stepTimings: timings,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private async compensate<TContext>(
    completedSteps: PipelineStep<TContext>[],
    context: TContext,
    error: Error,
  ): Promise<void> {
    for (const step of completedSteps.reverse()) {
      if (step.compensate) {
        try {
          await step.compensate(context, error);
          this.logger.log(`Compensated step '${step.name}'`);
        } catch (compErr) {
          this.logger.error(
            `Compensation failed for step '${step.name}': ${(compErr as Error).message}`,
          );
        }
      }
    }
  }

  private async executeWithTimeout<TContext>(
    fn: (ctx: TContext) => Promise<TContext>,
    context: TContext,
    timeoutMs: number,
  ): Promise<TContext> {
    if (timeoutMs <= 0) return fn(context);

    return Promise.race([
      fn(context),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Pipeline step timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  private logStart(
    name: string,
    stepCount: number,
    verbose: boolean,
  ): void {
    if (verbose) {
      this.logger.log(`[${name}] Starting pipeline with ${stepCount} steps`);
    }
  }

  private logStepSuccess(
    pipelineName: string,
    stepName: string,
    durationMs: number,
    attempts: number,
    verbose: boolean,
  ): void {
    if (verbose) {
      const retryInfo = attempts > 1 ? ` (${attempts} attempts)` : '';
      this.logger.debug(
        `[${pipelineName}] Step '${stepName}' completed in ${durationMs}ms${retryInfo}`,
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
