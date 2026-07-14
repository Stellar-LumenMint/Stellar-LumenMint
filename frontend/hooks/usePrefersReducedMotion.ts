"use client";

import { useEffect, useState } from "react";

/**
 * Detects if the user has requested reduced motion via their OS/browser setting.
 * Falls back gracefully during SSR (returns false).
 *
 * Use this to disable or simplify animations for users with vestibular motion disorders.
 * WCAG 2.1 SC 2.3.3 (Animation from Interactions).
 *
 * @example
 * const prefersReducedMotion = usePrefersReducedMotion();
 * return (
 *   <div className={prefersReducedMotion ? "" : "animate-lm-fade-up"}>
 *     Content
 *   </div>
 * );
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mql.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
