import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { NFTGrid } from "../components/nft/NFTGrid";

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

// Mock next/link
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import type { NFT } from "@/types";

const mockNFTs: NFT[] = [
  {
    id: "nft-1",
    name: "Cosmic Dragon",
    image: "/images/dragon.png",
    tokenId: "42",
    contractAddress: "CCOSMICDRAGON1234567890",
    description: "A legendary cosmic dragon.",
    ownerId: "owner-1",
    creatorId: "creator-1",
    collectionId: "col-1",
    mintedAt: new Date("2026-01-15T12:00:00Z"),
    lastPrice: "100",
    collectionName: "Dragons",
    attributes: [
      { traitType: "Rarity", value: "Legendary" },
      { traitType: "Element", value: "Fire" },
      { traitType: "Power", value: "95" },
      { traitType: "Speed", value: "80" },
    ],
  },
  {
    id: "nft-2",
    name: "Stellar Phoenix",
    image: null,
    tokenId: "7",
    contractAddress: "CSTELLARPHOENIX123456789",
    description: null,
    ownerId: "owner-2",
    creatorId: "creator-1",
    collectionId: "col-2",
    mintedAt: new Date("2026-02-01T08:30:00Z"),
    lastPrice: null,
    collectionName: "Phoenixes",
    attributes: [{ traitType: "Rarity", value: "Epic" }],
  },
];

describe("NFTGrid component", () => {
  it("renders loading skeleton when loading is true", () => {
    render(<NFTGrid nfts={[]} loading={true} />);
    // Should render 8 skeleton cards
    const skeletonCards = document.querySelectorAll(".animate-pulse");
    expect(skeletonCards.length).toBe(8);
  });

  it("renders empty state when no NFTs", () => {
    render(<NFTGrid nfts={[]} />);
    expect(screen.getByText("No NFTs found")).toBeInTheDocument();
  });

  it("renders custom empty message", () => {
    render(<NFTGrid nfts={[]} emptyMessage="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders NFT cards with names and token IDs", () => {
    render(<NFTGrid nfts={mockNFTs} />);
    expect(screen.getByText("Cosmic Dragon")).toBeInTheDocument();
    expect(screen.getByText("Stellar Phoenix")).toBeInTheDocument();
    expect(screen.getByText("Token #42")).toBeInTheDocument();
    expect(screen.getByText("Token #7")).toBeInTheDocument();
  });

  it("renders collection name badges", () => {
    render(<NFTGrid nfts={mockNFTs} />);
    expect(screen.getByText("Dragons")).toBeInTheDocument();
    expect(screen.getByText("Phoenixes")).toBeInTheDocument();
  });

  it("renders price badges when lastPrice is set", () => {
    render(<NFTGrid nfts={mockNFTs} />);
    expect(screen.getByText("100 XLM")).toBeInTheDocument();
  });

  it("renders attributes (up to 3) with +N overflow indicator", () => {
    render(<NFTGrid nfts={mockNFTs} />);
    expect(screen.getByText("Rarity: Legendary")).toBeInTheDocument();
    expect(screen.getByText("Element: Fire")).toBeInTheDocument();
    expect(screen.getByText("Power: 95")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("renders NFT cards as links to marketplace", () => {
    render(<NFTGrid nfts={mockNFTs} />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/marketplace/nft-1");
    expect(links[1]).toHaveAttribute("href", "/marketplace/nft-2");
  });

  it("handles NFT without name gracefully", () => {
    const nftWithoutName: NFT[] = [
      {
        id: "nft-3",
        name: "",
        image: null,
        tokenId: "1",
        contractAddress: "CNFTWITHOUTNAME1234567890",
        description: null,
        ownerId: "owner-3",
        creatorId: "creator-1",
        collectionId: null,
        mintedAt: new Date("2026-01-01T00:00:00Z"),
        lastPrice: null,
        attributes: [],
      },
    ];
    render(<NFTGrid nfts={nftWithoutName} />);
    expect(screen.getByText("Untitled NFT")).toBeInTheDocument();
  });
});
