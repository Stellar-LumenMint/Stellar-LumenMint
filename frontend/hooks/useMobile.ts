import { useMediaQuery } from './useMediaQuery';
import { BREAKPOINTS, type BreakpointKey } from '@/utils/breakpoints';

const DEFAULT_MOBILE_BREAKPOINT: BreakpointKey = 'sm';

/**
 * Returns whether the viewport is below the given breakpoint
 * (i.e. "mobile-sized").
 *
 * Delegates to the SSR-safe `useMediaQuery`, so the server and client
 * render the same value and hydration cannot mismatch. Accepts either a
 * named Tailwind breakpoint or an explicit pixel width.
 *
 * @example
 * const isMobile = useMobile();          // true when width < 576px
 * const isCompact = useMobile("md");     // true when width < 768px
 * const isNarrow = useMobile(480);       // true when width < 480px
 */
export function useMobile(breakpoint: BreakpointKey | number = DEFAULT_MOBILE_BREAKPOINT): boolean {
  const width = typeof breakpoint === 'number' ? breakpoint : BREAKPOINTS[breakpoint];
  return useMediaQuery(`(max-width: ${width - 1}px)`);
}
