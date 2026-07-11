// Telemetry shared context types for enrichment pipeline

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type AppSurface =
  | "landing"
  | "auth"
  | "creator_dashboard"
  | "marketplace"
  | "profile"
  | "settings"
  | "unknown";

export interface TelemetrySharedContext {
  timestamp: string;          // ISO-8601
  route: string;              // pathname without query string
  locale: string;             // normalized locale code, e.g. en, fr
  session_id: string;         // stable for one browser session
  device_type: DeviceType;
  app_surface: AppSurface;
  anonymous_id?: string;
  user_id?: string;
  referrer_route?: string;
}

export interface EnrichedTelemetryEvent<TPayload extends Record<string, unknown>> {
  context: TelemetrySharedContext;
  payload: TPayload;
}
