import { renderHook, waitFor, act } from "@testing-library/react";
import { useOptimizedFetch } from "./useOptimizedFetch";
import { clearAllCaches } from "../utils/fetchUtils";
import React from "react";

global.fetch = jest.fn();

describe("useOptimizedFetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllCaches();
  });

  it("should fetch and cache data", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ foo: "bar" }),
    });
    const { result } = renderHook(() =>
      useOptimizedFetch("test-url"),
    );
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ foo: "bar" }));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle errors and retry", async () => {
    let callCount = 0;
    (fetch as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount < 2) return Promise.reject(new Error("fail"));
      return Promise.resolve({ ok: true, json: async () => ({ foo: "bar" }) });
    });
    const { result } = renderHook(() =>
      useOptimizedFetch("test-url", { retry: 1, retryDelay: 10 }),
    );
    await waitFor(() => expect(result.current.data).toEqual({ foo: "bar" }));
  });

  it("should show error on fetch failure", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: "Internal Server Error" }),
    });

    // Disable automatic retries so the hook drops straight to the error state.
    const { result } = renderHook(() =>
      useOptimizedFetch("test-url-error", { retry: 0, retryDelay: 0 }),
    );

    // Flush microtasks explicitly so the hook processes the error transition.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeNull();
    });
  });

  it("should cleanup on unmount and prevent memory leaks", () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ foo: "bar" }),
    });
    const { unmount } = renderHook(() => useOptimizedFetch("test-url"));
    expect(() => unmount()).not.toThrow();
  });
});