import { Platform } from 'react-native';

export const palette = {
  brand: '#E7643F',
  brandPressed: '#C94F2E',
  brandSoft: '#FFE3DA',
  canvas: '#FCFBF9',
  surface: '#FFFFFF',
  surfaceRaised: '#F4F0EB',
  ink: '#1A1714',
  ink2: '#4A4540',
  ink3: '#6B6560',
  ink4: '#8A8178',
  ink5: '#BEB4AA',
  border: '#DED5CB',
  borderStrong: '#CDBFB3',
  scrim: 'rgba(26,23,20,0.38)',
  success: '#168A61',
  successBg: '#DCF7E8',
  warning: '#D98622',
  warningBg: '#FFF0D7',
  danger: '#D64C5A',
  dangerBg: '#FFE3E6',
  info: '#3178C6',
  infoBg: '#E1EFFF',
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
    alt: '#EEE8E0',
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
    100: '#FFD0C2',
    300: '#F59A7C',
    400: '#ED7C59',
    500: palette.brand,
    600: palette.brandPressed,
    700: '#A83E25',
  },
  sage: {
    50: '#DDF5EF',
    100: '#BEEBDD',
    300: '#6BC8B4',
    400: '#3EAB96',
    500: '#208F7C',
    600: '#137864',
    700: '#0D5E4E',
  },
  sand: {
    50: palette.warningBg,
    100: '#FFE0A7',
    300: '#F8C96A',
    400: '#F2A93B',
    500: '#F2A93B',
    600: '#C77C16',
  },
  warning: {
    base: palette.warning,
    soft: palette.warningBg,
    text: palette.warning,
    strong: '#A95E0D',
  },
  danger: {
    base: palette.danger,
    soft: palette.dangerBg,
    text: palette.danger,
    strong: '#B53042',
  },
  success: {
    base: palette.success,
    soft: palette.successBg,
    text: palette.success,
    strong: '#0D6B49',
  },
  info: {
    base: palette.info,
    soft: palette.infoBg,
    text: palette.info,
  },
  border: {
    subtle: '#EEE7E0',
    default: palette.border,
    strong: palette.borderStrong,
    seniorStrong: '#C8BFB5',
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
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
});

const fontSansSemiBold = fontSans;
const fontSerif = fontSans;

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
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
  shadow2: {
    shadowColor,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  shadow3: {
    shadowColor,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  card: {
    shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
  elevated: {
    shadowColor,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  floating: {
    shadowColor,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  sheet: {
    shadowColor,
    shadowOpacity: 0.10,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 4,
  },
} as const;

export const componentSizes = {
  primaryButtonHeight: 52,
  smallButtonHeight: 42,
  textFieldHeight: 50,
  searchFieldHeight: 52,
  filterChipHeight: 36,
  bottomNavHeight: 76,
  bottomNavActiveItem: 40,
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
