"use client";

import { useEffect } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { isFreighterConnected, getFreighterAddress, getFreighterNetwork } from "@/lib/stellar/wallet/freighter";
import { telemetry } from "@/lib/telemetry";
import { EVENT_NAMES } from "@/lib/telemetry/events";


export function StellarWalletProvider({ children }: { children: React.ReactNode }) {
  const { connected, provider, address, setConnected, setDisconnected } = useWalletStore();

  // Rehydrate persisted Freighter session on mount 
  useEffect(() => {
    if (!connected || provider !== "freighter") return;

    const rehydrate = async () => {
      telemetry.track(EVENT_NAMES.walletSessionRehydrateStarted, {
        provider: provider || "unknown",
      });
      const start = Date.now();
      try {
        const still = await isFreighterConnected();
        if (!still) {
          telemetry.track(EVENT_NAMES.walletSessionRehydrateFailed, {
            provider: provider || "unknown",
            error_code: "not_connected",
            forced_disconnect: true,
          });
          setDisconnected();
          return;
        }

        const currentAddress = await getFreighterAddress();
        const currentNetwork = await getFreighterNetwork();

        if (currentAddress !== address) {
          setConnected(currentAddress, "freighter", currentNetwork);
        }
        telemetry.track(EVENT_NAMES.walletSessionRehydrateSucceeded, {
          provider: provider || "unknown",
          latency_ms: Date.now() - start,
        });
      } catch (err) {
        telemetry.track(EVENT_NAMES.walletSessionRehydrateFailed, {
          provider: provider || "unknown",
          error_code: err instanceof Error ? err.message : "unknown_error",
          forced_disconnect: true,
        });
        setDisconnected();
      }
    };

    rehydrate();
  }, []);

  // Listen for Freighter account / network changes 
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onAccountChange = async () => {
      if (provider !== "freighter") return;
      try {
        const newAddress = await getFreighterAddress();
        const newNetwork = await getFreighterNetwork();
        if (newAddress) {
          setConnected(newAddress, "freighter", newNetwork);
          telemetry.track(EVENT_NAMES.walletProviderStateChanged, {
            provider: provider || "unknown",
            change_type: "account_changed",
            outcome: "updated",
          });
        } else {
          setDisconnected();
          telemetry.track(EVENT_NAMES.walletProviderStateChanged, {
            provider: provider || "unknown",
            change_type: "account_changed",
            outcome: "disconnected",
          });
        }
      } catch {
        setDisconnected();
        telemetry.track(EVENT_NAMES.walletProviderStateChanged, {
          provider: provider || "unknown",
          change_type: "account_changed",
          outcome: "disconnected",
        });
      }
    };

    const onNetworkChange = async () => {
      if (provider !== "freighter" || !address) return;
      try {
        const newNetwork = await getFreighterNetwork();
        setConnected(address, "freighter", newNetwork);
        telemetry.track(EVENT_NAMES.walletProviderStateChanged, {
          provider: provider || "unknown",
          change_type: "network_changed",
          outcome: "updated",
        });
      } catch {
        setDisconnected();
        telemetry.track(EVENT_NAMES.walletProviderStateChanged, {
          provider: provider || "unknown",
          change_type: "network_changed",
          outcome: "disconnected",
        });
      }
    };

    // Freighter dispatches these custom window events
    window.addEventListener("freighterAccountChanged", onAccountChange);
    window.addEventListener("freighterNetworkChanged", onNetworkChange);

    return () => {
      window.removeEventListener("freighterAccountChanged", onAccountChange);
      window.removeEventListener("freighterNetworkChanged", onNetworkChange);
    };
  }, [provider, address, setConnected, setDisconnected]);

  return <>{children}</>;
}