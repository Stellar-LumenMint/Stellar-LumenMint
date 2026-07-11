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
