import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * CircuitBreaker — Protects against cascading failures from external
 * service calls (e.g., Soroban RPC) by failing fast when the circuit is open.
 *
 * States:
 *   CLOSED   — normal operation, requests pass through
 *   OPEN     — failures exceed threshold, requests fail immediately
 *   HALF_OPEN — trial period, allows limited requests to test recovery
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold?: number;
  /** Milliseconds to wait before transitioning from OPEN to HALF_OPEN */
  resetTimeoutMs?: number;
  /** Maximum requests allowed in HALF_OPEN state to test recovery */
  halfOpenMaxRequests?: number;
  /** Callback invoked on state changes */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenRequestCount = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxRequests: number;
  private readonly onStateChange?: (
    from: CircuitState,
    to: CircuitState,
  ) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000;
    this.halfOpenMaxRequests = options.halfOpenMaxRequests ?? 3;
    this.onStateChange = options.onStateChange;
  }

  /**
   * Execute an async function with circuit breaker protection.
   * If the circuit is OPEN, throws immediately without calling fn.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new CircuitOpenError(
          `Circuit is OPEN. Retry after ${this.getRetryAfterMs()}ms`,
        );
      }
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenRequestCount >= this.halfOpenMaxRequests) {
        throw new CircuitOpenError(
          'Circuit is HALF_OPEN — trial request limit reached',
        );
      }
      this.halfOpenRequestCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Manually reset the circuit to CLOSED state.
   */
  reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenRequestCount = 0;
    this.lastFailureTime = null;
    this.transitionTo('CLOSED');
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;

    if (this.state === 'HALF_OPEN' && this.successCount >= 2) {
      this.halfOpenRequestCount = 0;
      this.transitionTo('CLOSED');
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (
      this.state === 'CLOSED' &&
      this.failureCount >= this.failureThreshold
    ) {
      this.transitionTo('OPEN');
    }

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    }
  }

  private shouldAttemptReset(): boolean {
    if (this.lastFailureTime === null) return true;
    return Date.now() - this.lastFailureTime >= this.resetTimeoutMs;
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.onStateChange?.(oldState, newState);
  }

  private getRetryAfterMs(): number {
    if (this.lastFailureTime === null) return this.resetTimeoutMs;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }
}

export class CircuitOpenError extends HttpException {
  constructor(message: string) {
    super(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        error: 'Service Unavailable',
        message,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    this.name = 'CircuitOpenError';
  }
}
