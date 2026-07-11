// Device type resolver for telemetry context enrichment
import { DeviceType } from "./types";

let cachedDeviceType: DeviceType | null = null;

function getDeviceTypeFromUA(): DeviceType {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;
  const width = window.innerWidth;
  if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (width >= 600 && width <= 1024)) return "tablet";
  if (width > 1024) return "desktop";
  return "unknown";
}

export function resolveDeviceType(isSSR?: boolean): DeviceType {
  if (isSSR || typeof window === "undefined") return "unknown";
  if (cachedDeviceType) return cachedDeviceType;
  cachedDeviceType = getDeviceTypeFromUA();
  return cachedDeviceType;
}
