import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { Navbar } from "./navbar";
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "navigation.explore": "Explore",
        "navigation.marketplace": "Marketplace",
        "navigation.artists": "Artists",
        "navigation.vault": "Vault",
        "navigation.dashboard": "Dashboard",
        "navigation.search": "Search NFTs...",
      };
      return map[key] || key;
    },
    locale: "en",
  }),
}));

jest.mock("@/lib/stores/auth-store", () => ({
  useAuth: jest.fn(() => ({ isAuthenticated: false, loading: false })),
}));

jest.mock("@/components/wallet/WalletConnector", () => ({
  WalletConnector: () => <div>Wallet Connector</div>,
}));

jest.mock("./user-dropdown", () => ({
  UserDropdown: () => <div>User Dropdown</div>,
}));

jest.mock("./account-entry-menu", () => ({
  AccountEntryMenu: () => <div>Account Entry</div>,
}));

jest.mock("./LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <div>Lang</div>,
  LanguageSwitcher: () => <div>Lang</div>,
  MobileLanguageSwitcher: () => <div>Mobile Lang</div>,
}));

jest.mock("@/components/ui/modern-search-input", () => ({
  ModernSearchInput: () => <input placeholder="Search" aria-label="Search" />,
}));

jest.mock("./image", () => ({
  OptimizedImage: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock("@/lib/telemetry/navigation-instrumentation", () => ({
  emitNavItemClicked: jest.fn(),
  NAV_ITEM_IDS: {},
  NAV_PLACEMENTS: {},
  normalizeRoute: (r: string) => r,
}));

// =============================================================================
describe("Navbar accessibility (axe-core)", () => {
  it("has no accessibility violations in default state", async () => {
    const { container } = render(<Navbar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations with mobile menu open", async () => {
    const { container } = render(<Navbar />);
    fireEvent.click(
      container.querySelector('[aria-label="Open navigation menu"]')!
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no accessibility violations when authenticated", async () => {
    const { useAuth } = require("@/lib/stores/auth-store");
    useAuth.mockReturnValue({ isAuthenticated: true, loading: false });
    const { container } = render(<Navbar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
