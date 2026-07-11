# Stellar-LumenMint Design System (v2.0)

> **Theme:** Cosmic Midnight / Radiant Light  
> **Brand:** Stellar-LumenMint  
> **Platforms:** Web (Next.js), Mobile (React Native/Expo), Admin (Vite)

---

## 1. Brand Identity

Stellar-LumenMint is a premium NFT marketplace built on the Stellar blockchain. The brand identity evokes:

- **Stellar** — Stars, cosmos, celestial light, vastness
- **Lumen** — Light, brightness, illumination
- **Mint** — Creation, freshness, digital assets

The visual language combines deep midnight backgrounds with luminous teal and violet accents — creating a sense of depth, premium quality, and cosmic exploration.

### Brand Voice
- **Tone:** Confident, sophisticated, innovative
- **Audience:** NFT creators, collectors, traders — tech-savvy but not necessarily developers
- **Key themes:** Security, ownership, creativity, decentralization

---

## 2. Color Palette

### 2.1 Primary Colors (Dark Mode — Cosmic Midnight)

| Token | Hex | CSS Variable | Usage |
|-------|-----|-------------|-------|
| `lumen-bg` | `#0D1117` | `--background` | Page background |
| `lumen-surface` | `#141B24` | `--card` | Card/surface backgrounds |
| `lumen-surface-2` | `#1C2433` | `--secondary` | Elevated surfaces |
| `lumen-surface-3` | `#243044` | — | Deepest surfaces |

### 2.2 Brand Accents

| Token | Hex | Usage |
|-------|-----|-------|
| `lumen-teal` | `#00D4FF` | Primary accent, CTAs, active states |
| `lumen-teal-dim` | `#00A8CC` | Hover states, secondary accents |
| `lumen-violet` | `#7B6FFF` | Secondary accent, wallet UI, gradients |
| `lumen-violet-dim` | `#5E52D4` | Violet hover states |
| `lumen-pink` | `#FF6B9D` | Tertiary accent, decorative elements |

### 2.3 Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `lumen-text` | `#EEF2F7` | Primary text |
| `lumen-subtext` | `#8A9BB0` | Secondary/meta text |
| `lumen-text-muted` | `#6B7A8D` | Disabled/hint text |

### 2.4 Structural Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `lumen-border` | `#1E2D3D` | Borders, dividers |
| `lumen-border-bright` | `#00D4FF` | Active/focused borders |

### 2.5 Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| Success | `#34D399` | Confirmation, active status |
| Warning | `#FBBF24` | Caution, pending |
| Error | `#F87171` | Errors, destructive actions |
| Info | `#60A5FA` | Informational |

### 2.6 Light Mode Variants

| Token | Hex | Usage |
|-------|-----|-------|
| `lumen-bg-light` | `#F4F7FC` | Light page background |
| `lumen-surface-light` | `#FFFFFF` | Light card background |
| `lumen-text-light` | `#0D1117` | Light mode text |
| `lumen-border-light` | `#D8E1EB` | Light mode borders |

---

## 3. Typography

### 3.1 Font Stack
```css
font-family: "Inter", system-ui, -apple-system, sans-serif;
```

### 3.2 Font Sizes (Tailwind)

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 0.75rem | 1rem | Labels, timestamps |
| `text-sm` | 0.875rem | 1.25rem | Body text, nav links |
| `text-base` | 1rem | 1.5rem | Default body |
| `text-lg` | 1.125rem | 1.75rem | Lead text |
| `text-xl` | 1.25rem | 1.75rem | Subheadings |
| `text-2xl` | 1.5rem | 2rem | Section headings |
| `text-3xl` | 1.875rem | 2.25rem | Page headings |
| `text-4xl` | 2.25rem | 2.5rem | Hero headings |
| `text-5xl` | 3rem | 1 | Large hero |
| `text-6xl` | 3.75rem | 1 | Hero display |
| `text-7xl` | 4.5rem | 1 | Featured display |

### 3.3 Font Weights
- **Light:** 300 — decorative/hero text
- **Regular:** 400 — body text
- **Medium:** 500 — navigation
- **Semibold:** 600 — button labels, card titles
- **Bold:** 700 — headings, CTAs

---

## 4. Spacing & Layout

### 4.1 Container
- Max width: **1400px**
- Padding: `clamp(1rem, 4vw, 2.5rem)`
- Use `.container-responsive` utility class

### 4.2 Breakpoints

