# Frontend Components

Reusable React components for the LumenMint NFT marketplace.

## UI Primitives (`components/ui/`)
| Component | Description |
|---|---|
| `Button` | Multi-variant button (default, outline, ghost, cosmic, wallet, pill sizes) with loading state |
| `ModernSearchInput` | Search input with icon and debounced suggestions |
| `textarea` | Accessible textarea with focus states |

## Layout
| Component | Description |
|---|---|
| `Navbar` | Sticky navigation with desktop links, mobile drawer, wallet connector, search |
| `Footer` | Multi-column footer with brand, platform links, resources, social icons |
| `ErrorBoundary` | React error boundary with retry, home, and report-issue buttons |

## Features
| Component | Description |
|---|---|
| `WalletConnector` | Stellar wallet connection (Freighter, Albedo, WalletConnect) |
| `UserDropdown` | Authenticated user menu with profile, settings, logout |
| `LanguageSwitcher` | i18n locale switcher |
| `ThemeToggle` | Dark/light mode toggle button |
| `NFTGrid` | Responsive NFT grid with loading skeleton, empty state, attribute badges |

## Testing
Components are tested with Jest + React Testing Library. Mock patterns:
- `next/link` → `<a>` tag
- `next/image` → `<img>` tag
- Zustand stores → `jest.mock()` with custom return values
