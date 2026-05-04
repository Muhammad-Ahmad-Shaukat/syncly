/**
 * Design tokens derived from DESIGN.md (Airbnb-style Syncly shell).
 * Numeric radii/spacing for React Native StyleSheet.
 */

export const colors = {
  primary: '#ff385c',
  primaryActive: '#e00b41',
  primaryDisabled: '#ffd1da',
  primaryErrorText: '#c13515',
  luxe: '#460479',
  ink: '#222222',
  body: '#3f3f3f',
  muted: '#6a6a6a',
  mutedSoft: '#929292',
  hairline: '#dddddd',
  hairlineSoft: '#ebebeb',
  canvas: '#ffffff',
  surfaceSoft: '#f7f7f7',
  surfaceStrong: '#f2f2f2',
  onPrimary: '#ffffff',
  legalLink: '#428bff',
  scrim: '#000000',
};

export const rounded = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 32,
  full: 9999,
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
};

export const typography = {
  displaySm: { fontSize: 20, fontWeight: '600', lineHeight: 24 },
  titleMd: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
  buttonMd: { fontSize: 16, fontWeight: '500', lineHeight: 20 },
};
