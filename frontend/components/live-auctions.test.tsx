import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import LiveAuctions from "./live-auctions";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const map: Record<string, string> = {
        "liveAuctions.title": "Live Auctions",
        "liveAuctions.exploreMore": "Explore More",
        "liveAuctions.currentBid": "Current bid",
        "liveAuctions.bid": "Bid Now",
        "liveAuctions.previousPage": "Previous page",
        "liveAuctions.nextPage": "Next page",
        "liveAuctions.goToPage": `Go to page ${params?.page ?? ""}`,
      };
      return map[key] || key;
    },
    locale: "en",
  }),
}));

jest.mock("./image", () => ({
  OptimizedImage: (props: any) => <img {...props} alt={props.alt} />,
}));

// =============================================================================
describe("LiveAuctions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the section heading", () => {
    render(<LiveAuctions />);
    expect(screen.getByRole("heading", { name: /live auctions/i })).toBeInTheDocument();
  });

  it("renders the 'Live' badge", () => {
    render(<LiveAuctions />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("renders auction cards with current page items", () => {
    render(<LiveAuctions />);
    // Page 0 should show first 4 items
    expect(screen.getByText("Yonder Contemplation")).toBeInTheDocument();
    expect(screen.getByText("Tranquillizer Awakening")).toBeInTheDocument();
    expect(screen.getByText("Loving Vessel")).toBeInTheDocument();
    expect(screen.getByText("Tame Beast")).toBeInTheDocument();
  });

  it("renders 'Bid Now' buttons for each card", () => {
    render(<LiveAuctions />);
    const bidButtons = screen.getAllByRole("button", { name: /bid now/i });
    expect(bidButtons).toHaveLength(4);
  });

  it("shows page dots for pagination", () => {
    render(<LiveAuctions />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2); // 8 items, 4 per page = 2 pages
  });

  it("navigates to next page when right arrow is clicked", () => {
    render(<LiveAuctions />);
    const nextBtn = screen.getByRole("button", { name: /next page/i });
    fireEvent.click(nextBtn);

    // Page 1 should show items 5-8
    expect(screen.getByText("Cosmic Dreamer")).toBeInTheDocument();
  });

  it("navigates to previous page when left arrow is clicked", () => {
    render(<LiveAuctions />);
    const nextBtn = screen.getByRole("button", { name: /next page/i });
    fireEvent.click(nextBtn); // Page 1
    const prevBtn = screen.getByRole("button", { name: /previous page/i });
    fireEvent.click(prevBtn); // Back to Page 0

    expect(screen.getByText("Yonder Contemplation")).toBeInTheDocument();
  });

  it("sets aria-selected on the active page dot", () => {
    render(<LiveAuctions />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
  });

  it("updates aria-selected when page changes", () => {
    render(<LiveAuctions />);
    const tabs = screen.getAllByRole("tab");
    fireEvent.click(tabs[1]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
  });

  it("auto-advances pages on interval", () => {
    render(<LiveAuctions />);
    expect(screen.getByText("Yonder Contemplation")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // After one interval, should be on page 1
    expect(screen.getByText("Cosmic Dreamer")).toBeInTheDocument();
  });

  it("has an Explore More link", () => {
    render(<LiveAuctions />);
    const exploreLink = screen.getByRole("link", { name: /explore more/i });
    expect(exploreLink).toHaveAttribute("href", "/marketplace/auctions");
  });
});
