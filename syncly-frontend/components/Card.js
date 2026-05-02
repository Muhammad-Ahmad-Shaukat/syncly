import { StyleSheet, View } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';

import { useThemePalette } from '../hooks/useThemePalette';

export default function Card({ children, style, contentStyle }) {
  const palette = useThemePalette();

  return (
    <PaperCard style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }, style]} mode="elevated">
      <PaperCard.Content style={[styles.content, contentStyle]}>
        <View>{children}</View>
      </PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  content: {
    paddingVertical: 14,
  },
});