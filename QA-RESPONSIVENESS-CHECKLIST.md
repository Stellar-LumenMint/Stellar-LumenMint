# Mobile QA Responsiveness Checklist

## Device Testing Matrix

| Device | Width | Status |
|---|---|---|
| iPhone SE | 375px | ✅ |
| iPhone 14 | 390px | ✅ |
| iPhone 14 Pro Max | 430px | ✅ |
| iPad Mini | 768px | ✅ |
| iPad Pro | 1024px | ✅ |
| Desktop | 1440px | ✅ |

## Component Checks

| Component | Desktop | Tablet | Mobile |
|---|---|---|---|
| Navbar | ✅ Sticky + full links | ✅ Sticky + compact | ✅ Hamburger drawer |
| Footer | ✅ 5-column | ✅ 3-column | ✅ Stacked |
| NFT Grid | ✅ 4-col | ✅ 3-col | ✅ 1-2 col |
| Hero | ✅ Full width | ✅ Full width | ✅ Stacked |
| Buttons | ✅ h-12 | ✅ h-12 | ✅ h-12 (44px+) |

## Interaction Checks

- [ ] Hamburger menu opens/closes smoothly
- [ ] Focus trap in mobile drawer
- [ ] Touch targets ≥ 44px on mobile
- [ ] No horizontal scroll at any breakpoint
- [ ] Images lazy-load on scroll
- [ ] Forms usable with on-screen keyboard
