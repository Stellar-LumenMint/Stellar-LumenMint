// Reliability config and types for telemetry reliability layer

export interface SamplingRule {
  eventName: string;
  rate: number; // 0.0 to 1.0
}

export interface DebounceRule {
  eventName: string;
  windowMs: number;
}

export interface ReliabilityConfig {
  enabled: boolean;
  queueCapacity: number;
  // Events older than this are dropped at dequeue time instead of being
  // dispatched: a stale event from a previous session has no value.
  maxEventAgeMs: number;
  flushIntervalMs: number;
  batchSize: number;
  retry: {
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier: number;
    maxAttempts: number;
    jitterRatio: number;
  };
  samplingRules: SamplingRule[];
  debounceRules: DebounceRule[];
  debug: boolean;
}

export const DEFAULT_RELIABILITY_CONFIG: ReliabilityConfig = {
  enabled: process.env.NEXT_PUBLIC_TELEMETRY_RELIABILITY_ENABLED === 'true',
  queueCapacity: 500,
  // 24h: long enough to survive a brief offline period, short enough that
  // a stale session can never pollute analytics.
  maxEventAgeMs: 24 * 60 * 60 * 1000,
  flushIntervalMs: 5000,
  batchSize: 20,
  retry: {
    initialDelayMs: 500,
    maxDelayMs: 30000,
    multiplier: 2,
    maxAttempts: 5,
    jitterRatio: 0.2,
  },
  samplingRules: [],
  debounceRules: [],
  debug: process.env.NEXT_PUBLIC_TELEMETRY_RELIABILITY_DEBUG === 'true',
};
