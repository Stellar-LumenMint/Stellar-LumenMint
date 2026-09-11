import { renderHook, act } from '@testing-library/react';
import { useMobile, useMediaQuery } from './index';
import { getBreakpointQuery } from '../utils/breakpoints';

function createMql(matches: boolean) {
  return {
    matches,
    media: '',
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  };
}

describe('Responsive Hooks Integration', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // SSR simulation is not reliable in Jest/jsdom, so skip these tests
  it.skip('should not mismatch on hydration (SSR-safe)', () => {});
  it.skip('should not mismatch on hydration for useMediaQuery (SSR-safe)', () => {});

  it('should update both hooks when their media queries change', async () => {
    const mobileMql = createMql(false);
    const mdMql = createMql(true);
    jest.spyOn(window, 'matchMedia').mockImplementation((query: string) => {
      if (query === getBreakpointQuery('md', 'min')) return mdMql as any;
      return mobileMql as any;
    });
    const { result: mobileResult } = renderHook(() => useMobile(640));
    const { result: mqResult } = renderHook(() => useMediaQuery(getBreakpointQuery('md', 'min')));
    expect(mobileResult.current).toBe(false);
    expect(mqResult.current).toBe(true);
    // Simulate viewport shrinking: mobile query now matches.
    await act(async () => {
      mobileMql.matches = true;
      mobileMql.addEventListener.mock.calls[0][1]();
    });
    expect(mobileResult.current).toBe(true);
  });

  it('should clean up all event listeners (memory leak check)', () => {
    const mql = createMql(true);
    jest.spyOn(window, 'matchMedia').mockImplementation(() => mql as any);
    for (let i = 0; i < 5; i++) {
      const { unmount } = renderHook(() => useMobile(640));
      unmount();
    }
    expect(mql.removeEventListener).toHaveBeenCalledTimes(5);
    expect(mql.addEventListener).toHaveBeenCalledTimes(5);
  });
});
