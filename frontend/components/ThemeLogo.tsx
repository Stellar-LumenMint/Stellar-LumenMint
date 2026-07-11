"use client";

import React from "react";
import { useTheme } from "@/lib/stores/preferences-store";

interface ThemeLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Stellar-LumenMint wordmark logo.
 * Uses the brand's signature teal (#00D4FF) on dark surfaces and a
 * deep navy variant on light surfaces for strong contrast.
 */
export const ThemeLogo: React.FC<ThemeLogoProps> = ({
  width = 180,
  height = 36,
  className = "",
}) => {
  const { theme } = useTheme();
  const isDark = theme.mode !== "light";

  const wordmarkLight = isDark ? "#FFFFFF" : "#0D1117";
  const accentColor   = "#00D4FF";
  const ringOpacity   = isDark ? "0.35" : "0.5";

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 180 36"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-colors duration-300"
        role="img"
        aria-label="Stellar-LumenMint logo"
        fill="none"
      >
        {/* ── Mark: orbital ring + 6-point hex star ── */}
        <circle cx="18" cy="18" r="16" stroke={accentColor} strokeWidth="1.1" opacity={ringOpacity}/>
        <circle cx="18" cy="18" r="10" fill={isDark ? "#0D1117" : "#F4F7FC"}/>
        <circle cx="18" cy="18" r="10" stroke={accentColor} strokeWidth="1.4" opacity="0.6"/>
        <polygon
          points="18,8 20.5,14 27,14 22,18.5 24,25 18,21.5 12,25 14,18.5 9,14 15.5,14"
          fill={accentColor}
          opacity="0.95"
        />

        {/* ── Wordmark ── */}
        <text
          x="42"
          y="23"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight="700"
          fontSize="18"
          letterSpacing="-0.3"
          fill={wordmarkLight}
        >
          Stellar-
        </text>
        <text
          x="106"
          y="23"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight="300"
          fontSize="18"
          letterSpacing="0.5"
          fill={accentColor}
        >
          LumenMint
        </text>
      </svg>
    </div>
  );
};
