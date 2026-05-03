import { colors, rounded, spacing, typography } from './designTokens';

export { colors, rounded, spacing, typography };

export const lightPalette = {
  background: colors.surfaceSoft,
  surface: colors.canvas,
  surfaceSoft: colors.surfaceSoft,
  primary: colors.primary,
  primarySoft: colors.primaryDisabled,
  accent: colors.legalLink,
  text: colors.ink,
  textMuted: colors.muted,
  border: colors.hairline,
  success: '#16a34a',
  warning: '#f59e0b',
  danger: colors.primaryErrorText,
  radiusSm: rounded.sm,
  radiusMd: rounded.md,
  radiusLg: rounded.lg,
  radiusFull: rounded.full,
  spaceXs: spacing.xs,
  spaceSm: spacing.sm,
  spaceMd: spacing.md,
  spaceBase: spacing.base,
  spaceLg: spacing.lg,
};

export const darkPalette = {
  background: '#0b1220',
  surface: '#121b2d',
  surfaceSoft: '#172238',
  primary: '#ff6b8a',
  primarySoft: '#3a1f2e',
  accent: colors.legalLink,
  text: '#f7f7f7',
  textMuted: colors.mutedSoft,
  border: '#22304a',
  success: '#4ade80',
  warning: '#fbbf24',
  danger: '#fb7185',
  radiusSm: rounded.sm,
  radiusMd: rounded.md,
  radiusLg: rounded.lg,
  radiusFull: rounded.full,
  spaceXs: spacing.xs,
  spaceSm: spacing.sm,
  spaceMd: spacing.md,
  spaceBase: spacing.base,
  spaceLg: spacing.lg,
};

export const drawerWidth = 284;
