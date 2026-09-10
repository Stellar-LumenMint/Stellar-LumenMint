import { useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string, callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }
  return window.matchMedia(query).matches;
}

/**
 * Returns whether the given media query currently matches.
 *
 * Uses `useSyncExternalStore`, so the server snapshot is stable and the
 * client hydration pass cannot mismatch it — no layout shift from
 * `false -> true` flips after mount (the pattern used by `useBreakpoint`).
 *
 * @example
 * const isCompact = useMediaQuery("(max-width: 640px)");
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribeToMediaQuery(query, callback),
    () => getSnapshot(query),
    () => getSnapshot(query),
  );
}