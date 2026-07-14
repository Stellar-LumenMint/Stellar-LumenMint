import { useEffect, useState, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export type NetworkQuality = "unknown" | "poor" | "good" | "excellent";

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  quality: NetworkQuality;
  lastChecked: number | null;
}

/**
 * Hook that monitors network connectivity and quality.
 * Uses NetInfo under the hood with AppState-aware rechecking
 * when the app returns to the foreground.
 *
 * Falls back to a basic connectivity check when NetInfo is unavailable.
 */
export function useNetworkStatus(): NetworkStatus & {
  refresh: () => Promise<void>;
} {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    quality: "unknown",
    lastChecked: null,
  });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const checkConnectivity = useCallback(async () => {
    try {
      // Attempt to dynamically import @react-native-community/netinfo
      // Falls back to a simple fetch-based check if not available
      let NetInfo: any;
      try {
        NetInfo = require("@react-native-community/netinfo");
      } catch {
        // Fallback: basic fetch check
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch("https://clients3.google.com/generate_204", {
            method: "HEAD",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          setStatus({
            isConnected: res.ok,
            isInternetReachable: res.ok,
            quality: res.ok ? "good" : "poor",
            lastChecked: Date.now(),
          });
        } catch {
          setStatus({
            isConnected: false,
            isInternetReachable: false,
            quality: "poor",
            lastChecked: Date.now(),
          });
        }
        return;
      }

      const state = await NetInfo.fetch();
      setStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        quality: mapConnectionTypeToQuality(state.type),
        lastChecked: Date.now(),
      });
    } catch {
      // Silently fail — assume connected
      setStatus((prev) => ({
        ...prev,
        isConnected: true,
        isInternetReachable: true,
      }));
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Re-check when app comes to foreground
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === "active"
      ) {
        checkConnectivity();
      }
      appStateRef.current = nextState;
    });

    // Attempt NetInfo subscription if available
    let netInfoUnsubscribe: (() => void) | undefined;
    try {
      const NetInfo = require("@react-native-community/netinfo");
      netInfoUnsubscribe = NetInfo.addEventListener((state: any) => {
        setStatus({
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable,
          quality: mapConnectionTypeToQuality(state.type),
          lastChecked: Date.now(),
        });
      });
    } catch {
      // NetInfo not installed; periodic re-check every 30s
      const interval = setInterval(checkConnectivity, 30_000);
      netInfoUnsubscribe = () => clearInterval(interval);
    }

    return () => {
      subscription.remove();
      netInfoUnsubscribe?.();
    };
  }, [checkConnectivity]);

  return { ...status, refresh: checkConnectivity };
}

function mapConnectionTypeToQuality(
  type: string | undefined | null,
): NetworkQuality {
  switch (type) {
    case "wifi":
    case "ethernet":
      return "excellent";
    case "cellular":
    case "4g":
    case "5g":
      return "good";
    case "3g":
    case "2g":
      return "poor";
    case "none":
    case "unknown":
    default:
      return "unknown";
  }
}
