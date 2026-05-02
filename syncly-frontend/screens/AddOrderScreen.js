import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import Badge from '../components/Badge';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AddOrderScreen() {
  const palette = useThemePalette();
  const { products, addOrder } = useAppState();
  const [customerName, setCustomerName] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedProducts = products.filter((product) => selectedProductIds.includes(product.id));
  const total = selectedProducts.reduce((sum, product) => sum + product.price, 0) * Math.max(Number(quantity) || 1, 1);

  function toggleProduct(id) {
    setSelectedProductIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function handleSubmit() {
    if (!customerName.trim() || selectedProducts.length === 0) {
      setError('Add a customer name and select at least one product.');
      return;
    }

    setError('');
    setSubmitting(true);

    setTimeout(() => {
      addOrder({
        customerName: customerName.trim(),
        status: 'Pending',
        totalPrice: total,
        itemCount: selectedProducts.length * Math.max(Number(quantity) || 1, 1),
        productNames: selectedProducts.map((product) => product.name),
      });

      setCustomerName('');
      setSelectedProductIds([]);
      setQuantity('1');
      setSubmitting(false);
    }, 700);
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Add Order" subtitle="Select products and create a clean mock order." />

        <Card>
          <CustomInput label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Jane Doe" />
          <CustomInput label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" placeholder="1" />

          <Text style={[styles.sectionLabel, { color: palette.text }]}>Select products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productScroll}>
            {products.map((product) => {
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
                  <Text style={[styles.productChipTitle, { color: palette.text }]}>{product.name}</Text>
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
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '800',
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
    fontWeight: '800',
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
    fontWeight: '900',
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