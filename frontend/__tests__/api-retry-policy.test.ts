interface RetryOptions {
  retries: number;
  delayMs: number;
}

async function withRetryPolicy<T>(
  action: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  let attempts = 0;
  while (attempts < options.retries) {
    try {
      return await action();
    } catch (error) {
      attempts++;
      if (attempts >= options.retries) {
        throw error;
      }
      if (options.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }
  throw new Error("Retry policy execution exhausted without processing.");
}

describe("API Auto-Retry Policy Engine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper utility to flush microtask cycles in Jest's fake timer environment
  const flushMicrotasks = () =>
    new Promise(jest.requireActual("timers").setImmediate);

  it("should instantly return data payloads on an immediate HTTP 200 success resolution", async () => {
    const operationMock = jest
      .fn()
      .mockResolvedValue({ data: "STK_MARKET_SNAPSHOT" });

    const result = await withRetryPolicy(operationMock, {
      retries: 3,
      delayMs: 100,
    });

    expect(result).toEqual({ data: "STK_MARKET_SNAPSHOT" });
    expect(operationMock).toHaveBeenCalledTimes(1);
  });

  it("should transparently recover if a failure occurs initially but resolves on a subsequent retry", async () => {
    const operationMock = jest
      .fn()
      .mockRejectedValueOnce(new Error("Transient Gateway Timeout 504"))
      .mockResolvedValueOnce({ status: "MUTATED_SUCCESSFULLY" });

    const promise = withRetryPolicy(operationMock, {
      retries: 3,
      delayMs: 100,
    });

    // 1. Give the async function cycle time to evaluate the first failure and enter its setTimeout block
    await flushMicrotasks();

    // 2. Fast-forward the backoff timers
    jest.advanceTimersByTime(100);

    // 3. Drain the microtask queue to allow the resolved setTimeout promise to wake up the function loop
    await flushMicrotasks();

    const result = await promise;

    expect(result).toEqual({ status: "MUTATED_SUCCESSFULLY" });
    expect(operationMock).toHaveBeenCalledTimes(2);
  });

  it("should fail completely and throw an error once the configured retry ceiling is fully exhausted", async () => {
    const operationMock = jest
      .fn()
      .mockRejectedValue(new Error("Persistent Fatal Infrastructure Failure"));

    const promise = withRetryPolicy(operationMock, {
      retries: 3,
      delayMs: 150,
    });

    // Bind the rejection expectation first so Jest intercepts the error
    const assertionPromise = expect(promise).rejects.toThrow(
      "Persistent Fatal Infrastructure Failure",
    );

    // Step through iteration 1 -> 2
    await flushMicrotasks();
    jest.advanceTimersByTime(150);

    // Step through iteration 2 -> 3
    await flushMicrotasks();
    jest.advanceTimersByTime(150);

    // Final flush to resolve the exhausted loop rejection
    await flushMicrotasks();

    // Await the assertion itself to conclude the test safely
    await assertionPromise;

    expect(operationMock).toHaveBeenCalledTimes(3);
  });
});
