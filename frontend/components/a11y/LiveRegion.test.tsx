import React from "react";
import { render, screen, act } from "@testing-library/react";
import { LiveRegion, useAnnounce } from "./LiveRegion";
import "@testing-library/jest-dom";

// =============================================================================
describe("LiveRegion", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders with a status role and polite aria-live by default", () => {
    render(<LiveRegion message="Test announcement" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("Test announcement");
  });

  it("uses assertive politeness when specified", () => {
    render(<LiveRegion message="Urgent!" politeness="assertive" />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "assertive");
  });

  it("has aria-atomic set to true", () => {
    render(<LiveRegion message="Hello" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-atomic", "true");
  });

  it("clears the message after the specified delay", () => {
    render(<LiveRegion message="Temporary" clearAfter={500} />);
    expect(screen.getByRole("status")).toHaveTextContent("Temporary");

    act(() => {
      jest.advanceTimersByTime(501);
    });

    expect(screen.getByRole("status")).toHaveTextContent("\u00A0");
  });

  it("does not clear the message when clearAfter is false", () => {
    render(<LiveRegion message="Persistent" clearAfter={false} />);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Persistent");
  });

  it("updates message when prop changes", () => {
    const { rerender } = render(<LiveRegion message="First" />);
    expect(screen.getByRole("status")).toHaveTextContent("First");

    rerender(<LiveRegion message="Second" />);
    expect(screen.getByRole("status")).toHaveTextContent("Second");
  });

  it("renders with sr-only class for visual hiding", () => {
    render(<LiveRegion message="Hidden" />);
    // The region should have the sr-only class
    const region = screen.getByRole("status");
    expect(region.className).toContain("sr-only");
  });

  it("accepts a custom className", () => {
    render(<LiveRegion message="Custom" className="my-custom" />);
    const region = screen.getByRole("status");
    expect(region.className).toContain("my-custom");
  });
});

// =============================================================================
describe("useAnnounce", () => {
  function TestHarness({ onAnnounce }: { onAnnounce?: (fn: (msg: string) => void) => void }) {
    const { announce, LiveRegionElement } = useAnnounce("polite");
    React.useEffect(() => {
      onAnnounce?.(announce);
    }, [announce, onAnnounce]);
    return <LiveRegionElement />;
  }

  it("provides an announce function that updates the live region", () => {
    let announceFn: ((msg: string) => void) | undefined;
    render(
      <TestHarness
        onAnnounce={(fn) => {
          announceFn = fn;
        }}
      />
    );

    act(() => {
      announceFn?.("Hooked announcement");
    });

    expect(screen.getByRole("status")).toHaveTextContent("Hooked announcement");
  });

  it("defaults to polite politeness", () => {
    let announceFn: ((msg: string) => void) | undefined;
    render(
      <TestHarness
        onAnnounce={(fn) => {
          announceFn = fn;
        }}
      />
    );

    act(() => {
      announceFn?.("Something");
    });

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
