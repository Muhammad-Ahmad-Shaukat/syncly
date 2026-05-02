import { StyleSheet, Text, View } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

export default function Badge({ label, tone = 'neutral' }) {
  const palette = useThemePalette();

  const colors = {
    success: { backgroundColor: '#dcfce7', color: palette.success },
    warning: { backgroundColor: '#fef3c7', color: palette.warning },
    danger: { backgroundColor: '#fee2e2', color: palette.danger },
    neutral: { backgroundColor: palette.surfaceSoft, color: palette.textMuted },
  };

  const selected = colors[tone] || colors.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: selected.backgroundColor }]}>
      <Text style={[styles.text, { color: selected.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});