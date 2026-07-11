// Enrichment middleware for telemetry events
import { TelemetrySharedContext, EnrichedTelemetryEvent } from "./types";
import { resolveRoute, resolveLocale } from "./resolvers";
import { resolveSessionId } from "./session";
import { resolveDeviceType } from "./device";
import { resolveAppSurface } from "./surface";

function getTimestamp(): string {
  return new Date().toISOString();
}

export function enrichTelemetryPayload<T extends Record<string, unknown>>(
  payload: T,
  overrides?: Partial<TelemetrySharedContext>,
  isSSR?: boolean
): EnrichedTelemetryEvent<T> {
  let route = "unknown";
  let locale = "en";
  let session_id = "unknown";
  let device_type = "unknown";
  let app_surface = "unknown";
  let referrer_route: string | undefined = undefined;
  let anonymous_id: string | undefined = undefined;
  let user_id: string | undefined = undefined;

  try {
    route = resolveRoute(undefined, isSSR);
    locale = resolveLocale(route);
    session_id = resolveSessionId();
    device_type = resolveDeviceType(isSSR);
    app_surface = resolveAppSurface(route);
    // Optionally, referrer_route, anonymous_id, user_id can be resolved here if needed
  } catch {}

  const context: TelemetrySharedContext = {
    timestamp: getTimestamp(),
    route,
    locale,
    session_id,
    device_type: device_type as TelemetrySharedContext["device_type"],
    app_surface: app_surface as TelemetrySharedContext["app_surface"],
    anonymous_id,
    user_id,
    referrer_route,
    ...overrides,
  };

  return {
    context,
    payload: { ...payload }, // never mutate original
  };
}
