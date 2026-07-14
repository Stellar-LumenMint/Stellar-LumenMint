import { act } from "@testing-library/react";
import { usePreferencesStore } from "./preferences-store";

describe("Preferences Store", () => {
  beforeEach(() => {
    // Reset the store state before each test
    act(() => {
      usePreferencesStore.setState({
        theme: { mode: "dark", primaryColor: "#8B5CF6", fontFamily: "Inter" },
        notifications: {
          email: true, push: true, newListings: true,
          priceUpdates: true, bidActivity: true, auctions: true,
        },
        display: {
          gridView: "grid", itemsPerPage: 12,
          showPrice: true, showCreator: true, showLikes: true, currency: "STRK",
        },
        language: "en",
        timezone: "UTC",
        recentSearches: [],
        favoriteCollections: [],
        watchlist: [],
        isHydrated: true,
      });
    });
  });

  // ===========================================================================
  // Theme
  // ===========================================================================
  describe("theme", () => {
    it("has dark mode as default", () => {
      const { theme } = usePreferencesStore.getState();
      expect(theme.mode).toBe("dark");
    });

    it("updates theme mode", () => {
      act(() => {
        usePreferencesStore.getState().setTheme({ mode: "light" as const });
      });
      expect(usePreferencesStore.getState().theme.mode).toBe("light");
    });

    it("preserves other theme properties on partial updates", () => {
      act(() => {
        usePreferencesStore.getState().setTheme({ primaryColor: "#FF0000" });
      });
      const { theme } = usePreferencesStore.getState();
      expect(theme.primaryColor).toBe("#FF0000");
      expect(theme.mode).toBe("dark"); // unchanged
    });
  });

  // ===========================================================================
  // Notifications
  // ===========================================================================
  describe("notifications", () => {
    it("enables email notifications by default", () => {
      expect(usePreferencesStore.getState().notifications.email).toBe(true);
    });

    it("updates notification preferences", () => {
      act(() => {
        usePreferencesStore.getState().setNotifications({ email: false });
      });
      const { notifications } = usePreferencesStore.getState();
      expect(notifications.email).toBe(false);
      expect(notifications.push).toBe(true); // unchanged
    });
  });

  // ===========================================================================
  // Display
  // ===========================================================================
  describe("display", () => {
    it("defaults to grid view with 12 items", () => {
      const { display } = usePreferencesStore.getState();
      expect(display.gridView).toBe("grid");
      expect(display.itemsPerPage).toBe(12);
    });

    it("updates display settings", () => {
      act(() => {
        usePreferencesStore.getState().setDisplay({ itemsPerPage: 24, showPrice: false });
      });
      const { display } = usePreferencesStore.getState();
      expect(display.itemsPerPage).toBe(24);
      expect(display.showPrice).toBe(false);
    });
  });

  // ===========================================================================
  // Language
  // ===========================================================================
  describe("language", () => {
    it("defaults to English", () => {
      expect(usePreferencesStore.getState().language).toBe("en");
    });

    it("updates language", () => {
      act(() => {
        usePreferencesStore.getState().setLanguage("fr");
      });
      expect(usePreferencesStore.getState().language).toBe("fr");
    });
  });

  // ===========================================================================
  // Recent searches
  // ===========================================================================
  describe("recent searches", () => {
    it("adds a search term", () => {
      act(() => {
        usePreferencesStore.getState().addRecentSearch("dragons");
      });
      expect(usePreferencesStore.getState().recentSearches).toEqual(["dragons"]);
    });

    it("deduplicates repeated searches and pushes to front", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.addRecentSearch("dragons");
        store.addRecentSearch("wizards");
        store.addRecentSearch("dragons");
      });
      expect(usePreferencesStore.getState().recentSearches).toEqual(["dragons", "wizards"]);
    });

    it("caps searches at 10", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        for (let i = 0; i < 15; i++) {
          store.addRecentSearch(`search-${i}`);
        }
      });
      expect(usePreferencesStore.getState().recentSearches).toHaveLength(10);
      expect(usePreferencesStore.getState().recentSearches[0]).toBe("search-14");
    });

    it("clears all recent searches", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.addRecentSearch("dragons");
        store.addRecentSearch("wizards");
        store.clearRecentSearches();
      });
      expect(usePreferencesStore.getState().recentSearches).toEqual([]);
    });
  });

  // ===========================================================================
  // Favorites
  // ===========================================================================
  describe("favorites", () => {
    it("adds a collection to favorites", () => {
      act(() => {
        usePreferencesStore.getState().addToFavorites("col-1");
      });
      expect(usePreferencesStore.getState().favoriteCollections).toContain("col-1");
    });

    it("does not duplicate favorites", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.addToFavorites("col-1");
        store.addToFavorites("col-1");
      });
      expect(usePreferencesStore.getState().favoriteCollections).toEqual(["col-1"]);
    });

    it("removes a collection from favorites", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.addToFavorites("col-1");
        store.addToFavorites("col-2");
        store.removeFromFavorites("col-1");
      });
      expect(usePreferencesStore.getState().favoriteCollections).toEqual(["col-2"]);
    });
  });

  // ===========================================================================
  // Watchlist
  // ===========================================================================
  describe("watchlist", () => {
    it("adds an NFT to watchlist", () => {
      act(() => {
        usePreferencesStore.getState().addToWatchlist("nft-1");
      });
      expect(usePreferencesStore.getState().watchlist).toContain("nft-1");
    });

    it("removes an NFT from watchlist", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.addToWatchlist("nft-1");
        store.removeFromWatchlist("nft-1");
      });
      expect(usePreferencesStore.getState().watchlist).toEqual([]);
    });

    it("does not duplicate watchlist entries", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.addToWatchlist("nft-1");
        store.addToWatchlist("nft-1");
      });
      expect(usePreferencesStore.getState().watchlist).toEqual(["nft-1"]);
    });
  });

  // ===========================================================================
  // Reset
  // ===========================================================================
  describe("reset", () => {
    it("resets all preferences to defaults", () => {
      act(() => {
        const store = usePreferencesStore.getState();
        store.setLanguage("fr");
        store.addToFavorites("col-1");
        store.addRecentSearch("dragons");
        store.resetPreferences();
      });
      const state = usePreferencesStore.getState();
      expect(state.language).toBe("en");
      expect(state.favoriteCollections).toEqual([]);
      expect(state.recentSearches).toEqual([]);
      expect(state.isHydrated).toBe(true); // preserved
    });
  });
});
