/**
 * Stellar-LumenMint — Mobile App Theme (v3.0)
 * Brand: Stellar-LumenMint
 * Theme: Lumen Minimal — Gallery Fintech
 */

export const LMTheme = {
  colors: {
    // Backgrounds
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surface2: '#F5F5F5',
    surface3: '#E5E5E5',

    // Brand
    primary: '#0A0A0A',
    indigo: '#4F46E5',
    teal: '#4F46E5',
    violet: '#4F46E5',
    mint: '#10B981',
    amber: '#F59E0B',
    rose: '#F43F5E',

    // Text
    textPrimary: '#0A0A0A',
    textSecondary: '#737373',
    textMuted: '#A3A3A3',
    textLight: '#FAFAFA',

    // Structural
    border: '#E5E5E5',
    borderStrong: '#D4D4D4',
    divider: '#E5E5E5',

    // Status
    success: '#10B981',
    warning: '#F59E0B',
    error: '#F43F5E',
    info: '#4F46E5',

    // Gradient presets
    gradientPrimary: ['#0A0A0A', '#262626'] as const,
    gradientIndigo: ['#4F46E5', '#6366F1'] as const,
    gradientWarm: ['#0A0A0A', '#4F46E5'] as const,
    gradientDark: ['#0A0A0A', '#141414'] as const,
    gradientCard: ['#FFFFFF', '#FAFAFA'] as const,

    // Transparency helpers
    tealAlpha: (opacity: number) => `rgba(79, 70, 229, ${opacity})`,
    violetAlpha: (opacity: number) => `rgba(79, 70, 229, ${opacity})`,
    pinkAlpha: (opacity: number) => `rgba(255, 107, 157, ${opacity})`,
    whiteAlpha: (opacity: number) => `rgba(250, 250, 250, ${opacity})`,
    blackAlpha: (opacity: number) => `rgba(0, 0, 0, ${opacity})`,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  borderRadius: {
    sm: 4,
    md: 6,
    lg: 8,
    xl: 12,
    '2xl': 16,
    full: 9999,
  },

  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },

  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 6,
    },
    glow: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    glowViolet: {
      shadowColor: '#4F46E5',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
} as const;

export type LMThemeType = typeof LMTheme;
