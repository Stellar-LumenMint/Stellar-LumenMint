# Frontend Hooks

Custom React hooks for the LumenMint marketplace.

## Hook Reference

| Hook | Purpose |
|---|---|
| `useAuth` | Access auth state (user, isAuthenticated, login/logout) |
| `useTranslation` | i18n translation with locale switching |
| `useDebounce` | Debounce a value by specified milliseconds |
| `useMobile` | Detect mobile viewport via window width |
| `useStore` | Generic Zustand store accessor |
| `useWalletAuth` | Stellar wallet auth (challenge, sign, verify) |
| `useGasEstimation` | Estimate Soroban transaction gas |
| `useCreatorListings` | Fetch listings for a creator profile |
| `useOptimizedFetch` | Cached fetch with retry and deduplication |
| `useScrollTracking` | Infinite scroll pagination |
| `useTelemetry` | Send telemetry events |
| `useAccessibilityTracking` | Track A11y violations |
| `useUIElementTracking` | Track UI element interactions |

## Testing

Hooks are tested with `@testing-library/react`'s `renderHook` utility and `jest.useFakeTimers()` for timer-dependent hooks.
