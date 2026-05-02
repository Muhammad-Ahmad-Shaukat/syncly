import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import Header from '../components/Header';
import SkeletonLoader, { SkeletonCard } from '../components/SkeletonLoader';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function SummaryCard({ label, value, accent }) {
  const palette = useThemePalette();

  return (
    <Card style={styles.summaryCard}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: palette.text }]}>{value}</Text>
    </Card>
  );
}

export default function DashboardScreen() {
  const palette = useThemePalette();
  const { products, orders } = useAppState();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 550);
    return () => clearTimeout(timer);
  }, []);

  const revenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const chartValues = [12, 7, 10, 14, 18, 11, 16];
  const maxValue = Math.max(...chartValues, 1);

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Header title="Dashboard" subtitle="Track products, orders, and revenue at a glance." />

        <View style={styles.summaryGrid}>
          <SummaryCard label="Total Products" value={String(products.length)} accent={palette.primary} />
          <SummaryCard label="Total Orders" value={String(orders.length)} accent={palette.accent} />
          <SummaryCard label="Revenue" value={currency(revenue)} accent={palette.success} />
        </View>

        <Card>
          <Header title="Weekly activity" subtitle="A simple mock chart for recent store activity." />
          <View style={styles.chartWrap}>
            {chartValues.map((value, index) => (
              <View key={`${index}-${value}`} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${(value / maxValue) * 100}%`, backgroundColor: palette.primary }]} />
                </View>
                <Text style={[styles.barLabel, { color: palette.textMuted }]}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text>
              </View>
            ))}
          </View>
        </Card>

        {initialLoading ? <SkeletonCard /> : null}

        <Card>
          <Text style={[styles.noteTitle, { color: palette.text }]}>Quick insight</Text>
          <Text style={[styles.noteText, { color: palette.textMuted }]}>
            Catalog health looks strong. Use the Products screen to review low-stock items and keep the storefront fresh.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 56) / 2;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: cardWidth,
  },
  accentBar: {
    width: 44,
    height: 6,
    borderRadius: 999,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  chartWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    gap: 10,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    backgroundColor: '#dbe5f8',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 16,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
});