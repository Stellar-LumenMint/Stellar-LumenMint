"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  /** Override the default max width */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  /** Remove horizontal padding */
  noPadding?: boolean;
  /** Additional classes */
  className?: string;
  /** HTML element to render */
  as?: "div" | "section" | "main" | "article" | "header" | "footer";
}

const maxWidthClasses: Record<NonNullable<ResponsiveContainerProps["maxWidth"]>, string> = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
};

/**
 * ResponsiveContainer – A layout utility that provides consistent
 * responsive padding and max-width constraints across the application.
 *
 * Uses Tailwind's responsive padding: tighter on mobile, wider on desktop.
 */
export function ResponsiveContainer({
  children,
  maxWidth = "xl",
  noPadding = false,
  className,
  as: Component = "div",
}: ResponsiveContainerProps) {
  return (
    <Component
      className={cn(
        "mx-auto w-full",
        maxWidthClasses[maxWidth],
        !noPadding && "px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </Component>
  );
}
