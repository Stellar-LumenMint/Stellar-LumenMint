"use client";

import React from "react";
import { AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppApiError } from "@/utils/fetchUtils";

interface ApiErrorFallbackProps {
  error: AppApiError;
  onRetry?: () => Promise<void> | void;
  onClear?: () => void;
}

export function ApiErrorFallback({
  error,
  onRetry,
  onClear,
}: ApiErrorFallbackProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-md bg-destructive/10 p-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </div>

        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            System Connection Issue
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error.message ||
              "An unexpected network error occurred while updating the dashboard view."}
          </p>

          {((error as any).statusCode || (error as any).status) && (
            <div className="pt-1 text-xs font-mono text-muted-foreground/70">
              Error Code: HTTP{" "}
              {(error as any).statusCode || (error as any).status}{" "}
              {(error as any).code ? `(${(error as any).code})` : ""}
            </div>
          )}
        </div>

        {onClear && (
          <button
            onClick={onClear}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="Dismiss error"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>

      {onRetry && (
        <div className="mt-6 flex justify-end border-t border-destructive/10 pt-4">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            variant="outline"
            size="sm"
            className="gap-2 border-destructive/20 hover:bg-destructive/10 text-foreground"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
            />
            {isRetrying ? "Retrying connection..." : "Retry Request"}
          </Button>
        </div>
      )}
    </div>
  );
}
