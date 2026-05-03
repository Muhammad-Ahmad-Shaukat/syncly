import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import Badge from '../components/Badge';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AddOrderScreen() {
  const palette = useThemePalette();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([apiRequest('/api/mobile/stores'), apiRequest('/api/mobile/products')]);
    if (s.ok && s.data?.data?.length) {
      setStores(s.data.data);
      setStoreId((cur) => cur || s.data.data[0].id);
    }
    if (p.ok && p.data?.data) setProducts(p.data.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredProducts = storeId ? products.filter((pr) => pr.store_id === storeId) : products;

  const selectedProducts = filteredProducts.filter((product) => selectedProductIds.includes(product.id));
  const total =
    selectedProducts.reduce((sum, product) => sum + Number(product.price || 0), 0) * Math.max(Number(quantity) || 1, 1);

  function toggleProduct(id) {
    setSelectedProductIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleSubmit() {
    if (!storeId || !customerName.trim() || selectedProducts.length === 0) {
      setError('Pick a store, customer name, and at least one product.');
      return;
    }
    setError('');
    setSubmitting(true);
    const { ok, data } = await apiRequest('/api/mobile/orders', {
      method: 'POST',
      body: {
        store_id: storeId,
        order_number: `${customerName.trim().slice(0, 24)}-${Date.now()}`,
        total_amount: total,
      },
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || 'Could not create order.');
      return;
    }
    setCustomerName('');
    setSelectedProductIds([]);
    setQuantity('1');
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Add Order" subtitle="Creates a backend order row and queues connector dispatch." />

        <Card>
          <Text style={[styles.sectionLabel, { color: palette.text }]}>Store</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productScroll}>
            {stores.map((s) => {
              const selected = storeId === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => {
                    setStoreId(s.id);
                    setSelectedProductIds([]);
                  }}
                  style={[
                    styles.productChip,
                    {
                      backgroundColor: selected ? palette.primarySoft : palette.surfaceSoft,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.productChipTitle, { color: palette.text }]}>{s.store_name}</Text>
                  <Text style={[styles.productChipSubtitle, { color: palette.textMuted }]}>{s.platform}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <CustomInput label="Customer / label" value={customerName} onChangeText={setCustomerName} placeholder="Jane Doe" />
          <CustomInput label="Quantity multiplier" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" />

          <Text style={[styles.sectionLabel, { color: palette.text }]}>Products (this store)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productScroll}>
            {filteredProducts.map((product) => {
              const selected = selectedProductIds.includes(product.id);

              return (
                <Pressable
                  key={product.id}
                  onPress={() => toggleProduct(product.id)}
                  style={[
                    styles.productChip,
                    {
                      backgroundColor: selected ? palette.primarySoft : palette.surfaceSoft,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.productChipTitle, { color: palette.text }]}>{product.title}</Text>
                  <Text style={[styles.productChipSubtitle, { color: palette.textMuted }]}>{currency(product.price)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {selectedProducts.length > 0 ? (
            <View style={[styles.summaryBox, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
              <Text style={[styles.summaryLabel, { color: palette.textMuted }]}>Order summary</Text>
              <Text style={[styles.summaryValue, { color: palette.text }]}>{currency(total)}</Text>
              <View style={styles.badgeRow}>
                <Badge label={`${selectedProducts.length} products`} tone="neutral" />
                <Badge label={`${Math.max(Number(quantity) || 1, 1)} qty`} tone="neutral" />
              </View>
            </View>
          ) : null}

          {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

          <CustomButton title="Create order" onPress={handleSubmit} loading={submitting} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 10,
  },
  productScroll: {
    gap: 10,
    paddingBottom: 6,
    marginBottom: 14,
  },
  productChip: {
    width: 160,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  productChipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  productChipSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  error: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
  },
});
