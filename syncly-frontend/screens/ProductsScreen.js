import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import Badge from '../components/Badge';
import SkeletonLoader, { SkeletonCard } from '../components/SkeletonLoader';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

const PLATFORMS = [
  { id: 'all', label: 'All' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'woocommerce', label: 'Woo' },
];

function currency(value) {
  if (value == null || value === '') return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function ProductsScreen({ navigation }) {
  const palette = useThemePalette();
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStock, setBulkStock] = useState('');

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (query.trim()) qs.set('search', query.trim());
    if (platform !== 'all') qs.set('platform', platform);
    if (lowOnly) qs.set('low_stock', '1');
    const path = `/api/mobile/products?${qs.toString()}`;
    const { ok, data } = await apiRequest(path);
    if (ok && data?.data) setProducts(data.data);
    setLoading(false);
  }, [query, platform, lowOnly]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filteredLocal = useMemo(() => products, [products]);

  async function applyBulk() {
    const ids = [...selected];
    if (!ids.length) {
      setBulkOpen(false);
      return;
    }
    const inv = bulkStock === '' ? undefined : parseInt(bulkStock, 10);
    const updates = {};
    if (inv !== undefined && !Number.isNaN(inv)) updates.inventory_quantity = inv;
    if (!Object.keys(updates).length) {
      setBulkOpen(false);
      return;
    }
    await apiRequest('/api/mobile/products/bulk', {
      method: 'POST',
      body: { product_ids: ids, updates },
    });
    setSelected(new Set());
    setBulkOpen(false);
    load();
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Header title="Inventory" subtitle="Unified catalog across connected stores." />

        <CustomInput placeholder="Search title or SKU…" value={query} onChangeText={setQuery} />

        <View style={styles.filterRow}>
          {PLATFORMS.map((p) => {
            const active = platform === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlatform(p.id)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.primary : palette.surfaceSoft,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={{ color: active ? '#fff' : palette.text, fontWeight: '600' }}>{p.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setLowOnly((v) => !v)}
            style={[
              styles.filterChip,
              {
                backgroundColor: lowOnly ? palette.warning : palette.surfaceSoft,
                borderColor: lowOnly ? palette.warning : palette.border,
              },
            ]}
          >
            <Text style={{ color: lowOnly ? '#111' : palette.text, fontWeight: '600' }}>Low stock</Text>
          </Pressable>
        </View>

        {selected.size > 0 ? (
          <View style={styles.bulkBar}>
            <Text style={{ color: palette.text, fontWeight: '600' }}>{selected.size} selected</Text>
            <CustomButton title="Bulk stock…" onPress={() => setBulkOpen(true)} style={styles.bulkBtn} />
            <CustomButton title="Clear" tone="secondary" onPress={() => setSelected(new Set())} style={styles.bulkBtn} />
          </View>
        ) : null}

        {loading ? <SkeletonLoader height={42} /> : null}

        <FlatList
          data={filteredLocal}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="package-variant-remove" size={34} color={palette.textMuted} />
              <Text style={[styles.emptyTitle, { color: palette.text }]}>No products</Text>
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>Connect a store on the backend or adjust filters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const qty = item.inventory_quantity ?? 0;
            const low = qty <= 10;
            const checked = selected.has(item.id);
            const uri =
              resolveMediaUrl(item.image_url) ||
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';
            return (
              <Card style={styles.productCard}>
                <Pressable
                  onPress={() => toggleSelect(item.id)}
                  style={[styles.check, { borderColor: palette.border, backgroundColor: checked ? palette.primarySoft : palette.surface }]}
                >
                  <MaterialCommunityIcons name={checked ? 'check' : 'checkbox-blank-outline'} size={22} color={palette.text} />
                </Pressable>
                <Pressable onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}>
                  <Image source={{ uri }} style={styles.productImage} />
                  <View style={styles.productBody}>
                    <View style={styles.productTopRow}>
                      <View style={styles.productCopy}>
                        <Text style={[styles.productName, { color: palette.text }]}>{item.title}</Text>
                        <Text style={[styles.productCategory, { color: palette.textMuted }]}>
                          {item.store?.store_name || 'Store'} · {item.platform}
                        </Text>
                      </View>
                      <Badge label={low ? 'Low stock' : 'In stock'} tone={low ? 'warning' : 'success'} />
                    </View>
                    <View style={styles.productMetaRow}>
                      <Text style={[styles.price, { color: palette.text }]}>{currency(item.price)}</Text>
                      <Text style={[styles.stock, { color: palette.textMuted }]}>Stock {qty}</Text>
                    </View>
                  </View>
                </Pressable>
              </Card>
            );
          }}
          ListHeaderComponent={refreshing ? <SkeletonCard /> : null}
        />

        <Pressable style={[styles.fab, { backgroundColor: palette.primary }]} onPress={() => navigation.navigate('Add Product')}>
          <MaterialCommunityIcons name="plus" size={26} color="#fff" />
        </Pressable>

        <Modal visible={bulkOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Text style={[styles.modalTitle, { color: palette.text }]}>Set stock for {selected.size} items</Text>
              <CustomInput label="New quantity" value={bulkStock} onChangeText={setBulkStock} keyboardType="number-pad" />
              <View style={styles.modalActions}>
                <CustomButton title="Cancel" tone="secondary" onPress={() => setBulkOpen(false)} style={{ flex: 1 }} />
                <CustomButton title="Apply" onPress={applyBulk} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
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
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  bulkBtn: { paddingHorizontal: 12, minHeight: 40 },
  listContent: {
    paddingBottom: 120,
  },
  productCard: {
    overflow: 'hidden',
    position: 'relative',
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
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
    paddingRight: 36,
  },
  productName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 13,
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '700',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10 },
});
