// ── Pipeline Service Tests ───────────────────────────────────────────────────

import { Test, TestingModule } from '@nestjs/testing';
import { PipelineService } from './pipeline.service';
import { PipelineStep } from './pipeline.types';

interface TestContext {
  value: number;
  log: string[];
}

describe('PipelineService', () => {
  let service: PipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipelineService],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
  });

  describe('execute', () => {
    it('should execute all steps in order', async () => {
      const steps: PipelineStep<TestContext>[] = [
        {
          name: 'step1',
          execute: async (ctx) => ({
            ...ctx,
            value: ctx.value + 1,
            log: [...ctx.log, 'step1'],
          }),
        },
        {
          name: 'step2',
          execute: async (ctx) => ({
            ...ctx,
            value: ctx.value * 2,
            log: [...ctx.log, 'step2'],
          }),
        },
      ];

      const result = await service.execute<TestContext>(
        'test-pipeline',
        steps,
        { value: 2, log: [] },
      );

      expect(result.success).toBe(true);
      expect(result.context.value).toBe(6); // (2+1)*2
      expect(result.context.log).toEqual(['step1', 'step2']);
      expect(result.stepTimings).toHaveLength(2);
    });

    it('should halt on failure and run compensations in reverse', async () => {
      const compensationLog: string[] = [];

      const steps: PipelineStep<TestContext>[] = [
        {
          name: 'step1',
          execute: async (ctx) => ({
            ...ctx,
            value: ctx.value + 1,
            log: [...ctx.log, 'step1'],
          }),
          compensate: async () => {
            compensationLog.push('compensate-step1');
          },
        },
        {
          name: 'step2',
          execute: async () => {
            throw new Error('step2 blew up');
          },
          compensate: async () => {
            compensationLog.push('compensate-step2');
          },
        },
        {
          name: 'step3',
          execute: async (ctx) => ({
            ...ctx,
            value: ctx.value + 100,
            log: [...ctx.log, 'step3'],
          }),
        },
      ];

      const result = await service.execute<TestContext>(
        'fail-pipeline',
        steps,
        { value: 0, log: [] },
      );

      expect(result.success).toBe(false);
      expect(result.failedAtStep).toBe('step2');
      expect(result.error?.message).toBe('step2 blew up');
      // Compensation ran for completed step1 in reverse order
      expect(compensationLog).toEqual(['compensate-step1']);
    });

    it('should continue on failure if continueOnFailure is set', async () => {
      const steps: PipelineStep<TestContext>[] = [
        {
          name: 'non-critical',
          execute: async () => {
            throw new Error('ignored error');
          },
          continueOnFailure: true,
        },
        {
          name: 'critical',
          execute: async (ctx) => ({
            ...ctx,
            value: 42,
            log: [...ctx.log, 'critical'],
          }),
        },
      ];

      const result = await service.execute<TestContext>(
        'continue-pipeline',
        steps,
        { value: 0, log: [] },
      );

      expect(result.success).toBe(true);
      expect(result.context.value).toBe(42);
      expect(result.context.log).toEqual(['critical']);
    });

    it('should retry failed steps', async () => {
      let attempts = 0;

      const steps: PipelineStep<TestContext>[] = [
        {
          name: 'flaky',
          execute: async () => {
            attempts++;
            if (attempts < 3) throw new Error('transient failure');
            return { value: 99, log: [] };
          },
          maxRetries: 3,
          retryDelayMs: 10,
        },
      ];

      const result = await service.execute<TestContext>(
        'retry-pipeline',
        steps,
        { value: 0, log: [] },
      );

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
      expect(result.context.value).toBe(99);
    });

    it('should fail after exhausting retries', async () => {
      const steps: PipelineStep<TestContext>[] = [
        {
          name: 'always-fails',
          execute: async () => {
            throw new Error('permanent failure');
          },
          maxRetries: 2,
          retryDelayMs: 10,
        },
      ];

      const result = await service.execute<TestContext>(
        'exhausted-pipeline',
        steps,
        { value: 0, log: [] },
      );

      expect(result.success).toBe(false);
      expect(result.failedAtStep).toBe('always-fails');
      expect(result.stepTimings[0].attempts).toBe(3); // initial + 2 retries
    });

    it('should include timing information for every step', async () => {
      const steps: PipelineStep<TestContext>[] = [
        {
          name: 'fast',
          execute: async (ctx) => ({ ...ctx, value: ctx.value + 1 }),
        },
        {
          name: 'slow-ish',
          execute: async (ctx) => {
            await new Promise((r) => setTimeout(r, 20));
            return { ...ctx, value: ctx.value + 1 };
          },
        },
      ];

      const result = await service.execute<TestContext>(
        'timing-pipeline',
        steps,
        { value: 0, log: [] },
      );

      expect(result.durationMs).toBeGreaterThan(0);
      expect(result.stepTimings).toHaveLength(2);
      expect(result.stepTimings[1].durationMs).toBeGreaterThanOrEqual(15);
    });
  });
});
