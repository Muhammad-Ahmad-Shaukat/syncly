/**
 * Minimal layout tokens + vivid accents (indigo / coral / mint).
 */

export const colors = {
  // Core
  ink: '#0f172a',
  inkMuted: '#475569',
  canvas: '#ffffff',
  canvasTint: '#f8fafc',
  hairline: 'rgba(15, 23, 42, 0.06)',

  // Brand & accents
  primary: '#6366f1',
  primaryHover: '#4f46e5',
  primarySoft: '#e0e7ff',
  coral: '#fb7185',
  coralSoft: '#ffe4e6',
  mint: '#2dd4bf',
  mintSoft: '#ccfbf1',
  iris: '#a78bfa',
  irisSoft: '#ede9fe',
  amber: '#fbbf24',
  amberSoft: '#fef3c7',

  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  onPrimary: '#ffffff',
  legalLink: '#38bdf8',
};

export const rounded = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const spacing = {
  xxs: 2,
  xs: 6,
  sm: 10,
  md: 14,
  base: 18,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
};

export const typography = {
  displaySm: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  titleMd: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  bodyMd: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySm: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  buttonMd: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
};
