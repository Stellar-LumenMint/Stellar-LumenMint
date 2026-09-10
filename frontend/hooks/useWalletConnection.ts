"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { isFreighterConnected, getFreighterAddress } from "@/lib/stellar/wallet/freighter";


export function useWalletConnection() {
  const { address, provider, connected, setConnected, setDisconnected } = useWalletStore();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Restore + validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      if (!connected || !address) return;

      if (provider === "freighter") {
        try {
          const stillConnected = await isFreighterConnected();
          if (!stillConnected) {
            setDisconnected();
            return;
          }
          const currentAddress = await getFreighterAddress();
          if (currentAddress !== address) {
            // User switched accounts in the extension
            setConnected(currentAddress, "freighter", useWalletStore.getState().network);
          }
        } catch {
          setDisconnected();
        }
      }
      
    };

    validateSession();
  }, []); 

  // Poll Freighter connection status
  useEffect(() => {
    if (!connected || provider !== "freighter") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const poll = async () => {
      // Skip polling while the tab is hidden; the status will be refreshed
      // when it becomes visible again.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      try {
        const stillConnected = await isFreighterConnected();
        if (!stillConnected) {
          setDisconnected();
        }
      } catch (error) {
        // Transient extension/network errors should not log the user out;
        // surface for debugging without disconnecting.
        console.debug("[wallet-connection] poll failed", error);
      }
    };

    pollingRef.current = setInterval(poll, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [connected, provider, setDisconnected]);

  return {
    address,
    provider,
    connected,
    network: useWalletStore.getState().network,
  };
}