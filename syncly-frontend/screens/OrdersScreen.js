import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import Header from '../components/Header';
import Badge from '../components/Badge';
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

function formatShortDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export default function OrdersScreen() {
  const palette = useThemePalette();
  const { orders } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 850);
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Header title="Orders" subtitle="Recent order activity with status tracking." />

        {initialLoading ? <SkeletonLoader height={42} /> : null}

        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No orders yet</Text>
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>Orders will appear here after they are created.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const tone = item.status === 'Completed' ? 'success' : item.status === 'Pending' ? 'warning' : 'danger';

            return (
              <Card style={styles.orderCard}>
                <View style={styles.orderTopRow}>
                  <View style={styles.orderCopy}>
                    <Text style={[styles.orderId, { color: palette.text }]}>{item.id}</Text>
                    <Text style={[styles.customerName, { color: palette.textMuted }]}>{item.customerName}</Text>
                  </View>
                  <Badge label={item.status} tone={tone} />
                </View>

                <Text style={[styles.products, { color: palette.textMuted }]} numberOfLines={2}>
                  {item.productNames.join(' • ')}
                </Text>

                <View style={styles.orderBottomRow}>
                  <Text style={[styles.meta, { color: palette.textMuted }]}>{formatShortDate(item.createdAt)}</Text>
                  <Text style={[styles.meta, { color: palette.textMuted }]}>{item.itemCount} items</Text>
                  <Text style={[styles.price, { color: palette.text }]}>{currency(item.totalPrice)}</Text>
                </View>
              </Card>
            );
          }}
          ListHeaderComponent={refreshing ? <SkeletonCard /> : null}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  orderCard: {
    paddingBottom: 2,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  orderCopy: {
    flex: 1,
  },
  orderId: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
  },
  products: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  orderBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  meta: {
    fontSize: 13,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 'auto',
  },
  emptyWrap: {
    paddingVertical: 44,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});