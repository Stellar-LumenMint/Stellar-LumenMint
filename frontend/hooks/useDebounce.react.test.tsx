import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";
import React from "react";

jest.useFakeTimers();

describe("useDebounce", () => {
  it("should debounce value changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 200 } },
    );
    expect(result.current).toBe("a");
    rerender({ value: "b", delay: 200 });
    expect(result.current).toBe("a");
    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(result.current).toBe("a");
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");
  });

  it("should support immediate execution", () => {
    const { result, rerender } = renderHook(
      ({ value, delay, immediate }) =>
        useDebounce(value, delay, { immediate }),
      {
        initialProps: { value: "a", delay: 100, immediate: true },
      },
    );
    expect(result.current).toBe("a");
    rerender({ value: "b", delay: 100, immediate: true });
    expect(result.current).toBe("a");
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe("b");
  });

  it("should cleanup on unmount and prevent memory leaks", () => {
    const { unmount, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 100 } },
    );
    rerender({ value: "b", delay: 100 });
    expect(() => unmount()).not.toThrow();
  });
});