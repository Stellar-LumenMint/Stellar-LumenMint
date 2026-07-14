import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { MainHero } from "../main-hero";
import "@testing-library/jest-dom";

expect.extend(toHaveNoViolations);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/en",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "homepage.hero.titlePart1": "Discover",
        "homepage.hero.titlePart2": "Next Generation NFTs",
        "homepage.hero.titlePart3": "on Stellar",
        "homepage.hero.subtitle": "The premier NFT marketplace",
        "homepage.hero.cta": "Get Started",
        "homepage.hero.learnMore": "Explore",
        "homepage.features.onChain": "On-chain",
        "homepage.features.onChainDesc": "Fully on-chain",
        "homepage.features.stellar": "Stellar",
        "homepage.features.ecosystem": "Ecosystem",
        "homepage.features.stellarDesc": "Low fees",
        "homepage.features.secure": "Secure",
        "homepage.features.storage": "Storage",
        "homepage.features.secureDesc": "Encrypted",
      };
      return map[key] || key;
    },
    locale: "en",
  }),
}));

jest.mock("@/hooks/useExperiment", () => ({
  useExperimentVariant: () => null,
}));

jest.mock("@/components/Vault", () => ({
  Vault: () => <div>Vault</div>,
}));

jest.mock("@/lib/telemetry", () => ({
  telemetry: { track: jest.fn() },
}));

jest.mock("@/lib/telemetry/sanitizer", () => ({
  sanitizeTelemetryPayload: (p: any) => p,
}));

jest.mock("./image", () => ({
  OptimizedImage: (props: any) => <img {...props} alt={props.alt} />,
}));

describe("MainHero accessibility (axe-core)", () => {
  it("has no accessibility violations", async () => {
    const { container } = render(<MainHero />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders heading hierarchy correctly", () => {
    render(<MainHero />);
    // The main hero is wrapped in an h1
    const heading = document.querySelector("h1");
    expect(heading).toBeInTheDocument();
  });
});
