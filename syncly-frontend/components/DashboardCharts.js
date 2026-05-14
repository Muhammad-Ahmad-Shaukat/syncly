import { StyleSheet, Text, View } from 'react-native';

import { useThemePalette } from '../hooks/useThemePalette';

const DAY_LABELS = ['-6d', '-5d', '-4d', '-3d', '-2d', '-1d', 'Now'];

function SparkBars({ values, color, maxHint }) {
  const palette = useThemePalette();
  const max = Math.max(maxHint || 1, ...values, 1);
  return (
    <View style={styles.sparkRow}>
      {values.map((v, i) => {
        const h = Math.max(6, Math.round((v / max) * 72));
        return (
          <View key={i} style={styles.sparkCol}>
            <View style={[styles.sparkBar, { height: h, backgroundColor: color }]} />
            <Text style={[styles.sparkDay, { color: palette.textMuted }]}>{DAY_LABELS[i] ?? ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * @param {{ productSpark?: number[], orderSpark?: number[], productCount?: number, orderCount?: number }} props
 */
export default function DashboardCharts({ productSpark = [], orderSpark = [], productCount = 0, orderCount = 0 }) {
  const palette = useThemePalette();
  const p = productSpark.length ? productSpark : Array(7).fill(0);
  const o = orderSpark.length ? orderSpark : Array(7).fill(0);
  const pad = (arr) => {
    const out = [...arr];
    while (out.length < 7) out.push(0);
    return out.slice(-7);
  };
  const p7 = pad(p);
  const o7 = pad(o);

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.surface,
          shadowColor: palette.text,
        },
      ]}
    >
      <Text style={[styles.title, { color: palette.text }]}>Last 7 days</Text>
      <Text style={[styles.sub, { color: palette.textMuted }]}>New records per day.</Text>

      <Text style={[styles.chartLabel, { color: palette.text }]}>Products</Text>
      <SparkBars values={p7} color={palette.mint} maxHint={productCount} />

      <View style={{ height: 18 }} />

      <Text style={[styles.chartLabel, { color: palette.text }]}>Orders</Text>
      <SparkBars values={o7} color={palette.iris} maxHint={orderCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  chartLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sparkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 4,
  },
  sparkCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  sparkBar: {
    width: '78%',
    borderRadius: 8,
    minHeight: 6,
  },
  sparkDay: {
    fontSize: 10,
    fontWeight: '600',
  },
});
