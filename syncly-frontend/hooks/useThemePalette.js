import { useMemo } from 'react';

import { useAppState } from './useAppState';
import { darkPalette, lightPalette } from '../constants/theme';

export function useThemePalette() {
  const { settings } = useAppState();

  return useMemo(() => (settings.isDarkMode ? darkPalette : lightPalette), [settings.isDarkMode]);
}