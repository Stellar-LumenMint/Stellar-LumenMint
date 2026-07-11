jest.setTimeout(10000);

import { TelemetryQueue, QueuedTelemetryEvent } from '../reliability/queue';
import { DEFAULT_RELIABILITY_CONFIG } from '../reliability/config';
import { computeNextRetryDelayMs, shouldDropEvent } from '../reliability/retry';
import { shouldSampleEvent } from '../reliability/sampling';
import { TelemetryDebouncer } from '../reliability/debounce';

describe('Telemetry Reliability Layer', () => {
  it('enqueues failed events and drops oldest on overflow', () => {
    const config = { ...DEFAULT_RELIABILITY_CONFIG, queueCapacity: 3, debug: false };
    const queue = new TelemetryQueue(config);
    for (let i = 0; i < 4; i++) {
      queue.enqueue({
        id: String(i),
        eventName: 'test',
        payload: {},
        enqueuedAt: Date.now(),
        attempts: 1,
        nextRetryAt: Date.now(),
      });
    }
    expect(queue.size()).toBe(3);
    expect(queue.peek()?.id).toBe('1'); 
  });

  it('computes exponential backoff with jitter', () => {
    const config = DEFAULT_RELIABILITY_CONFIG;
    const delays = Array.from({ length: 5 }, (_, i) => computeNextRetryDelayMs(i + 1, config));
    expect(delays[0]).toBeGreaterThanOrEqual(400); 
    expect(delays[0]).toBeLessThanOrEqual(600);    
    expect(delays[4]).toBeLessThanOrEqual(config.retry.maxDelayMs);
  });

  it('drops event after max attempts', () => {
    const config = { ...DEFAULT_RELIABILITY_CONFIG, retry: { ...DEFAULT_RELIABILITY_CONFIG.retry, maxAttempts: 3 } };
    const event: QueuedTelemetryEvent = {
      id: '1', eventName: 'test', payload: {}, enqueuedAt: Date.now(), attempts: 3, nextRetryAt: Date.now()
    };
    expect(shouldDropEvent(event, config)).toBe(true);
  });

  it('samples out events below rate', () => {
    const rules = [{ eventName: 'foo', rate: 0 }];
    expect(shouldSampleEvent('foo', rules)).toBe(false);
    expect(shouldSampleEvent('bar', rules)).toBe(true); 
  });

  it('debounces events and only dispatches latest', done => {
    const rule = { eventName: 'debounced', windowMs: 200 };
    const debouncer = new TelemetryDebouncer([rule]);
    let dispatched = 0;

    const failTimeout = setTimeout(() => {
      done(new Error('Debounce callback not called'));
    }, 1000);

    const handleDispatch = (event: any) => {
      clearTimeout(failTimeout);
      console.log('Debounce callback fired', event);
      expect(event.value).toBe(2); 
      dispatched++;
      expect(dispatched).toBe(1); 
      done();
    };

    debouncer.debounce('debounced', { value: 1 }, rule, handleDispatch);

    setTimeout(() => {
      debouncer.debounce('debounced', { value: 2 }, rule, handleDispatch);
    }, 10); 
  });
});
