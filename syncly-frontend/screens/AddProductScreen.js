import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

export default function AddProductScreen() {
  const palette = useThemePalette();
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadStores = useCallback(async () => {
    const { ok, data } = await apiRequest('/api/mobile/stores');
    if (ok && data?.data?.length) {
      setStores(data.data);
      setStoreId((current) => current || data.data[0].id);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  async function handleSubmit() {
    if (!storeId) {
      setError('Connect at least one store in the backend before creating products.');
      return;
    }
    if (!name.trim() || !price.trim() || !stock.trim()) {
      setError('Please fill in name, price, and stock.');
      return;
    }

    setError('');
    setSubmitting(true);
    const { ok, data } = await apiRequest('/api/mobile/products', {
      method: 'POST',
      body: {
        store_id: storeId,
        title: name.trim(),
        price: Number(price),
        inventory_quantity: parseInt(stock, 10),
        description: description.trim() || undefined,
        sku: sku.trim() || undefined,
        status: 'draft',
      },
    });
    setSubmitting(false);
    if (!ok) {
      setError(data?.error || 'Could not create product.');
      return;
    }
    setName('');
    setPrice('');
    setDescription('');
    setStock('');
    setSku('');
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Add Product" subtitle="Creates a canonical row and queues a connector dispatch job." />

        <Card>
          <Text style={[styles.label, { color: palette.text }]}>Store</Text>
          {stores.length === 0 ? (
            <Text style={{ color: palette.textMuted, marginBottom: 12 }}>No stores found for your account.</Text>
          ) : (
            <View style={styles.storeRow}>
              {stores.map((s) => {
                const active = storeId === s.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setStoreId(s.id)}
                    style={[
                      styles.storeChip,
                      {
                        borderColor: active ? palette.primary : palette.border,
                        backgroundColor: active ? palette.primarySoft : palette.surfaceSoft,
                      },
                    ]}
                  >
                    <Text style={{ color: palette.text, fontWeight: '600' }}>{s.store_name}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>{s.platform}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <CustomInput label="Product name" value={name} onChangeText={setName} placeholder="Minimal desk mat" />
          <CustomInput label="SKU (optional)" value={sku} onChangeText={setSku} placeholder="SKU-1001" />
          <CustomInput label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="49" />
          <CustomInput label="Description" value={description} onChangeText={setDescription} placeholder="Short description" multiline style={styles.multiline} />
          <CustomInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="12" />

          <View style={[styles.uploadBox, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}>
            <MaterialCommunityIcons name="image-plus" size={24} color={palette.primary} />
            <Text style={[styles.uploadTitle, { color: palette.text }]}>Images</Text>
            <Text style={[styles.uploadText, { color: palette.textMuted }]}>Upload flows can pipe through the backend storage layer later.</Text>
          </View>

          {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

          <CustomButton title="Submit product" onPress={handleSubmit} loading={submitting} />
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
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  storeChip: { borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 120 },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  uploadBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 18,
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  uploadText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  error: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
  },
});
