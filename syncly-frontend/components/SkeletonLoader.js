import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

export default function SkeletonLoader({ height = 18, width = '100%', style }) {
  const palette = useThemePalette();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.block, { height, width, backgroundColor: palette.primarySoft, opacity }, style]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <SkeletonLoader height={150} />
      <View style={styles.spacer} />
      <SkeletonLoader width="62%" />
      <View style={styles.smallSpacer} />
      <SkeletonLoader width="40%" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
  },
  block: {
    borderRadius: 12,
  },
  spacer: {
    height: 12,
  },
  smallSpacer: {
    height: 8,
  },
});