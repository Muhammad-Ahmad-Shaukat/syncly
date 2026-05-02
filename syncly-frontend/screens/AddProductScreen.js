import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

export default function AddProductScreen() {
  const palette = useThemePalette();
  const { addProduct } = useAppState();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function handleSubmit() {
    if (!name.trim() || !price.trim() || !description.trim() || !stock.trim()) {
      setError('Please fill in the required fields.');
      return;
    }

    setError('');
    setSubmitting(true);

    setTimeout(() => {
      addProduct({
        name: name.trim(),
        price: Number(price),
        description: description.trim(),
        stock: Number(stock),
        category: category.trim() || 'General',
        image: 'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80',
      });

      setName('');
      setPrice('');
      setDescription('');
      setStock('');
      setCategory('');
      setSubmitting(false);
    }, 700);
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Add Product" subtitle="Capture new catalog items with a clean form." />

        <Card>
          <CustomInput label="Product name" value={name} onChangeText={setName} placeholder="Minimal desk mat" />
          <CustomInput label="Price" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="49" />
          <CustomInput label="Description" value={description} onChangeText={setDescription} placeholder="Short product description" multiline style={styles.multiline} />
          <CustomInput label="Stock" value={stock} onChangeText={setStock} keyboardType="numeric" placeholder="12" />
          <CustomInput label="Category" value={category} onChangeText={setCategory} placeholder="Office, Home, Lifestyle" />

          <View style={[styles.uploadBox, { borderColor: palette.border, backgroundColor: palette.surfaceSoft }]}>
            <MaterialCommunityIcons name="image-plus" size={24} color={palette.primary} />
            <Text style={[styles.uploadTitle, { color: palette.text }]}>Image upload UI only</Text>
            <Text style={[styles.uploadText, { color: palette.textMuted }]}>Connect a picker later if you need real media uploads.</Text>
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
  },
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
    fontWeight: '800',
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