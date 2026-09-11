import { renderHook, act } from '@testing-library/react';
import { useMobile } from './useMobile';

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

describe('useMobile', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return true if width is less than breakpoint', () => {
    jest.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          ...createMql(true),
          media: query,
        }) as any,
    );
    const { result } = renderHook(() => useMobile(640));
    expect(result.current).toBe(true);
  });

  it('should return false if width is greater than breakpoint', () => {
    jest.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          ...createMql(false),
          media: query,
        }) as any,
    );
    const { result } = renderHook(() => useMobile(640));
    expect(result.current).toBe(false);
  });

  it('should query the expected max-width media query', () => {
    const spy = jest.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          ...createMql(false),
          media: query,
        }) as any,
    );
    renderHook(() => useMobile(640));
    expect(spy).toHaveBeenCalledWith('(max-width: 639px)');
  });

  it('should update when the media query changes', async () => {
    const mql = createMql(false);
    jest.spyOn(window, 'matchMedia').mockImplementation(() => mql as any);
    const { result } = renderHook(() => useMobile(640));
    expect(result.current).toBe(false);
    await act(async () => {
      mql.matches = true;
      // Fire the registered change listener (the callback from useSyncExternalStore)
      mql.addEventListener.mock.calls[0][1]();
    });
    expect(result.current).toBe(true);
  });

  it('should clean up event listeners on unmount', () => {
    const mql = createMql(true);
    jest.spyOn(window, 'matchMedia').mockImplementation(() => mql as any);
    const { unmount } = renderHook(() => useMobile(640));
    unmount();
    expect(mql.addEventListener).toHaveBeenCalled();
    expect(mql.removeEventListener).toHaveBeenCalled();
  });

  it('should clean up listeners on repeated mount/unmount (memory leak check)', () => {
    const mqls = Array.from({ length: 5 }, () => createMql(true));
    jest.spyOn(window, 'matchMedia').mockImplementation(() => mqls[0] as any);
    for (let i = 0; i < 5; i++) {
      const { unmount } = renderHook(() => useMobile(640));
      unmount();
    }
    expect(mqls[0].removeEventListener).toHaveBeenCalledTimes(5);
    expect(mqls[0].addEventListener).toHaveBeenCalledTimes(5);
  });

  it('accepts a named Tailwind breakpoint', () => {
    const spy = jest.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          ...createMql(false),
          media: query,
        }) as any,
    );
    renderHook(() => useMobile('md'));
    expect(spy).toHaveBeenCalledWith('(max-width: 767px)');
  });
});
