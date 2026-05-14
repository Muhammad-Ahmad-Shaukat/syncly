import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

export default function CustomInput({ label, style, containerStyle, ...props }) {
  const palette = useThemePalette();

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: palette.fillInput ?? palette.surfaceSoft,
            color: palette.text,
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});