| Screen | Min Width | Target |
|--------|-----------|--------|
| xs | 475px | Small phones |
| sm | 576px | Large phones |
| md | 768px | Tablets |
| lg | 992px | Small desktops |
| xl | 1200px | Desktops |
| 2xl | 1440px | Wide screens |
| 3xl | 1600px | Ultra-wide |

### 4.3 Spacing Scale
Uses Tailwind's default spacing with additions:
- `18` = 4.5rem
- `88` = 22rem

### 4.4 Border Radius

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 0.375rem | Small elements |
| `rounded-md` | 0.5rem | Default radius |
| `rounded-lg` | 0.75rem | Cards, modals |
| `rounded-xl` | 0.75rem | Large cards |
| `rounded-2xl` | 1rem | Dialogues, sheets |
| `rounded-3xl` | 1.25rem | Hero elements |
| `rounded-full` | 9999px | Pills, avatars |

---

## 5. Shadows & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 4px 16px rgba(0,0,0,0.32), inset 0 1px 1px rgba(255,255,255,0.04)` | Default cards |
| `shadow-card-hover` | `0 8px 32px rgba(0,212,255,0.10), inset 0 1px 1px rgba(255,255,255,0.06)` | Card hover |
| `shadow-card-premium` | `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.06)` | Featured cards |
| `shadow-nav` | `0 1px 0 rgba(0,212,255,0.08), 0 4px 24px rgba(0,0,0,0.4)` | Navbar (default) |
| `shadow-nav-scrolled` | `0 1px 0 rgba(0,212,255,0.12), 0 8px 32px rgba(0,0,0,0.6)` | Navbar (scrolled) |
| `shadow-lm-glow` | `0 0 20px rgba(0,212,255,0.22), 0 0 40px rgba(0,212,255,0.08)` | Teal glow |
| `shadow-lm-glow-sm` | `0 0 10px rgba(0,212,255,0.18)` | Subtle teal glow |
| `shadow-lm-glow-lg` | `0 0 40px rgba(0,212,255,0.15), 0 0 80px rgba(0,212,255,0.05)` | Large teal glow |
| `shadow-lm-glow-v` | `0 0 20px rgba(123,111,255,0.22)` | Violet glow |
| `shadow-lm-elevated` | `0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.08)` | Premium elevated |

---

## 6. Gradients

### 6.1 Background Gradients

| Class | Value |
|-------|-------|
| `bg-gradient-lm` | `linear-gradient(135deg, #00D4FF, #7B6FFF)` |
| `bg-gradient-lm-reverse` | `linear-gradient(135deg, #7B6FFF, #00D4FF)` |
| `bg-gradient-lm-subtle` | `linear-gradient(135deg, rgba(0,212,255,0.12), rgba(123,111,255,0.12))` |
| `bg-gradient-lm-dark` | `linear-gradient(180deg, #0D1117 0%, #0A1628 100%)` |
| `bg-gradient-lm-warm` | `linear-gradient(135deg, #00D4FF, #FF6B9D, #7B6FFF)` |
| `bg-gradient-lm-surface` | `linear-gradient(135deg, #141B24, #1C2433)` |
| `bg-gradient-cosmic` | `radial-gradient(ellipse at 50% 0%, #0A1628 0%, #0D1117 50%, #060B12 100%)` |

