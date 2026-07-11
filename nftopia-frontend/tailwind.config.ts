import type { Config } from "tailwindcss";

/**
 * Stellar-LumenMint — Tailwind Configuration (v2.0)
 * Brand: Stellar-LumenMint  |  Org: Stellar-LumenMint
 * Theme: Cosmic Midnight / Radiant Light
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs:  "475px",
      sm:  "576px",
      md:  "768px",
      lg:  "992px",
      xl:  "1200px",
      "2xl": "1440px",
      "3xl": "1600px",
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        /* ── Stellar-LumenMint brand gradients ── */
        "gradient-lm":        "linear-gradient(135deg, #00D4FF, #7B6FFF)",
        "gradient-lm-reverse":"linear-gradient(135deg, #7B6FFF, #00D4FF)",
        "gradient-lm-subtle": "linear-gradient(135deg, rgba(0,212,255,0.12), rgba(123,111,255,0.12))",
        "gradient-lm-dark":   "linear-gradient(180deg, #0D1117 0%, #0A1628 100%)",
        "gradient-lm-warm":   "linear-gradient(135deg, #00D4FF, #FF6B9D, #7B6FFF)",
        "gradient-lm-surface":"linear-gradient(135deg, #141B24, #1C2433)",
        "gradient-cosmic":    "radial-gradient(ellipse at 50% 0%, #0A1628 0%, #0D1117 50%, #060B12 100%)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        /* shadcn/ui CSS-variable tokens */
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        card:        { DEFAULT: "hsl(var(--card))",    foreground: "hsl(var(--card-foreground))" },
        popover:     { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        primary:     { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary:   { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted:       { DEFAULT: "hsl(var(--muted))",   foreground: "hsl(var(--muted-foreground))" },
        accent:      { DEFAULT: "hsl(var(--accent))",  foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border:  "hsl(var(--border))",
        input:   "hsl(var(--input))",
        ring:    "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        /* ── Stellar-LumenMint semantic design tokens (v2) ── */
        lumen: {
          /* dark surface scale */
          bg:        "#0D1117",
          surface:   "#141B24",
          "surface-2":  "#1C2433",
          "surface-3":  "#243044",
          /* brand colours */
          teal:      "#00D4FF",
          "teal-dim":"#00A8CC",
          "teal-dark":"#0088A8",
          violet:    "#7B6FFF",
          "violet-dim":"#5E52D4",
          "violet-dark":"#4A3FB8",
          pink:      "#FF6B9D",
          "pink-dim": "#D45580",
          /* text */
          text:      "#EEF2F7",
          subtext:   "#8A9BB0",
          "text-muted": "#6B7A8D",
          /* structural */
          border:    "#1E2D3D",
          "border-bright": "#00D4FF",
          /* light-mode variants */
          "bg-light":      "#F4F7FC",
          "surface-light": "#FFFFFF",
          "text-light":    "#0D1117",
          "subtext-light": "#6B7A8D",
          "border-light":  "#D8E1EB",
          "hover-light":   "#E8F4FF",
          /* keep legacy lumen.* tokens used in existing pages */
          background:  "#0D1117",
          card:        "#141B24",
          primary:     "#00D4FF",
          hover:       "#0099BB",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "pulse-glow": {
          "0%":   { opacity: "0.2" },
          "50%":  { opacity: "0.65" },
          "100%": { opacity: "0.2" },
        },
        "lm-pulse-ring": {
          "0%":   { transform: "scale(0.88)", opacity: "0.7" },
          "50%":  { transform: "scale(1.06)", opacity: "0.25" },
          "100%": { transform: "scale(0.88)", opacity: "0.7" },
        },
        float: {
          "0%":   { transform: "translateY(0)" },
          "50%":  { transform: "translateY(-12px)" },
          "100%": { transform: "translateY(0)" },
        },
        marquee: {
          from: { transform: "translateX(0%)" },
          to:   { transform: "translateX(-100%)" },
        },
        "lm-fade-up": {
          from: { transform: "translateY(14px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        "lm-fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "lm-scale-in": {
          from: { transform: "scale(0.92)", opacity: "0" },
          to:   { transform: "scale(1)",    opacity: "1" },
        },
        "lm-shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to:   { transform: "translateX(0)",    opacity: "1" },
        },
        "lm-spin-slow": {
          from: { transform: "rotate(0deg)" },
          to:   { transform: "rotate(360deg)" },
        },
        "lm-glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%":      { opacity: "0.8" },
        },
      },
      animation: {
        "accordion-down":   "accordion-down 0.2s ease-out",
        "accordion-up":     "accordion-up 0.2s ease-out",
        "pulse-glow":       "pulse-glow 3s ease-in-out infinite",
        "lm-pulse-ring":    "lm-pulse-ring 2.8s ease-in-out infinite",
        float:              "float 6s ease-in-out infinite",
        marquee:            "marquee 22s linear infinite",
        "lm-fade-up":       "lm-fade-up 0.45s ease-out forwards",
        "lm-fade-in":       "lm-fade-in 0.5s ease-out forwards",
        "lm-scale-in":      "lm-scale-in 0.35s ease-out forwards",
        "lm-shimmer":       "lm-shimmer 2s ease-in-out infinite",
        "slide-in-right":   "slide-in-right 0.3s ease-out",
        "lm-spin-slow":     "lm-spin-slow 8s linear infinite",
        "lm-glow-pulse":    "lm-glow-pulse 3s ease-in-out infinite",
      },
      backdropBlur: {
        xs: "2px",
        "4xl": "60px",
      },
      boxShadow: {
        "lm-glow":      "0 0 20px rgba(0,212,255,0.22), 0 0 40px rgba(0,212,255,0.08)",
        "lm-glow-sm":   "0 0 10px rgba(0,212,255,0.18)",
        "lm-glow-lg":   "0 0 40px rgba(0,212,255,0.15), 0 0 80px rgba(0,212,255,0.05)",
        "lm-glow-v":    "0 0 20px rgba(123,111,255,0.22)",
        "lm-glow-v-lg": "0 0 40px rgba(123,111,255,0.15)",
        card:           "0 4px 16px rgba(0,0,0,0.32), inset 0 1px 1px rgba(255,255,255,0.04)",
        "card-hover":   "0 8px 32px rgba(0,212,255,0.10), inset 0 1px 1px rgba(255,255,255,0.06)",
        "card-premium": "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,212,255,0.06), inset 0 1px 1px rgba(255,255,255,0.04)",
        nav:            "0 1px 0 rgba(0,212,255,0.08), 0 4px 24px rgba(0,0,0,0.4)",
        "nav-scrolled": "0 1px 0 rgba(0,212,255,0.12), 0 8px 32px rgba(0,0,0,0.6)",
        "lm-elevated":  "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.08)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
        "800": "800ms",
      },
      fontSize: {
        xs:    ["0.75rem",  { lineHeight: "1rem" }],
        sm:    ["0.875rem", { lineHeight: "1.25rem" }],
        base:  ["1rem",     { lineHeight: "1.5rem" }],
        lg:    ["1.125rem", { lineHeight: "1.75rem" }],
        xl:    ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem",   { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem",  { lineHeight: "2.5rem" }],
        "5xl": ["3rem",     { lineHeight: "1" }],
        "6xl": ["3.75rem",  { lineHeight: "1" }],
        "7xl": ["4.5rem",   { lineHeight: "1" }],
        "8xl": ["6rem",     { lineHeight: "1" }],
        "9xl": ["8rem",     { lineHeight: "1" }],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({
      addUtilities,
    }: {
      addUtilities: (utilities: Record<string, any>) => void;
    }) {
      addUtilities({
        ".contain-layout":   { contain: "layout" },
        ".contain-paint":    { contain: "paint" },
        ".contain-content":  { contain: "content" },
        ".contain-strict":   { contain: "strict" },
        ".touch-target": { minHeight: "48px", minWidth: "48px" },
        ".safe-area-inset": {
          paddingTop:    "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft:   "env(safe-area-inset-left)",
          paddingRight:  "env(safe-area-inset-right)",
        },
        ".lm-glass": {
          background:             "rgba(20, 27, 36, 0.68)",
          backdropFilter:         "blur(20px) saturate(1.2)",
          "-webkit-backdrop-filter": "blur(20px) saturate(1.2)",
          border:                 "1px solid rgba(0, 212, 255, 0.10)",
        },
        ".lm-glass-light": {
          background:             "rgba(255, 255, 255, 0.72)",
          backdropFilter:         "blur(20px) saturate(1.2)",
          "-webkit-backdrop-filter": "blur(20px) saturate(1.2)",
          border:                 "1px solid rgba(0, 0, 0, 0.06)",
        },
        ".container-responsive": {
          width: "100%",
          maxWidth: "1400px",
          marginLeft: "auto",
          marginRight: "auto",
          paddingLeft: "clamp(1rem, 4vw, 2.5rem)",
          paddingRight: "clamp(1rem, 4vw, 2.5rem)",
        },
        ".lm-gradient-text": {
          background: "linear-gradient(135deg, #00D4FF 0%, #7B6FFF 100%)",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".lm-text-glow": {
          textShadow: "0 0 24px rgba(0, 212, 255, 0.45)",
        },
        ".lm-grid-bg": {
          backgroundImage: "linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        },
        ".lm-shimmer": {
          background: "linear-gradient(90deg, rgba(0,212,255,0) 0%, rgba(0,212,255,0.05) 50%, rgba(0,212,255,0) 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s ease-in-out infinite",
        },
      });
    },
  ],
};

export default config;
