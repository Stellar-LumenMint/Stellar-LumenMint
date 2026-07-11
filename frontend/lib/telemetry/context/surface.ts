// App surface resolver for telemetry context enrichment
import { AppSurface } from "./types";

export function resolveAppSurface(route: string): AppSurface {
  // Remove leading locale if present
  const path = route.replace(/^\/?[a-zA-Z-]{2,5}(\/|$)/, "/");
  if (/^\/?auth(\/|$)/.test(path)) return "auth";
  if (/^\/?creator-dashboard(\/|$)/.test(path)) return "creator_dashboard";
  if (/^\/?marketplace(\/|$)/.test(path)) return "marketplace";
  if (/^\/?profile(\/|$)/.test(path)) return "profile";
  if (/^\/?settings(\/|$)/.test(path)) return "settings";
  if (path === "/" || path === "") return "landing";
  return "unknown";
}
