import { ReliabilityConfig } from './config';

export interface QueuedTelemetryEvent {
  id: string;
  eventName: string;
  payload: Record<string, unknown>;
  enqueuedAt: number;
  attempts: number;
  nextRetryAt: number;
}

export class TelemetryQueue {
  private queue: QueuedTelemetryEvent[] = [];
  private capacity: number;
  private maxEventAgeMs: number;
  private debug: boolean;

  constructor(config: ReliabilityConfig) {
    this.capacity = config.queueCapacity;
    this.maxEventAgeMs = config.maxEventAgeMs;
    this.debug = config.debug;
  }

  /**
   * Drop events that have been queued past maxEventAgeMs. Called on
   * dequeue so expired events are never dispatched after an offline gap.
   */
  private dropExpired(now: number) {
    const expired = this.queue.filter((event) => now - event.enqueuedAt > this.maxEventAgeMs);
    if (expired.length > 0) {
      this.queue = this.queue.filter((event) => !expired.includes(event));
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log(
          `[telemetry][queue_drop_expired] count=${expired.length} maxAgeMs=${this.maxEventAgeMs}`,
        );
      }
    }
  }

  enqueue(event: QueuedTelemetryEvent) {
    if (this.queue.length >= this.capacity) {
      const dropped = this.queue.shift();
      if (this.debug) {
        // eslint-disable-next-line no-console
        console.log(
          `[telemetry][queue_drop_overflow] eventName=${dropped?.eventName} queueSize=${this.queue.length}`,
        );
      }
    }
    this.queue.push(event);
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(
        `[telemetry][queue_enqueue] eventName=${event.eventName} queueSize=${this.queue.length}`,
      );
    }
  }

  dequeueBatch(batchSize: number): QueuedTelemetryEvent[] {
    this.dropExpired(Date.now());
    return this.queue.splice(0, batchSize);
  }

  peek(): QueuedTelemetryEvent | undefined {
    return this.queue[0];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear() {
    this.queue = [];
  }
}
