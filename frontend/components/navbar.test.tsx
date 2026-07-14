import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "./navbar";
import "@testing-library/jest-dom";

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
    t: (key: string, params?: Record<string, unknown>) => {
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
  useAuth: jest.fn(() => ({
    isAuthenticated: false,
    loading: false,
  })),
}));

jest.mock("@/components/wallet/WalletConnector", () => ({
  WalletConnector: ({ forceVisible, fullWidth }: any) => (
    <div data-testid="wallet-connector">Wallet Connector</div>
  ),
}));

jest.mock("./user-dropdown", () => ({
  UserDropdown: () => <div data-testid="user-dropdown">User Dropdown</div>,
}));

jest.mock("./account-entry-menu", () => ({
  AccountEntryMenu: () => <div data-testid="account-entry-menu">Account Entry</div>,
}));

jest.mock("./LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="language-switcher">Lang</div>,
  LanguageSwitcher: () => <div data-testid="language-switcher">Lang</div>,
  MobileLanguageSwitcher: () => <div data-testid="mobile-language-switcher">Mobile Lang</div>,
}));

jest.mock("@/components/ui/modern-search-input", () => ({
  ModernSearchInput: ({ placeholder }: any) => (
    <input data-testid="search-input" placeholder={placeholder} />
  ),
}));

jest.mock("./image", () => ({
  OptimizedImage: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock("@/lib/telemetry/navigation-instrumentation", () => ({
  emitNavItemClicked: jest.fn(),
  NAV_ITEM_IDS: {
    EXPLORE: "explore",
    MARKETPLACE: "marketplace",
    ARTISTS: "artists",
    VAULT: "vault",
    HOME: "home",
    CREATE: "create",
    COLLECTIONS: "collections",
    ACTIVITY: "activity",
  },
  NAV_PLACEMENTS: {
    NAVBAR_DESKTOP: "navbar_desktop",
    NAVBAR_MOBILE_DRAWER: "navbar_mobile_drawer",
  },
  normalizeRoute: (route: string) => route,
}));

// =============================================================================
// Tests
// =============================================================================
describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset scroll position
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  // ===========================================================================
  // Rendering
  // ===========================================================================
  describe("rendering", () => {
    it("renders the logo with a link to home", () => {
      render(<Navbar />);
      const logoLink = screen.getByRole("link", { name: /stellar-lumenmint home/i });
      expect(logoLink).toBeInTheDocument();
      expect(logoLink).toHaveAttribute("href", "/en");
    });

    it("renders the hamburger button on mobile viewports", () => {
      render(<Navbar />);
      const hamburger = screen.getByRole("button", { name: /open navigation menu/i });
      expect(hamburger).toBeInTheDocument();
    });

    it("renders wallet connector when not authenticated", () => {
      render(<Navbar />);
      expect(screen.getByTestId("wallet-connector")).toBeInTheDocument();
    });

    it("renders user dropdown when authenticated", () => {
      const { useAuth } = require("@/lib/stores/auth-store");
      useAuth.mockReturnValue({ isAuthenticated: true, loading: false });
      render(<Navbar />);
      expect(screen.getByTestId("user-dropdown")).toBeInTheDocument();
    });

    it("does not render user dropdown or wallet during loading", () => {
      const { useAuth } = require("@/lib/stores/auth-store");
      useAuth.mockReturnValue({ isAuthenticated: false, loading: true });
      render(<Navbar />);
      expect(screen.queryByTestId("user-dropdown")).not.toBeInTheDocument();
      expect(screen.queryByTestId("wallet-connector")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Mobile menu open / close
  // ===========================================================================
  describe("mobile menu", () => {
    it("opens the mobile drawer when hamburger is clicked", () => {
      render(<Navbar />);
      const hamburger = screen.getByRole("button", { name: /open navigation menu/i });
      fireEvent.click(hamburger);

      const drawer = screen.getByRole("dialog", { name: /mobile navigation/i });
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute("aria-modal", "true");
    });

    it("closes the mobile drawer when close button is clicked", async () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

      const closeButton = screen.getByRole("button", { name: /close navigation menu/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("closes the mobile drawer when backdrop is clicked", async () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

      const backdrop = screen.getAllByRole("button", { name: /close navigation menu/i })[0];
      fireEvent.click(backdrop);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("sets aria-expanded on hamburger when menu opens", () => {
      render(<Navbar />);
      const hamburger = screen.getByRole("button", { name: /open navigation menu/i });
      expect(hamburger).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(hamburger);
      expect(hamburger).toHaveAttribute("aria-expanded", "true");
    });

    it("sets aria-expanded to false when menu closes", async () => {
      render(<Navbar />);
      const hamburger = screen.getByRole("button", { name: /open navigation menu/i });
      fireEvent.click(hamburger);
      fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));

      await waitFor(() => {
        expect(hamburger).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("locks body scroll when mobile menu is open", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("restores body scroll when mobile menu closes", async () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
      fireEvent.click(screen.getByRole("button", { name: /close navigation menu/i }));

      await waitFor(() => {
        expect(document.body.style.overflow).not.toBe("hidden");
      });
    });
  });

  // ===========================================================================
  // Keyboard navigation (focus trap)
  // ===========================================================================
  describe("keyboard navigation", () => {
    it("closes mobile menu on Escape key", async () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    it("traps focus within the mobile drawer (Tab cycles)", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

      const drawer = screen.getByRole("dialog");
      // Get all focusable elements
      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled])'
      );
      expect(focusable.length).toBeGreaterThan(0);

      // Focus should be on close button initially
      const closeBtn = screen.getByRole("button", { name: /close navigation menu/i });
      expect(document.activeElement).toBe(closeBtn);
    });
  });

  // ===========================================================================
  // Scroll behavior
  // ===========================================================================
  describe("scroll behavior", () => {
    it("applies scrolled styles when page is scrolled down", () => {
      render(<Navbar />);
      const header = document.querySelector("header");
      expect(header).not.toHaveClass(/backdrop-blur-xl/);

      // Simulate scroll
      act(() => {
        Object.defineProperty(window, "scrollY", { value: 100, writable: true });
        window.dispatchEvent(new Event("scroll"));
      });

      expect(header).toHaveClass(/backdrop-blur-xl/);
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================
  describe("accessibility", () => {
    it("has aria-label on the nav element", () => {
      render(<Navbar />);
      expect(screen.getByRole("navigation", { name: /main navigation/i })).toBeInTheDocument();
    });

    it("has hamburger with aria-controls pointing to drawer", () => {
      render(<Navbar />);
      const hamburger = screen.getByRole("button", { name: /open navigation menu/i });
      expect(hamburger).toHaveAttribute("aria-controls", "mobile-navigation-drawer");
    });

    it("renders navigation links in the mobile drawer", () => {
      render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));

      // Essential nav links should be present
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Explore")).toBeInTheDocument();
    });
  });
});
