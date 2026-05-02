import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import Badge from '../components/Badge';
import SkeletonLoader, { SkeletonCard } from '../components/SkeletonLoader';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

const FILTERS = ['All', 'In Stock', 'Low Stock'];

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProductsScreen({ navigation }) {
  const palette = useThemePalette();
  const { products } = useAppState();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesQuery = [product.name, product.category, product.description].some((field) =>
        field.toLowerCase().includes(query.trim().toLowerCase())
      );

      const matchesFilter =
        filter === 'All' ||
        (filter === 'In Stock' && product.stock > 10) ||
        (filter === 'Low Stock' && product.stock <= 10);

      return matchesQuery && matchesFilter;
    });
  }, [filter, products, query]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 850);
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Header title="Products" subtitle="Search, filter, and review stock levels." />

        <CustomInput placeholder="Search products..." value={query} onChangeText={setQuery} />

        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            const active = filter === item;

            return (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.primary : palette.surfaceSoft,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#fff' : palette.text, fontWeight: '700' }}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {initialLoading ? <SkeletonLoader height={42} /> : null}

        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="package-variant-remove" size={34} color={palette.textMuted} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No products found</Text>
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>Try a different search term or filter.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.productCard}>
              <Image source={{ uri: item.image }} style={styles.productImage} />
              <View style={styles.productBody}>
                <View style={styles.productTopRow}>
                  <View style={styles.productCopy}>
                    <Text style={[styles.productName, { color: palette.text }]}>{item.name}</Text>
                    <Text style={[styles.productCategory, { color: palette.textMuted }]}>{item.category}</Text>
                  </View>
                  <Badge label={item.stock > 10 ? 'In stock' : 'Low stock'} tone={item.stock > 10 ? 'success' : 'warning'} />
                </View>

                <Text style={[styles.productDescription, { color: palette.textMuted }]} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.productMetaRow}>
                  <Text style={[styles.price, { color: palette.text }]}>{currency(item.price)}</Text>
                  <Text style={[styles.stock, { color: palette.textMuted }]}>Stock {item.stock}</Text>
                </View>
              </View>
            </Card>
          )}
          ListHeaderComponent={refreshing ? <SkeletonCard /> : null}
        />

        <Pressable style={[styles.fab, { backgroundColor: palette.primary }]} onPress={() => navigation.navigate('Add Product')}>
          <MaterialCommunityIcons name="plus" size={26} color="#fff" />
        </Pressable>
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
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  productCard: {
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  productBody: {
    paddingTop: 14,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  productCopy: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '900',
  },
  stock: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});