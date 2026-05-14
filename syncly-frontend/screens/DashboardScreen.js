import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import Header from '../components/Header';
import SkeletonLoader, { SkeletonCard } from '../components/SkeletonLoader';
import DashboardCharts from '../components/DashboardCharts';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

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

export default function DashboardScreen({ navigation }) {
  const palette = useThemePalette();
  const { settings } = useAppState();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiRequest('/api/mobile/dashboard/metrics');
    if (ok && data?.data) setMetrics(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productCount = metrics?.productCount ?? 0;
  const lowStock = metrics?.lowStockCount ?? 0;
  const orderCount = metrics?.orderCount ?? 0;
  const health =
    metrics?.lastSyncByStore?.map((s) => `${s.name}: ${s.sync_status || 'unknown'}`).join(' · ') || 'No stores linked';

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Header title="Dashboard" subtitle="Live metrics" />

        {loading ? <SkeletonLoader height={42} /> : null}

        <View style={[styles.summaryGrid, settings.compactLayout && styles.summaryGridCompact]}>
          <SummaryCard label="Products" value={String(productCount)} accent={palette.mint} />
          <SummaryCard label="Low stock" value={String(lowStock)} accent={palette.coral} />
          <SummaryCard label="Orders" value={String(orderCount)} accent={palette.iris} />
        </View>

        {!loading && (metrics?.productSpark || metrics?.orderSpark) ? (
          <DashboardCharts
            productSpark={metrics?.productSpark}
            orderSpark={metrics?.orderSpark}
            productCount={productCount}
            orderCount={orderCount}
          />
        ) : null}

        <Card>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Sync</Text>
          <Text style={[styles.cardBody, { color: palette.textMuted }]}>{health}</Text>
          <View style={styles.ctaRow}>
            <Pressable style={[styles.ctaPill, { backgroundColor: palette.primary }]} onPress={() => navigation.navigate('Sync')}>
              <Text style={styles.ctaText}>Sync</Text>
            </Pressable>
            <Pressable style={[styles.ctaPill, { backgroundColor: palette.irisSoft }]} onPress={() => navigation.navigate('Stores')}>
              <Text style={[styles.ctaText, { color: palette.iris }]}>Stores</Text>
            </Pressable>
            <Pressable
              style={[styles.ctaPill, { backgroundColor: palette.mintSoft }]}
              onPress={() => navigation.navigate('Inventory', { screen: 'Add Product' })}
            >
              <Text style={[styles.ctaText, { color: palette.mint }]}>Add</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: palette.text }]}>Recent orders</Text>
          {(metrics?.recentOrders || []).length === 0 ? (
            <Text style={{ color: palette.textMuted }}>No orders yet.</Text>
          ) : (
            (metrics?.recentOrders || []).map((o, i, arr) => (
              <View
                key={o.id}
                style={[
                  styles.orderRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.border },
                ]}
              >
                <Text style={{ color: palette.text, fontWeight: '600' }}>{o.order_number || `#${o.id}`}</Text>
                <Text style={{ color: palette.textMuted, fontSize: 13 }}>{o.status}</Text>
              </View>
            ))
          )}
        </Card>

        {loading ? <SkeletonCard /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryGridCompact: {
    gap: 8,
  },
  summaryCard: {
    width: '47%',
    minWidth: 150,
  },
  accentBar: {
    width: 44,
    height: 4,
    borderRadius: 4,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  ctaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  ctaPill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  orderRow: {
    paddingVertical: 12,
  },
});
