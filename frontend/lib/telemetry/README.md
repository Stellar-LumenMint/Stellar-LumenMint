# Telemetry

Client-side telemetry for the LumenMint frontend.

## Navigation Tracking

Tracks page views, navigation clicks, and menu interactions:

```typescript
import { emitNavItemClicked, NAV_ITEM_IDS } from './navigation-instrumentation';

emitNavItemClicked({
  nav_item_id: NAV_ITEM_IDS.MARKETPLACE,
  placement: 'navbar_desktop',
  destination_route: '/en/marketplace',
  menu_state: 'expanded',
  locale_source: 'en',
  authenticated: true,
});
```

## Auth Events

Tracks authentication lifecycle:
- Login/register submission, success, and failure
- Wallet connection and disconnection
- Token refresh events

## Error Codes

Maps errors to standardized codes for aggregation:

| Error Pattern | Code |
|---|---|
| Invalid credentials | `AUTH_INVALID_CREDENTIALS` |
| Network error | `AUTH_NETWORK_ERROR` |
| Token expired | `AUTH_TOKEN_EXPIRED` |
| Rate limited | `AUTH_RATE_LIMITED` |
