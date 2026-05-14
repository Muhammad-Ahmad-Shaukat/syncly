import { StyleSheet, View } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

export default function Card({ children, style, contentStyle }) {
  const palette = useThemePalette();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          shadowColor: palette.text,
        },
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    elevation: 3,
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  content: {},
});
