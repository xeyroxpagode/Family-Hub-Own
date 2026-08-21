import { Platform } from 'react-native';

export const palette = {
  brand: '#C96B45',
  brandPressed: '#B05B38',
  brandSoft: '#F6EDE8',
  canvas: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceRaised: '#FAF8F6',
  ink: '#1A1816',
  ink2: '#4A4542',
  ink3: '#6E6B66',
  ink4: '#9E9B96',
  ink5: '#C8C5BF',
  border: 'rgba(26,24,22,0.09)',
  borderStrong: 'rgba(26,24,22,0.18)',
  scrim: 'rgba(26,24,22,0.45)',
  success: '#2D7A51',
  successBg: '#E8F4ED',
  warning: '#B57A1A',
  warningBg: '#FEF4E2',
  danger: '#C23A30',
  dangerBg: '#FCE8E7',
  info: '#1A6FA8',
  infoBg: '#E6F1FA',
} as const;

export const colors = {
  brand: palette.brand,
  brandPressed: palette.brandPressed,
  brandSoft: palette.brandSoft,
  canvas: palette.canvas,
  ink: palette.ink,
  ink2: palette.ink2,
  ink3: palette.ink3,
  ink4: palette.ink4,
  ink5: palette.ink5,
  background: {
    base: palette.canvas,
    soft: palette.surfaceRaised,
    alt: '#EFEBE6',
    cream: palette.brandSoft,
  },
  surface: {
    card: palette.surface,
    soft: palette.surfaceRaised,
    elevated: palette.surface,
    raised: palette.surfaceRaised,
    muted: palette.surfaceRaised,
    glass: 'rgba(255,255,255,0.82)',
    overlay: palette.scrim,
    overlayStrong: 'rgba(26,24,22,0.78)',
  },
  text: {
    primary: palette.ink,
    secondary: palette.ink2,
    tertiary: palette.ink3,
    muted: palette.ink4,
    inverse: '#FFFFFF',
    disabled: 'rgba(26,24,22,0.42)',
  },
  terracotta: {
    50: palette.brandSoft,
    100: '#EFD9CF',
    300: '#DFA98F',
    400: '#D18662',
    500: palette.brand,
    600: palette.brandPressed,
    700: '#914930',
  },
  sage: {
    50: palette.successBg,
    100: '#D8E8DE',
    300: '#9EC5AE',
    400: '#6FA381',
    500: palette.success,
    600: '#246744',
    700: '#1D5538',
  },
  sand: {
    50: palette.warningBg,
    100: '#F3DFB9',
    300: '#D7B66B',
    400: '#C6963A',
    500: palette.warning,
    600: '#9B6615',
  },
  warning: {
    base: palette.warning,
    soft: palette.warningBg,
    text: palette.warning,
    strong: '#8F5F13',
  },
  danger: {
    base: palette.danger,
    soft: palette.dangerBg,
    text: palette.danger,
    strong: '#9C2F27',
  },
  success: {
    base: palette.success,
    soft: palette.successBg,
    text: palette.success,
    strong: '#235F3F',
  },
  info: {
    base: palette.info,
    soft: palette.infoBg,
    text: palette.info,
  },
  border: {
    subtle: 'rgba(26,24,22,0.07)',
    default: palette.border,
    strong: palette.borderStrong,
    seniorStrong: 'rgba(26,24,22,0.24)',
  },
  shadow: {
    soft: 'rgba(26,24,22,0.07)',
    default: 'rgba(26,24,22,0.10)',
    floating: 'rgba(26,24,22,0.12)',
  },
} as const;

export const darkColors = {
  background: {
    base: '#1A1816',
    alt: '#25221F',
  },
  surface: {
    card: '#2A2622',
    elevated: '#312D29',
    overlay: 'rgba(0,0,0,0.65)',
  },
  text: {
    primary: '#F7F5F2',
    secondary: '#DFDAD3',
    tertiary: '#B8B1AA',
    muted: '#9E9B96',
    inverse: palette.ink,
  },
  border: {
    default: 'rgba(247,245,242,0.12)',
    strong: 'rgba(247,245,242,0.22)',
  },
} as const;

const fontSans = Platform.select({
  ios: 'DMSans_500Medium',
  android: 'DMSans_500Medium',
  default: 'DMSans_500Medium',
});

const fontSansSemiBold = Platform.select({
  ios: 'DMSans_600SemiBold',
  android: 'DMSans_600SemiBold',
  default: 'DMSans_600SemiBold',
});

const fontSerif = Platform.select({
  ios: 'DMSerifDisplay_400Regular',
  android: 'DMSerifDisplay_400Regular',
  default: 'DMSerifDisplay_400Regular',
});

const systemMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const typography = {
  hero: {
    fontFamily: fontSerif,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '400',
    letterSpacing: 0,
  },
  title1: {
    fontFamily: fontSansSemiBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: 0,
  },
  title2: {
    fontFamily: fontSansSemiBold,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: 0,
  },
  title3: {
    fontFamily: fontSansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: 0,
  },
  bodyLarge: {
    fontFamily: fontSans,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '500',
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontSans,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: fontSans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontSans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0,
  },
  micro: {
    fontFamily: fontSansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0,
  },
  mono: {
    fontFamily: systemMono,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: 0,
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
  xs: 8,
  sm: 10,
  md: 14,
  button: 16,
  search: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  '2xl': 28,
  pill: 9999,
  full: 9999,
} as const;

export const borders = {
  default: {
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  strong: {
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
} as const;

const shadowColor = palette.ink;

export const shadows = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  shadow1: {
    shadowColor,
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  shadow2: {
    shadowColor,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  shadow3: {
    shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  card: {
    shadowColor,
    shadowOpacity: 0.07,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  elevated: {
    shadowColor,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  floating: {
    shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheet: {
    shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
} as const;

export const componentSizes = {
  primaryButtonHeight: 52,
  smallButtonHeight: 42,
  textFieldHeight: 50,
  searchFieldHeight: 52,
  filterChipHeight: 36,
  bottomNavHeight: 68,
  bottomNavActiveItem: 44,
  fab: 56,
  toggleWidth: 51,
  toggleHeight: 31,
  toggleThumb: 27,
} as const;

export const iconSizes = {
  navbar: 24,
  header: 22,
  action: 22,
  small: 18,
} as const;

export const glass = {
  light: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderColor: 'rgba(26,24,22,0.07)',
    blurIntensity: 24,
  },
  warm: {
    backgroundColor: 'rgba(250,248,246,0.84)',
    borderColor: 'rgba(26,24,22,0.09)',
    blurIntensity: 20,
  },
  strong: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(26,24,22,0.09)',
    blurIntensity: 30,
  },
} as const;

export const motion = {
  press: 80,
  tap: 80,
  navActive: 150,
  fast: 150,
  toggle: 200,
  fade: 200,
  screenEnter: 240,
  screenExit: 200,
  normal: 240,
  sheet: 300,
  success: 420,
  max: 500,
  scale: {
    button: 0.97,
    icon: 0.97,
    card: 0.99,
    tab: 0.97,
  },
  spring: {
    press: { damping: 20, stiffness: 420, mass: 0.65 },
    release: { damping: 18, stiffness: 300, mass: 0.8 },
  },
} as const;

export const touchTargets = {
  normal: 44,
  senior: 56,
  fab: 56,
  fabSenior: 64,
} as const;

export const theme = {
  palette,
  colors,
  darkColors,
  typography,
  seniorTypography,
  spacing,
  radius,
  borders,
  shadows,
  componentSizes,
  iconSizes,
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
