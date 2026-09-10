import React from "react";
import { render, screen, act } from "@testing-library/react";
import { AuctionCountdown } from "./AuctionCountdown";

describe("AuctionCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders remaining time using the server clock offset", () => {
    // Server is 5 minutes ahead of the client.
    const serverNow = Date.now() + 5 * 60 * 1000;
    const endTime = new Date(serverNow + 90 * 60 * 1000).toISOString();
    render(
      <AuctionCountdown
        endTime={endTime}
        serverTimeOnMount={new Date(serverNow).toISOString()}
      />
    );
    expect(screen.getByTestId("auction-countdown")).toHaveTextContent(
      "01:30:00"
    );
  });

  it("falls back to the client clock when server time is missing", () => {
    const endTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();
    render(<AuctionCountdown endTime={endTime} />);
    expect(screen.getByTestId("auction-countdown")).toHaveTextContent(
      "45:00"
    );
  });

  it("falls back to the client clock when server time is invalid", () => {
    const endTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    render(
      <AuctionCountdown endTime={endTime} serverTimeOnMount="not-a-date" />
    );
    expect(screen.getByTestId("auction-countdown")).toHaveTextContent(
      "10:00"
    );
  });

  it("shows Auction Ended at zero and fires onAuctionEnd", () => {
    const onAuctionEnd = jest.fn();
    const endTime = new Date(Date.now() - 1000).toISOString();
    render(
      <AuctionCountdown endTime={endTime} onAuctionEnd={onAuctionEnd} />
    );
    expect(screen.getByTestId("auction-countdown")).toHaveTextContent(
      "Auction Ended"
    );
  });

  it("counts down and fires onAuctionEnd when time expires", () => {
    const onAuctionEnd = jest.fn();
    const endTime = new Date(Date.now() + 2000).toISOString();
    render(
      <AuctionCountdown endTime={endTime} onAuctionEnd={onAuctionEnd} />
    );
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(onAuctionEnd).toHaveBeenCalled();
  });
});