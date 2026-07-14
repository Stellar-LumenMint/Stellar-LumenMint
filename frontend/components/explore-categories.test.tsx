import React from "react";
import { render, screen } from "@testing-library/react";
import ExploreCategories from "./explore-categories";
import "@testing-library/jest-dom";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "exploreCategories.title": "Explore Categories",
        "exploreCategories.categories.abstract": "Abstract",
        "exploreCategories.categories.3d": "3D Art",
        "exploreCategories.categories.modern": "Modern",
        "exploreCategories.categories.game": "Game Art",
        "exploreCategories.categories.graffiti": "Graffiti",
        "exploreCategories.categories.watercolor": "Watercolor",
      };
      return map[key] || key;
    },
    locale: "en",
  }),
}));

jest.mock("./image", () => ({
  OptimizedImage: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock("@/lib/telemetry/navigation-instrumentation", () => ({
  emitCtaClicked: jest.fn(),
  CTA_IDS: { CATEGORY_CARD_CLICK: "category_card_click" },
  CTA_PLACEMENTS: { LANDING_EXPLORE_CATEGORIES_CARD: "landing_explore_categories_card" },
  normalizeRoute: (route: string) => route,
}));

// =============================================================================
describe("ExploreCategories", () => {
  it("renders the section heading", () => {
    render(<ExploreCategories />);
    expect(screen.getByRole("heading", { name: /explore categories/i })).toBeInTheDocument();
  });

  it("renders all 6 category cards", () => {
    render(<ExploreCategories />);
    expect(screen.getByText("Abstract")).toBeInTheDocument();
    expect(screen.getByText("3D Art")).toBeInTheDocument();
    expect(screen.getByText("Modern")).toBeInTheDocument();
    expect(screen.getByText("Game Art")).toBeInTheDocument();
    expect(screen.getByText("Graffiti")).toBeInTheDocument();
    expect(screen.getByText("Watercolor")).toBeInTheDocument();
  });

  it("renders count badges for each category", () => {
    render(<ExploreCategories />);
    expect(screen.getByText("3,025")).toBeInTheDocument();
    expect(screen.getByText("4,103")).toBeInTheDocument();
  });

  it("renders links that navigate to category pages", () => {
    render(<ExploreCategories />);
    const abstractLink = screen.getByRole("link", { name: /abstract/i });
    expect(abstractLink).toHaveAttribute("href", "/category/abstract");
  });

  it("renders images for each category", () => {
    render(<ExploreCategories />);
    const images = screen.getAllByRole("img");
    // 6 categories × 4 images each = 24 images
    expect(images.length).toBeGreaterThanOrEqual(6);
  });

  it("renders main artwork images with descriptive alt text", () => {
    render(<ExploreCategories />);
    expect(screen.getByAltText("Abstract main artwork")).toBeInTheDocument();
  });
});
