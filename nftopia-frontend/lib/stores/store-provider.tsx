"use client";

import { useEffect, useState } from "react";
import { initializeStores } from "./index";
import { usePreferencesStore } from "./preferences-store";

interface StoreProviderProps {
  children: React.ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const isHydrated = usePreferencesStore((state) => state.isHydrated);

  useEffect(() => {
    const init = async () => {
      try {
        await initializeStores();
        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize stores:", error);
        setIsInitialized(true); // Still render the app
      }
    };

    // Only initialize after preferences are hydrated
    if (isHydrated) {
      init();
    }
  }, [isHydrated]);

  // Show loading state while stores are initializing
  if (!isInitialized || !isHydrated) {
    return (
      <div className="min-h-[100svh] bg-[#0D1117] flex items-center justify-center">
        <div className="text-center">
          {/* Stellar-LumenMint animated mark */}
          <div className="relative mx-auto mb-6 w-14 h-14 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-[#00D4FF] opacity-30 animate-lm-pulse-ring" />
            <div className="absolute inset-2 rounded-full border border-[#00D4FF] opacity-55 animate-lm-pulse-ring [animation-delay:0.4s]" />
            <div className="w-5 h-5 rounded-full bg-[#00D4FF] opacity-90" />
          </div>
          <p className="text-[#EEF2F7] text-base font-medium tracking-wide">
            Stellar<span className="text-[#00D4FF] font-light">-LumenMint</span>
          </p>
          <p className="text-[#8A9BB0] text-xs mt-1">Loading…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Optional: Hook to check if stores are ready
export const useStoresReady = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const isHydrated = usePreferencesStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated) {
      setIsInitialized(true);
    }
  }, [isHydrated]);

  return isInitialized && isHydrated;
};
