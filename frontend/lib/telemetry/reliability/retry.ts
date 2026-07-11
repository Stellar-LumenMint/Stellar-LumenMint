import { QueuedTelemetryEvent } from './queue';
import { ReliabilityConfig } from './config';

export function computeNextRetryDelayMs(attempts: number, config: ReliabilityConfig): number {
  const { initialDelayMs, maxDelayMs, multiplier, jitterRatio } = config.retry;
  let delay = initialDelayMs * Math.pow(multiplier, attempts - 1);
  delay = Math.min(delay, maxDelayMs);
  // Add jitter: +/- jitterRatio
  const jitter = delay * jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(delay + jitter));
}

export function shouldDropEvent(event: QueuedTelemetryEvent, config: ReliabilityConfig): boolean {
  return event.attempts >= config.retry.maxAttempts;
}
