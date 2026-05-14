import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest, uploadProductImage } from '../services/api';

export default function AddProductScreen() {
  const navigation = useNavigation();
  const palette = useThemePalette();
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [pickedImage, setPickedImage] = useState(null);
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

  async function pickProductImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Allow photo library access to attach a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPickedImage({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg' });
    setError('');
  }

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
    try {
      let imageUrl;
      if (pickedImage?.uri) {
        const up = await uploadProductImage(pickedImage.uri, pickedImage.mimeType);
        if (!up.ok) {
          setError(up.data?.error || 'Image upload failed.');
          return;
        }
        imageUrl = up.data?.url;
      }

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
          ...(imageUrl ? { image_url: imageUrl } : {}),
        },
      });
      if (!ok) {
        setError(data?.error || 'Could not create product.');
        return;
      }
      setPickedImage(null);
      setName('');
      setPrice('');
      setDescription('');
      setStock('');
      setSku('');
      navigation.navigate('Products');
      Alert.alert('Product added', 'Your product was saved to inventory.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Add Product" subtitle="Save to catalog & queue dispatch" />

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

          <Text style={[styles.label, { color: palette.text, marginTop: 4 }]}>Product image</Text>
          <Text style={[styles.hint, { color: palette.textMuted }]}>Optional — add a photo first, then fill in the details below.</Text>
          <View style={[styles.imageCard, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}>
            {pickedImage ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: pickedImage.uri }} style={styles.preview} />
                <Pressable
                  onPress={() => setPickedImage(null)}
                  style={[styles.removeImageBtn, { backgroundColor: palette.danger }]}
                  accessibilityRole="button"
                  accessibilityLabel="Remove selected image"
                >
                  <MaterialCommunityIcons name="close" size={20} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickProductImage}
                style={[styles.addImageTap, { borderColor: palette.border }]}
                accessibilityRole="button"
                accessibilityLabel="Choose product image from library"
              >
                <MaterialCommunityIcons name="image-plus-outline" size={36} color={palette.primary} />
                <Text style={[styles.addImageTitle, { color: palette.text }]}>Upload image</Text>
                <Text style={[styles.addImageSub, { color: palette.textMuted }]}>Opens your photo library</Text>
              </Pressable>
            )}
            {pickedImage ? (
              <CustomButton title="Change image" tone="secondary" onPress={pickProductImage} style={styles.changeImageBtn} />
            ) : null}
          </View>

          <CustomInput label="Product name" value={name} onChangeText={setName} placeholder="Minimal desk mat" />
          <CustomInput label="SKU (optional)" value={sku} onChangeText={setSku} placeholder="SKU-1001" />
          <CustomInput label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="49" />
          <CustomInput label="Description" value={description} onChangeText={setDescription} placeholder="Short description" multiline style={styles.multiline} />
          <CustomInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="12" />

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
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  storeChip: { borderWidth: 1, borderRadius: 12, padding: 12, minWidth: 120 },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  imageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  addImageTap: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  addImageTitle: { fontSize: 16, fontWeight: '700' },
  addImageSub: { fontSize: 13 },
  previewWrap: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  preview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#e2e8f0' },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageBtn: { marginTop: 10 },
  error: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
  },
});
