"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BREAKPOINTS, type BreakpointKey } from "@/utils/breakpoints";

// Ordered list of breakpoint keys from smallest to largest
const BREAKPOINT_ORDER: BreakpointKey[] = ["xs", "sm", "md", "lg", "xl", "2xl"];

/**
 * Returns the current active named breakpoint (e.g. "md", "lg").
 * Uses useSyncExternalStore for SSR-safe, tear-free reads.
 */
function subscribeToResize(callback: () => void): () => void {
  let timeout: NodeJS.Timeout | null = null;
  const debouncedCallback = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(callback, 100);
  };
  window.addEventListener("resize", debouncedCallback, { passive: true });
  return () => {
    window.removeEventListener("resize", debouncedCallback);
    if (timeout) clearTimeout(timeout);
  };
}

function getSnapshot(): BreakpointKey {
  if (typeof window === "undefined") return "lg"; // SSR default
  const width = window.innerWidth;
  let active: BreakpointKey = "xs";
  for (const key of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[key]) {
      active = key;
    }
  }
  return active;
}

function getServerSnapshot(): BreakpointKey {
  return "lg";
}

/**
 * Hook that returns the current active Tailwind breakpoint name.
 * Uses `useSyncExternalStore` for SSR-safe hydration without mismatches.
 *
 * @example
 * const breakpoint = useBreakpoint();
 * if (breakpoint === "lg") { ... } // renders only on lg+
 */
export function useBreakpoint(): BreakpointKey {
  return useSyncExternalStore(subscribeToResize, getSnapshot, getServerSnapshot);
}

/**
 * Returns `true` when the viewport is at or above the given breakpoint.
 *
 * @example
 * const isDesktop = useBreakpointUp("lg"); // true when width >= 992px
 */
export function useBreakpointUp(breakpoint: BreakpointKey): boolean {
  const active = useBreakpoint();
  const targetIndex = BREAKPOINT_ORDER.indexOf(breakpoint);
  const activeIndex = BREAKPOINT_ORDER.indexOf(active);
  return activeIndex >= targetIndex;
}

/**
 * Returns `true` when the viewport is below the given breakpoint.
 *
 * @example
 * const isMobile = useBreakpointDown("md"); // true when width < 768px
 */
export function useBreakpointDown(breakpoint: BreakpointKey): boolean {
  const active = useBreakpoint();
  const targetIndex = BREAKPOINT_ORDER.indexOf(breakpoint);
  const activeIndex = BREAKPOINT_ORDER.indexOf(active);
  return activeIndex < targetIndex;
}

/**
 * Returns `true` when the viewport is exactly within the given range [lower, upper).
 *
 * @example
 * const isTablet = useBreakpointBetween("md", "lg"); // 768 <= width < 992
 */
export function useBreakpointBetween(
  lower: BreakpointKey,
  upper: BreakpointKey,
): boolean {
  return useBreakpointUp(lower) && useBreakpointDown(upper);
}
