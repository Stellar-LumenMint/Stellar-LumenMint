# LumenMint Design System

## Colors

| Token | Value | Usage |
|---|---|---|
| `primary` | `#00D4FF` | Primary accent, buttons, links |
| `primary-gradient` | `#00D4FF → #7B6FFF` | Gradients, hero sections |
| `background` | `#0D1117` | Dark background |
| `surface` | `#1E1A45` | Cards, panels |
| `text-primary` | `#EEF2F7` | Primary text |
| `text-secondary` | `#8A9BB0` | Secondary text |
| `border` | `#1E2D3D` | Borders, dividers |
| `success` | `#10B981` (emerald) | Success states, network status |

## Typography

| Token | Class | Size |
|---|---|---|
| `heading-xl` | `text-3xl font-bold` | 30px |
| `heading-lg` | `text-2xl font-semibold` | 24px |
| `heading-md` | `text-xl font-semibold` | 20px |
| `body` | `text-sm text-[#8A9BB0]` | 14px |
| `caption` | `text-xs text-[#6B7A8D]` | 12px |

## Spacing

- Content max-width: `max-w-7xl` (1280px)
- Section padding: `py-16` (64px)
- Card gap: `gap-6` (24px)
- Button height: `h-12` (48px) — meets 44px touch target

## Components

| Component | Variants |
|---|---|
| `Button` | default, destructive, outline, ghost, cosmic, wallet, glow |
| `Card` | Glass-morphism with border gradient |
| `Input` | Dark surface with focus ring |
| `Badge` | Success, warning, info, cosmic |

## Accessibility

- All interactive elements meet 44px minimum touch target
- Focus rings visible on all interactive elements
- `sr-only` text for screen readers on icon-only buttons
- ARIA labels on navigation, dialogs, and interactive regions
