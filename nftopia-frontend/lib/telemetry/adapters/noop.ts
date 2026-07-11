import { TelemetryAdapter } from "./base";
import { getTelemetryConfig } from "../config";
import type { EnrichedTelemetryEvent } from "../context/types";

const debugLog = (...args: unknown[]) => {
  if (getTelemetryConfig().debug) {
    // eslint-disable-next-line no-console
    console.debug("[Telemetry][Noop]", ...args);
  }
};

export const noopAdapter: TelemetryAdapter = {
  init: () => debugLog("init called"),
  track: (eventName, payload: EnrichedTelemetryEvent<Record<string, unknown>>) =>
    debugLog("track", eventName, payload),
  identify: (userId, traits) => debugLog("identify", userId, traits),
  reset: () => debugLog("reset called"),
};
