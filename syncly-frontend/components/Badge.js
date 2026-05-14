import { StyleSheet, Text, View } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

export default function Badge({ label, tone = 'neutral' }) {
  const palette = useThemePalette();

  const map = {
    success: { bg: palette.successSoft, fg: palette.success },
    warning: { bg: palette.warningSoft, fg: palette.warning },
    danger: { bg: palette.dangerSoft, fg: palette.danger },
    neutral: { bg: palette.surfaceSoft, fg: palette.textMuted },
  };

  const selected = map[tone] || map.neutral;

  return (
    <View style={[styles.badge, { backgroundColor: selected.bg }]}>
      <Text style={[styles.text, { color: selected.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
