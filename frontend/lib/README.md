# Frontend Library

Shared modules for the LumenMint Next.js frontend.

## State Management
| Module | Purpose |
|---|---|
| `stores/auth-store.ts` | Zustand auth store (login, register, wallet, token refresh) |
| `stores/preferences-store.ts` | Theme, notifications, display, language preferences |
| `hooks/useStore.ts` | Generic store hook factory |

## Context
| Module | Purpose |
|---|---|
| `context/AuthContext.tsx` | Auth provider with wallet challenge flow |

## API
| Module | Purpose |
|---|---|
| `api/fetchWithAuth.ts` | Fetch wrapper with automatic JWT refresh |
| `config.ts` | API base URL and endpoint config |

## Validation
| Module | Purpose |
|---|---|
| `validation/auth.ts` | Zod schemas for login/register forms |

## Routing
| Module | Purpose |
|---|---|
| `routing.ts` | Localized route builder (`buildLocalizedRoute`) |

## Telemetry
| Module | Purpose |
|---|---|
| `telemetry/` | Navigation, auth, error instrumentation |
