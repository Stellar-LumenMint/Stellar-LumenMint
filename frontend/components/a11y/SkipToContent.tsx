"use client";

import React, { useCallback } from "react";

export interface SkipToContentProps {
  /** The id of the main content element to skip to */
  targetId?: string;
  /** Custom label for the skip link */
  label?: string;
}

/**
 * SkipToContent – A visually hidden link that becomes visible on focus,
 * allowing keyboard users to skip navigation and jump directly to main content.
 *
 * Inspired by WCAG 2.1 SC 2.4.1 (Bypass Blocks).
 */
export function SkipToContent({
  targetId = "main-content",
  label = "Skip to main content",
}: SkipToContentProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: false });
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        // Remove tabindex after blur so it's not in the normal tab order
        const handleBlur = () => {
          target.removeAttribute("tabindex");
          target.removeEventListener("blur", handleBlur);
        };
        target.addEventListener("blur", handleBlur);
      }
    },
    [targetId],
  );

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="
        sr-only focus:not-sr-only
        fixed top-3 left-3 z-[100]
        inline-flex items-center px-4 py-2.5
        rounded-lg
        bg-[#00D4FF] text-[#0D1117]
        text-sm font-semibold
        shadow-lg shadow-[#00D4FF]/30
        outline-none
        focus-visible:ring-2 focus-visible:ring-[#00D4FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1117]
        transition-all duration-200
        motion-safe:animate-lm-fade-in
      "
    >
      {label}
    </a>
  );
}