### 6.2 Gradient Text
```css
.lm-gradient-text {
  background: linear-gradient(135deg, #00D4FF 0%, #7B6FFF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

---

## 7. Glassmorphism

### Dark Glass (Default)
```css
.lm-glass {
  background: rgba(20, 27, 36, 0.68);
  backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(0, 212, 255, 0.10);
}
```

### Light Glass
```css
.lm-glass-light {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(0, 0, 0, 0.06);
}
```

---

## 8. Animations

| Class | Keyframes | Duration | Usage |
|-------|-----------|----------|-------|
| `animate-lm-fade-up` | `lm-fade-up` | 0.5s | Entry animations |
| `animate-lm-fade-in` | `lm-fade-in` | 0.5s | Fade in |
| `animate-lm-scale-in` | `lm-scale-in` | 0.35s | Modal/dialog entry |
| `animate-lm-slide-up` | `lm-slide-up` | 0.6s | Slide up entry |
| `animate-lm-float` | `lm-float` | 4s infinite | Floating elements |
| `animate-lm-float-delayed` | `lm-float-delayed` | 5s infinite | Staggered float |
| `animate-lm-spin-slow` | `lm-spin-slow` | 8s linear | Decorative spin |
| `animate-lm-pulse-ring` | `lm-pulse-ring` | 2.8s infinite | CTA pulse ring |
| `animate-lm-glow-pulse` | `lm-glow-pulse` | 3s infinite | Glow oscillation |
| `animate-lm-shimmer` | `lm-shimmer` | 2s infinite | Loading shimmer |
| `animate-float` | `float` | 6s infinite | Gentle float |
| `animate-marquee` | `marquee` | 22s linear | Sliding marquee |
| `animate-pulse-glow` | `pulse-glow` | 3s infinite | Pulse glow |

### Staggered Entry Animation
Use classes `lm-stagger-1` through `lm-stagger-6` for sequential fade-in effects with 100ms delay increments.

---

## 9. Components

### 9.1 Button Variants

| Variant | Class | Usage |
|---------|-------|-------|
| Default | `btn-default` | Primary CTAs |
| Destructive | `btn-destructive` | Delete/remove |
| Outline | `btn-outline` | Secondary actions |
| Secondary | `btn-secondary` | Tertiary actions |
| Ghost | `btn-ghost` | Minimal actions |
| Link | `btn-link` | Inline navigation |
| Cosmic | `btn-cosmic` | Premium CTAs (teal→violet gradient) |
| Cosmic Outline | `btn-cosmic-outline` | Premium secondary |
| Wallet | `btn-wallet` | Wallet connect |
| Glow | `btn-glow` | Glowing teal border |

Sizes: `sm`, `default`, `lg`, `xl`, `icon`, `pill`, `pill-lg`

### 9.2 Card
Default card uses `rounded-2xl` with hover elevation and subtle border glow.  
Supports: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

### 9.3 Glass Card
```html
<div class="lm-glass rounded-xl p-6">
  <!-- content -->
</div>
```

### 9.4 Neon Border
```html
<div class="lm-neon-border rounded-xl">
  <!-- content -->
</div>
```

---

## 10. Utilities

| Utility | Purpose |
|---------|---------|
| `.lm-glow` | Teal glow box-shadow |
| `.lm-glow-sm` | Subtle teal glow |
| `.lm-glow-v` | Violet glow |
| `.lm-text-glow` | Teal text shadow |
| `.lm-gradient-text` | Teal→violet gradient text |
| `.lm-gradient-text-reverse` | Violet→teal gradient text |
| `.lm-gradient-text-warm` | Teal→pink→violet gradient text |
| `.lm-glass` | Dark glass morphism |
| `.lm-glass-light` | Light glass morphism |
| `.lm-neon-border` | Gradient neon border |
| `.lm-shimmer` | Loading shimmer effect |
| `.lm-pulse-ring` | Glowing pulse ring |
| `.lm-grid-bg` | Subtle grid background |
| `.lm-focus-ring` | Enhanced focus ring |
| `.contain-layout` | CSS contain: layout |
| `.touch-target` | 48px min touch area |

---

## 11. Mobile Theme (React Native)

The mobile app uses a typed `LMTheme` constant object exported from `constants/theme.tsx`.

**Key differences from web:**
- All values are static JS objects/numbers instead of CSS
- Shadows use `elevation` (Android) + `shadow*` (iOS) properties
- Gradient presets are arrays for `LinearGradient` components
- Transparency helpers are functions: `LMTheme.colors.tealAlpha(0.5)`

### Usage
```tsx
import { LMTheme } from '@/constants/theme';

// In StyleSheet
const styles = StyleSheet.create({
  container: {
    backgroundColor: LMTheme.colors.bg,
    padding: LMTheme.spacing.md,
    borderRadius: LMTheme.borderRadius.lg,
    ...LMTheme.shadow.glow,
  },
});
```

---

## 12. Implementation Notes

### Adding New Components
1. Use `lumen-*` Tailwind classes for colors
2. Apply `.lm-glass` for glass morphism effects
3. Use `animate-lm-fade-up` for entry animations
4. Use `lm-stagger-*` for sequential reveals
5. Ensure dark/light mode support via CSS variables

### Responsive Design
- Apply `container-responsive` for centered max-width layouts
- Use mobile-first breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
- Minimum touch target: 48px × 48px

### Accessibility
- All interactive elements must have `aria-label` or visible labels
- Use `.lm-focus-ring` for keyboard focus indicators
- Respect `prefers-reduced-motion` for animations
- Use `sr-only` for screen-reader-only text

---

*Design system version 2.0 — Stellar-LumenMint*
*Last updated: July 2026*
