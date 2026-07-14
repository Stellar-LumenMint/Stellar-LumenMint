import { useEffect, useRef, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";

export type AppStateCallback = (state: AppStateStatus) => void;

/**
 * Hook that fires callbacks when the app transitions between
 * foreground, background, and inactive states.
 *
 * Useful for:
 * - Pausing/resuming animations or video
 * - Flushing caches on background
 * - Re-authenticating on foreground
 * - Syncing data when the app becomes active
 */
export function useAppState(
  onForeground?: AppStateCallback,
  onBackground?: AppStateCallback,
): AppStateStatus {
  const currentStateRef = useRef<AppStateStatus>(AppState.currentState);

  const handleChange = useCallback(
    (nextState: AppStateStatus) => {
      const prevState = currentStateRef.current;

      if (prevState.match(/inactive|background/) && nextState === "active") {
        onForeground?.(nextState);
      } else if (nextState.match(/inactive|background/) && prevState === "active") {
        onBackground?.(nextState);
      }

      currentStateRef.current = nextState;
    },
    [onForeground, onBackground],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", handleChange);
    return () => subscription.remove();
  }, [handleChange]);

  return currentStateRef.current;
}
