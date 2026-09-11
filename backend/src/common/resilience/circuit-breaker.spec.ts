import { CircuitBreaker, CircuitOpenError } from './circuit-breaker';

describe('CircuitBreaker', () => {
  it('passes through while closed and opens after the failure threshold', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    const failing = jest.fn().mockRejectedValue(new Error('boom'));

    for (let i = 0; i < 3; i += 1) {
      await expect(breaker.execute(failing)).rejects.toThrow('boom');
    }

    expect(breaker.getState()).toBe('OPEN');

    const operation = jest.fn().mockResolvedValue('ok');
    await expect(breaker.execute(operation)).rejects.toThrow(CircuitOpenError);
    expect(operation).not.toHaveBeenCalled();
  });

  it('resets the failure count on success', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });

    await expect(
      breaker.execute(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await breaker.execute(() => Promise.resolve('ok'));
    await expect(
      breaker.execute(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    expect(breaker.getState()).toBe('CLOSED');
  });

  describe('shouldCountFailure', () => {
    it('ignores errors the predicate rejects', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        shouldCountFailure: (error) =>
          error instanceof Error && error.message !== 'client error',
      });

      for (let i = 0; i < 5; i += 1) {
        await expect(
          breaker.execute(() => Promise.reject(new Error('client error'))),
        ).rejects.toThrow('client error');
      }

      expect(breaker.getState()).toBe('CLOSED');
    });

    it('still opens on errors the predicate accepts', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        shouldCountFailure: (error) =>
          error instanceof Error && error.message === 'timeout',
      });

      await expect(
        breaker.execute(() => Promise.reject(new Error('timeout'))),
      ).rejects.toThrow('timeout');
      await expect(
        breaker.execute(() => Promise.reject(new Error('timeout'))),
      ).rejects.toThrow('timeout');

      expect(breaker.getState()).toBe('OPEN');
    });
  });

  it('moves to HALF_OPEN after the reset timeout and closes on recovery', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeoutMs: 0,
      halfOpenMaxRequests: 2,
    });

    await expect(
      breaker.execute(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(breaker.getState()).toBe('OPEN');

    // resetTimeoutMs = 0 allows an immediate trial request.
    await breaker.execute(() => Promise.resolve('ok'));
    await breaker.execute(() => Promise.resolve('ok'));

    expect(breaker.getState()).toBe('CLOSED');
  });
});
