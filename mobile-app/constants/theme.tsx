/**
 * Stellar-LumenMint — Mobile App Theme (v2.0)
 * Brand: Stellar-LumenMint
 * Theme: Cosmic Midnight
 */

export const LMTheme = {
  colors: {
    // Backgrounds
    bg: '#0D1117',
    surface: '#141B24',
    surface2: '#1C2433',
    surface3: '#243044',

    // Brand
    teal: '#00D4FF',
    tealDim: '#00A8CC',
    tealDark: '#0088A8',
    violet: '#7B6FFF',
    violetDim: '#5E52D4',
    pink: '#FF6B9D',

    // Text
    textPrimary: '#EEF2F7',
    textSecondary: '#8A9BB0',
    textMuted: '#6B7A8D',
    textLight: '#0D1117',

    // Structural
    border: '#1E2D3D',
    borderBright: '#00D4FF',
    divider: '#1E2D3D',

    // Status
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',

    // Gradient presets
    gradientPrimary: ['#00D4FF', '#7B6FFF'] as const,
    gradientViolet: ['#7B6FFF', '#5E52D4'] as const,
    gradientWarm: ['#00D4FF', '#FF6B9D', '#7B6FFF'] as const,
    gradientDark: ['#0D1117', '#0A1628'] as const,
    gradientCard: ['#141B24', '#1C2433'] as const,

    // Transparency helpers
    tealAlpha: (opacity: number) => `rgba(0, 212, 255, ${opacity})`,
    violetAlpha: (opacity: number) => `rgba(123, 111, 255, ${opacity})`,
    pinkAlpha: (opacity: number) => `rgba(255, 107, 157, ${opacity})`,
    whiteAlpha: (opacity: number) => `rgba(238, 242, 247, ${opacity})`,
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
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: '#00D4FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    glowViolet: {
      shadowColor: '#7B6FFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
  },
} as const;

export type LMThemeType = typeof LMTheme;
