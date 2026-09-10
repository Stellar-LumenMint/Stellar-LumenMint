import React from "react";
import { render, screen } from "@testing-library/react";
import { WalletNetworkStatus } from "@/components/wallet/WalletNetworkStatus";

describe("WalletNetworkStatus", () => {
  it("shows Testnet when connected to testnet", () => {
    render(<WalletNetworkStatus network="testnet" />);
    expect(screen.getByRole("status")).toHaveTextContent("Testnet");
  });

  it("shows Mainnet when connected to mainnet", () => {
    render(<WalletNetworkStatus network="mainnet" />);
    expect(screen.getByRole("status")).toHaveTextContent("Mainnet");
  });

  it("warns when the wallet network differs from the app's expected network", () => {
    render(
      <WalletNetworkStatus network="mainnet" expectedNetwork="testnet" />
    );
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("wrong network");
    expect(badge).toHaveAccessibleName(
      "Wallet connected to mainnet, app expects testnet"
    );
  });

  it("does not warn when the networks match", () => {
    render(
      <WalletNetworkStatus network="testnet" expectedNetwork="testnet" />
    );
    const badge = screen.getByRole("status");
    expect(badge).not.toHaveTextContent("wrong network");
    expect(badge).toHaveAccessibleName("Connected to testnet");
  });
});