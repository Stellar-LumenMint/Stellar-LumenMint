"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  /** Label text for the field */
  label: string;
  /** The input/textarea/select element */
  children: React.ReactNode;
  /** Error message to display below the field */
  error?: string;
  /** Hint text shown below the label */
  hint?: string;
  /** Marks the field as required (visual indicator + aria) */
  required?: boolean;
  /** Hide the label visually but keep it accessible */
  hideLabel?: boolean;
  /** Additional class for the wrapper */
  className?: string;
  /** Optional ID for the field; auto-generated if not provided */
  id?: string;
}

/**
 * FormField – An accessible form field wrapper that ensures proper
 * label-input association, error messaging, and hint text.
 *
 * Uses `useId()` for stable auto-generated IDs.
 */
export function FormField({
  label,
  children,
  error,
  hint,
  required = false,
  hideLabel = false,
  className,
  id: providedId,
}: FormFieldProps) {
  const autoId = useId();
  const fieldId = providedId ?? `field-${autoId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  // Clone the child to inject id, aria-describedby, and aria-invalid
  const describedBy = [
    error ? errorId : null,
    hint ? hintId : null,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const child = React.Children.only(children) as React.ReactElement;
  const enhancedChild = React.cloneElement(child as React.ReactElement<any>, {
    id: fieldId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
    required,
  });

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          "block text-sm font-medium text-card-foreground",
          hideLabel && "sr-only",
          error && "text-destructive",
        )}
      >
        {label}
        {required && (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only">(required)</span>}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}

      {enhancedChild}

      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
