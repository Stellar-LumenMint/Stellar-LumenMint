import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import "@testing-library/jest-dom";

// =============================================================================
// Helper: Component that throws
// =============================================================================
function ThrowingComponent({ message = "Test error" }: { message?: string }) {
  throw new Error(message);
}

function SafeComponent() {
  return <div>All good</div>;
}

// Suppress console.error during these tests to keep output clean
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalError;
});

// =============================================================================
// Tests
// =============================================================================
describe("ErrorBoundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Basic rendering
  // ===========================================================================
  describe("rendering", () => {
    it("renders children when there is no error", () => {
      render(
        <ErrorBoundary>
          <SafeComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("All good")).toBeInTheDocument();
    });

    it("renders default fallback UI when a child throws", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });

    it("renders custom fallback when provided", () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Custom fallback")).toBeInTheDocument();
    });

    it("renders FallbackComponent prop when provided", () => {
      const FallbackComp = ({ error, resetErrorBoundary }: any) => (
        <div>
          <p>Custom component fallback: {error.message}</p>
          <button onClick={resetErrorBoundary}>Reset</button>
        </div>
      );

      render(
        <ErrorBoundary FallbackComponent={FallbackComp}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText(/Custom component fallback: Test error/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Recovery
  // ===========================================================================
  describe("recovery", () => {
    it("retries rendering after clicking Retry button", () => {
      let shouldThrow = true;
      const ToggleError = () => {
        if (shouldThrow) throw new Error("Boom");
        return <div>Recovered!</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <ToggleError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();

      // Allow recovery
      shouldThrow = false;

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      // Need to force re-render to pick up the new state
      rerender(
        <ErrorBoundary key="recovered">
          <ToggleError />
        </ErrorBoundary>
      );

      expect(screen.getByText("Recovered!")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Visibility controls
  // ===========================================================================
  describe("action button visibility", () => {
    it("shows retry button by default", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("hides retry button when showRetry is false", () => {
      render(
        <ErrorBoundary showRetry={false}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    });

    it("shows Go Home button by default", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Go Home")).toBeInTheDocument();
    });

    it("hides Go Home button when showHome is false", () => {
      render(
        <ErrorBoundary showHome={false}>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.queryByText("Go Home")).not.toBeInTheDocument();
    });

    it("shows Report Issue button by default", () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Report Issue")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // error boundary: onError callback
  // ===========================================================================
  describe("onError callback", () => {
    it("calls onError when an error is caught", () => {
      const onError = jest.fn();
      render(
        <ErrorBoundary onError={onError} componentName="TestComponent">
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0].message).toBe("Test error");
      expect(onError.mock.calls[0][1]).toBeDefined();
    });
  });

  // ===========================================================================
  // Stack trace display in development
  // ===========================================================================
  describe("development mode", () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it("shows error details in development mode", () => {
      process.env.NODE_ENV = "development";
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );
      expect(screen.getByText("Error Details")).toBeInTheDocument();
    });
  });
});
