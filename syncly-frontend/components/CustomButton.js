import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

export default function CustomButton({ title, onPress, loading = false, tone = 'primary', style, disabled = false }) {
  const palette = useThemePalette();

  const colors = {
    primary: { backgroundColor: palette.primary, textColor: '#fff' },
    secondary: { backgroundColor: palette.surfaceSoft, textColor: palette.text },
    danger: { backgroundColor: palette.danger, textColor: '#fff' },
  };

  const selected = colors[tone] || colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: selected.backgroundColor, opacity: disabled ? 0.65 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={selected.textColor} /> : <Text style={[styles.buttonText, { color: selected.textColor }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});