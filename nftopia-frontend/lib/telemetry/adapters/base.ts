import type { EnrichedTelemetryEvent } from '../../telemetry/context/types';

export interface TelemetryAdapter {
  init(): Promise<void> | void;
  track(eventName: string, payload?: EnrichedTelemetryEvent<Record<string, unknown>>): Promise<void> | void;
  identify(userId: string, traits?: Record<string, unknown>): Promise<void> | void;
  reset(): Promise<void> | void;
}
