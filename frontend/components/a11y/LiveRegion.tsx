"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export type LiveRegionPoliteness = "polite" | "assertive";

export interface LiveRegionProps {
  /** ARIA politeness setting */
  politeness?: LiveRegionPoliteness;
  /** Text content to announce */
  message?: string;
  /** Clear the region after announcing (default: true after 1s) */
  clearAfter?: number | false;
  /** CSS class for the visually hidden region */
  className?: string;
}

/**
 * LiveRegion – An ARIA live region for announcing dynamic content changes
 * to screen readers without moving focus.
 *
 * Usage:
 * ```tsx
 * <LiveRegion message="Item added to cart" />
 * ```
 */
export function LiveRegion({
  politeness = "polite",
  message,
  clearAfter = 1000,
  className,
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = useState(message ?? "");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    setAnnouncement(message);

    if (clearAfter !== false) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        // Set a non-breaking space to "clear" without causing re-announcement issues.
        // Setting to empty string can cause the region to be skipped.
        setAnnouncement("\u00A0");
      }, clearAfter);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={`sr-only ${className ?? ""}`}
    >
      {announcement}
    </div>
  );
}

/**
 * Hook to imperatively announce messages via a LiveRegion.
 * Returns an announce function that can be called anywhere.
 *
 * @example
 * const { announce, LiveRegionElement } = useAnnounce();
 * return (
 *   <>
 *     <LiveRegionElement />
 *     <button onClick={() => announce("Saved!")}>Save</button>
 *   </>
 * );
 */
export function useAnnounce(politeness: LiveRegionPoliteness = "polite") {
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [announceKey, setAnnounceKey] = useState(0);

  const announce = useCallback(
    (msg: string) => {
      setMessage(msg);
      setAnnounceKey((k) => k + 1);
    },
    [],
  );

  const LiveRegionElement = useCallback(
    () => (
      <LiveRegion
        key={announceKey}
        politeness={politeness}
        message={message}
      />
    ),
    [politeness, announceKey, message],
  );

  return { announce, LiveRegionElement };
}
