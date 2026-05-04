import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

export default function ProductDetailScreen({ route, navigation }) {
  const palette = useThemePalette();
  const { productId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    const { ok, data } = await apiRequest(`/api/mobile/products/${productId}`);
    if (ok && data?.data) {
      const p = data.data;
      setProduct(p);
      setPrice(String(p.price ?? ''));
      setStock(String(p.inventory_quantity ?? ''));
      setStatus(String(p.status ?? ''));
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setError('');
    setSaving(true);
    const body = {};
    if (price !== '') body.price = Number(price);
    if (stock !== '') body.inventory_quantity = parseInt(stock, 10);
    if (status.trim()) body.status = status.trim();
    const { ok, data } = await apiRequest(`/api/mobile/products/${productId}`, {
      method: 'PATCH',
      body,
    });
    setSaving(false);
    if (!ok) {
      setError(data?.error || 'Could not save.');
      return;
    }
    setProduct(data.data);
  }

  if (loading || !product) {
    return (
      <Screen scroll>
        <View style={styles.pad}>
          <Header title="Product" subtitle="Loading…" />
        </View>
      </Screen>
    );
  }

  const uri =
    resolveMediaUrl(product.image_url) ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.pad}>
        <Header title={product.title} subtitle={`${product.platform} · ${product.Store?.store_name || 'Store'}`} />
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
          <Image source={{ uri }} style={styles.hero} />
        </ScrollView>

        <Card>
          <Text style={[styles.meta, { color: palette.textMuted }]}>SKU {product.sku || '—'}</Text>
          <Text style={[styles.meta, { color: palette.textMuted }]}>Platform ID {product.platform_product_id}</Text>
        </Card>

        <Card>
          <CustomInput label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <CustomInput label="Stock" value={stock} onChangeText={setStock} keyboardType="number-pad" />
          <CustomInput label="Status" value={status} onChangeText={setStatus} placeholder="active / draft" />
          {error ? <Text style={{ color: palette.danger, marginBottom: 8 }}>{error}</Text> : null}
          <CustomButton title="Save & queue push" onPress={handleSave} loading={saving} />
        </Card>

        <CustomButton title="Back to inventory" tone="secondary" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 12 },
  carousel: { maxHeight: 220 },
  hero: { width: 320, height: 200, borderRadius: 14, marginRight: 12 },
  meta: { fontSize: 13, marginBottom: 4 },
});
