import { TelemetryQueue, QueuedTelemetryEvent } from './queue';
import { ReliabilityConfig } from './config';
import { computeNextRetryDelayMs, shouldDropEvent } from './retry';

export class TelemetryDispatcher {
  private queue: TelemetryQueue;
  private config: ReliabilityConfig;
  private isFlushing = false;
  private flushTimer: NodeJS.Timeout | null = null;
  private adapterReady = true;

  constructor(queue: TelemetryQueue, config: ReliabilityConfig) {
    this.queue = queue;
    this.config = config;
  }

  setAdapterReady(ready: boolean) {
    this.adapterReady = ready;
    if (ready) this.flush();
  }

  schedulePeriodicFlush() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
  }

  async flush() {
    if (this.isFlushing || !this.adapterReady) return;
    this.isFlushing = true;
    try {
      let batch;
      while (!this.queue.isEmpty() && this.adapterReady) {
        batch = this.queue.dequeueBatch(this.config.batchSize);
        const now = Date.now();
        for (const event of batch) {
          if (event.nextRetryAt > now) {
            this.queue.enqueue(event); // Not ready yet, requeue
            continue;
          }
          try {
            // Replace with actual adapter dispatch
            await this.dispatchToAdapter(event);
            if (this.config.debug) {
              // eslint-disable-next-line no-console
              console.log(`[telemetry][dispatch_success] eventName=${event.eventName} attempts=${event.attempts}`);
            }
          } catch (err) {
            event.attempts++;
            if (shouldDropEvent(event, this.config)) {
              if (this.config.debug) {
                // eslint-disable-next-line no-console
                console.log(`[telemetry][event_dropped_max_attempts] eventName=${event.eventName} attempts=${event.attempts}`);
              }
              continue;
            }
            event.nextRetryAt = Date.now() + computeNextRetryDelayMs(event.attempts, this.config);
            this.queue.enqueue(event);
            if (this.config.debug) {
              // eslint-disable-next-line no-console
              console.log(`[telemetry][retry_scheduled] eventName=${event.eventName} attempts=${event.attempts} nextRetryAt=${event.nextRetryAt}`);
            }
          }
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  // Placeholder for actual adapter dispatch logic
  async dispatchToAdapter(event: QueuedTelemetryEvent): Promise<void> {
    // Simulate async dispatch, replace with real implementation
    return Promise.resolve();
  }
}
