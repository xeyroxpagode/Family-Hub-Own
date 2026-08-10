import { Platform } from 'react-native';

export const colors = {
  background: {
    base: '#FBFAF8',
    soft: '#F7F3EE',
    alt: '#F5F1EB',
    cream: '#F7EFE6',
  },
  surface: {
    card: '#FFFFFF',
    soft: '#FFFDF9',
    elevated: '#FFFFFF',
    muted: '#F5F1EB',
    glass: 'rgba(255, 255, 255, 0.72)',
    overlay: 'rgba(45, 42, 38, 0.50)',
    overlayStrong: 'rgba(45, 42, 38, 0.85)',
  },
  text: {
    primary: '#1A1714',
    secondary: '#4A4540',
    tertiary: '#6B6560',
    muted: '#8A8178',
    inverse: '#FFFFFF',
    disabled: 'rgba(26, 23, 20, 0.42)',
  },
  terracotta: {
    50: '#FAF3ED',
    100: '#F2E0D4',
    300: '#E3BAA0',
    400: '#D49B78',
    500: '#C17F59',
    600: '#A86B45',
    700: '#8F5735',
  },
  sage: {
    50: '#EEF4EF',
    100: '#D8E5DA',
    300: '#B0C8B3',
    400: '#94B097',
    500: '#7A9B7E',
    600: '#5F7F63',
    700: '#49684D',
  },
  sand: {
    50: '#FFF8EC',
    100: '#F2E6CC',
    300: '#E8D09A',
    400: '#DFBC72',
    500: '#D4A853',
    600: '#BD8F38',
  },
  warning: {
    base: '#D4944A',
    soft: '#F7EBDB',
    text: '#B57930',
    strong: '#9D6624',
  },
  danger: {
    base: '#C46B6B',
    soft: '#F5E2E2',
    text: '#A85050',
    strong: '#884040',
  },
  success: {
    base: '#6B9E7A',
    soft: '#E1EFE5',
    text: '#558563',
    strong: '#3F704D',
  },
  info: {
    base: '#7A8B9B',
    soft: '#E4E9ED',
    text: '#5F707F',
  },
  border: {
    subtle: 'rgba(56, 45, 38, 0.10)',
    default: '#E8E3DC',
    strong: '#D5CFC7',
    seniorStrong: '#B5AFA5',
  },
  shadow: {
    soft: 'rgba(36, 31, 28, 0.08)',
    default: 'rgba(36, 31, 28, 0.10)',
    floating: 'rgba(36, 31, 28, 0.14)',
  },
} as const;

export const darkColors = {
  background: {
    base: '#1C1A17',
    alt: '#24211E',
  },
  surface: {
    card: '#2C2925',
    elevated: '#332F2B',
    overlay: 'rgba(0, 0, 0, 0.65)',
  },
  text: {
    primary: '#F8F3EC',
    secondary: '#D6CEC4',
    tertiary: '#AFA79E',
    muted: '#8F877F',
    inverse: '#1A1714',
  },
  border: {
    default: '#3D3933',
    strong: '#4F4A43',
  },
} as const;

const systemSans = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: undefined,
});

const systemMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const typography = {
  hero: {
    fontFamily: systemSans,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title1: {
    fontFamily: systemSans,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: 0,
  },
  title2: {
    fontFamily: systemSans,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  title3: {
    fontFamily: systemSans,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  bodyLarge: {
    fontFamily: systemSans,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
  },
  body: {
    fontFamily: systemSans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  bodySmall: {
    fontFamily: systemSans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  caption: {
    fontFamily: systemSans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  micro: {
    fontFamily: systemSans,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  mono: {
    fontFamily: systemMono,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
} as const;

export const seniorTypography = {
  hero: { fontSize: 44, lineHeight: 52 },
  title1: { fontSize: 36, lineHeight: 44 },
  title2: { fontSize: 30, lineHeight: 38 },
  title3: { fontSize: 24, lineHeight: 32 },
  bodyLarge: { fontSize: 22, lineHeight: 30 },
  body: { fontSize: 18, lineHeight: 26 },
  bodySmall: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 20 },
  micro: { fontSize: 13, lineHeight: 18 },
} as const;

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
} as const;

export const radius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const shadows = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  card: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  elevated: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  floating: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#241F1C',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
} as const;

export const glass = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.55)',
    blurIntensity: 24,
  },
  warm: {
    backgroundColor: 'rgba(251, 250, 248, 0.78)',
    borderColor: 'rgba(56, 45, 38, 0.08)',
    blurIntensity: 20,
  },
  strong: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderColor: 'rgba(56, 45, 38, 0.10)',
    blurIntensity: 30,
  },
} as const;

export const motion = {
  tap: 90,
  fast: 160,
  normal: 240,
  sheet: 320,
  success: 420,
  max: 500,
  scale: {
    button: 0.98,
    icon: 0.95,
    card: 0.99,
    tab: 0.97,
  },
  spring: {
    press: { damping: 22, stiffness: 360, mass: 0.7 },
    release: { damping: 16, stiffness: 280, mass: 0.8 },
  },
} as const;

export const touchTargets = {
  normal: 44,
  senior: 56,
  fab: 56,
  fabSenior: 64,
} as const;

export const theme = {
  colors,
  darkColors,
  typography,
  seniorTypography,
  spacing,
  radius,
  shadows,
  glass,
  motion,
  touchTargets,
} as const;

export type AppTheme = typeof theme;
export type ColorTokens = typeof colors;
export type TypographyVariant = keyof typeof typography;
export type RadiusToken = keyof typeof radius;
export type SpacingToken = keyof typeof spacing;
export type ShadowToken = keyof typeof shadows;
