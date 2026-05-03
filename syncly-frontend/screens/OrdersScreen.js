import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import Header from '../components/Header';
import Badge from '../components/Badge';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

function currency(value, cur) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cur || 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export default function OrdersScreen() {
  const palette = useThemePalette();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { ok, data } = await apiRequest('/api/mobile/orders');
    if (ok && data?.data) setOrders(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Header title="Orders" subtitle="Latest orders across all connected stores." />

        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? null : (
              <Text style={{ color: palette.textMuted, textAlign: 'center', marginTop: 24 }}>No orders yet.</Text>
            )
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: palette.text }]}>{item.order_number || `Order #${item.id}`}</Text>
                  <Text style={[styles.sub, { color: palette.textMuted }]}>
                    {item.Store?.store_name} · {item.platform}
                  </Text>
                </View>
                <Badge label={item.status || 'unknown'} tone="neutral" />
              </View>
              <Text style={[styles.amount, { color: palette.text }]}>{currency(item.total_amount, item.currency)}</Text>
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  list: { paddingBottom: 40, gap: 10 },
  card: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '700' },
});
