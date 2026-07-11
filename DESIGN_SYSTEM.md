# Stellar-LumenMint Design System (v3.0)

> **Theme:** Lumen Minimal — Gallery Fintech  
> **Brand:** Stellar-LumenMint  
> **Platforms:** Web (Next.js), Mobile (React Native/Expo), Admin (Vite)

---

## 1. Brand Identity

Stellar-LumenMint is a premium NFT marketplace built on the Stellar blockchain. The v3.0 visual language moves from neon cosmic glow to an editorial, gallery-like experience. The interface is intentionally quiet so the art and assets take center stage.

### Design Principles
- **Quiet UI, loud content** — the interface recedes; the art dominates.
- **Structural clarity** — grids, alignment, and whitespace create hierarchy.
- **Restraint** — minimal color, minimal borders, no glow or neon.
- **Premium motion** — subtle, physics-based micro-interactions instead of looping animations.

### Brand Voice
- **Tone:** Confident, refined, trustworthy
- **Audience:** Serious collectors, creators, and institutions
- **Key themes:** Ownership, provenance, curation, security

---

## 2. Color Palette

### 2.1 Core Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#FAFAFA` | Page background (light) |
| `surface` | `#FFFFFF` | Cards, sheets, dialogs |
| `surface-elevated` | `#F5F5F5` | Subtle elevated surfaces |
| `foreground` | `#0A0A0A` | Primary text |
| `foreground-muted` | `#737373` | Secondary text |
| `foreground-subtle` | `#A3A3A3` | Placeholders, disabled |
| `border` | `#E5E5E5` | Dividers, borders |
| `border-strong` | `#D4D4D4` | Focused/active borders |

### 2.2 Brand Accents

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0A0A0A` | Primary buttons, key actions |
| `primary-foreground` | `#FFFFFF` | Text on primary |
| `accent` | `#4F46E5` | Stellar indigo — links, active states |
| `accent-foreground` | `#FFFFFF` | Text on accent |
| `mint` | `#10B981` | Success, verified, mint states |
| `amber` | `#F59E0B` | Warnings, pending |
| `rose` | `#F43F5E` | Errors, destructive |

### 2.3 Dark Mode

| Token | Hex | Usage |
|-------|-----|-------|
| `background` | `#0A0A0A` | Page background (dark) |
| `surface` | `#141414` | Cards, sheets |
| `surface-elevated` | `#1F1F1F` | Elevated surfaces |
| `foreground` | `#FAFAFA` | Primary text |
| `foreground-muted` | `#A3A3A3` | Secondary text |
| `border` | `#262626` | Dividers, borders |

---

## 3. Typography

### 3.1 Font Stack
```css
font-family: "Geist", "Inter", system-ui, sans-serif;
```

### 3.2 Display Serif
```css
font-family: "Playfair Display", Georgia, serif;
```

### 3.3 Type Scale

| Class | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `text-xs` | 0.75rem | 1rem | 400 | Captions, timestamps |
| `text-sm` | 0.875rem | 1.25rem | 400 | Body, nav links |
| `text-base` | 1rem | 1.5rem | 400 | Default body |
| `text-lg` | 1.125rem | 1.75rem | 400 | Lead text |
| `text-xl` | 1.25rem | 1.75rem | 500 | Subheadings |
| `text-2xl` | 1.5rem | 2rem | 500 | Section headings |
| `text-3xl` | 1.875rem | 2.25rem | 600 | Page headings |
| `text-4xl` | 2.25rem | 2.5rem | 600 | Hero headings |
| `text-5xl` | 3rem | 1 | 600 | Large hero |
| `text-6xl` | 3.75rem | 1 | 700 | Display |

### 3.4 Letter Spacing
- **Headings:** `-0.02em` for tighter, premium feel
- **Labels:** `0.05em` uppercase with wide tracking

---

## 4. Spacing & Layout

### 4.1 Container
- Max width: **1280px**
- Padding: `clamp(1rem, 5vw, 3rem)`

### 4.2 Breakpoints

| Screen | Min Width |
|--------|-----------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

### 4.3 Border Radius
- `sm`: 4px
- `md`: 6px
- `lg`: 8px
- `xl`: 12px
- `full`: 9999px

---

## 5. Shadows & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle elevation |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` | Cards, dropdowns |
| `shadow-lg` | `0 12px 40px rgba(0,0,0,0.08)` | Modals, dialogs |

---

## 6. Components

### 6.1 Button
- **Primary:** Solid `#0A0A0A` background, white text, 6px radius
- **Secondary:** White background, `#0A0A0A` border, dark text
- **Ghost:** Transparent, hover background `#F5F5F5`
- **Accent:** `#4F46E5` background, white text

### 6.2 Card
- White background, no border or 1px `#E5E5E5`
- 8px radius
- Subtle shadow on hover
- Full-bleed image with clean metadata below

### 6.3 Input
- 1px `#E5E5E5` border
- 6px radius
- Focus: `ring-2 ring-[#4F46E5]/20 border-[#4F46E5]`

---

## 7. Motion

- **Transitions:** `cubic-bezier(0.4, 0, 0.2, 1)` — 200ms default
- **Hover:** Scale `1.01` on cards, opacity shifts on links
- **Focus:** Visible ring, no glow
- **Entry:** Fade + slight translate (8px), staggered 50ms

---

## 8. Accessibility

- Minimum 48px touch targets
- Visible focus indicators
- Respect `prefers-reduced-motion`
- WCAG 2.1 AA contrast targets

---

*Design system version 3.0 — Stellar-LumenMint*
