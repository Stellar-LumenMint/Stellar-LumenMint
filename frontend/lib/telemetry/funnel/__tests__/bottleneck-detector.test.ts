import { BottleneckDetector } from '../bottleneck-detector';

describe('BottleneckDetector', () => {
  it('detects stalled_no_interaction', () => {
    const now = Date.now();
    const signal = BottleneckDetector.detectAbandonmentSignal({
      stageEnterTime: now - 6 * 60 * 1000,
      interactionCount: 0,
    });
    expect(signal?.signal).toBe('stalled_no_interaction');
  });

  it('detects max_retries_exceeded', () => {
    const now = Date.now();
    const signal = BottleneckDetector.detectAbandonmentSignal({
      stageEnterTime: now - 1000,
      interactionCount: 1,
      retryCount: 3,
    });
    expect(signal?.signal).toBe('max_retries_exceeded');
  });

  it('detects error_loop', () => {
    const now = Date.now();
    const signal = BottleneckDetector.detectAbandonmentSignal({
      stageEnterTime: now - 1000,
      interactionCount: 1,
      recentErrorCodes: ['err1', 'err2'],
    });
    expect(signal?.signal).toBe('error_loop');
  });

  it('returns null for healthy traversal', () => {
    const now = Date.now();
    const signal = BottleneckDetector.detectAbandonmentSignal({
      stageEnterTime: now - 1000,
      interactionCount: 2,
    });
    expect(signal).toBeNull();
  });
});
