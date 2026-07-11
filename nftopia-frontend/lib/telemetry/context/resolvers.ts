// Context resolvers for route and locale
import { AppSurface } from "./types";

// Route resolver: strips query/hash, normalizes trailing slash, SSR safe
export function resolveRoute(pathname?: string, isSSR?: boolean): string {
  // Allow explicit SSR override for test reliability
  const ssr = isSSR || (typeof window === "undefined") || (typeof window !== "undefined" && typeof window.location === "undefined") || (typeof global !== "undefined" && typeof global.window === "undefined");
  if (ssr) {
    if (!pathname || pathname === "/") return "unknown";
    let path = pathname.split("?")[0].split("#")[0];
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    if (!path || path === "/") return "unknown";
    return path;
  }
  // Client: use provided pathname or window.location.pathname
  let path = pathname || window.location.pathname;
  if (!path) return "/";
  path = path.split("?")[0].split("#")[0];
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

// Locale resolver: extracts from route or falls back to default
export function resolveLocale(route?: string, defaultLocale = "en"): string {
  let locale = defaultLocale;
  const knownLocales = ["en", "fr"];
  const path = route || (typeof window !== "undefined" ? window.location.pathname : "");
  // Match /en/ or /fr/ at start, but only if segment is a known locale
  const match = path.match(/^\/?([a-z]{2,3})(\/|$)/i);
  if (match) {
    const candidate = match[1].toLowerCase();
    if (knownLocales.includes(candidate)) {
      locale = candidate;
    }
  }
  return locale;
}
