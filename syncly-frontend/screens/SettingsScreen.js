import { StyleSheet, Text, View, Switch } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

export default function SettingsScreen() {
  const palette = useThemePalette();
  const { settings, updateSettings, logout } = useAppState();

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Settings" subtitle="Adjust appearance and API endpoints." />

        <Card>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>Dark mode</Text>
              <Text style={[styles.toggleDescription, { color: palette.textMuted }]}>Switch the dashboard between light and dark surfaces.</Text>
            </View>
            <Switch value={settings.isDarkMode} onValueChange={(value) => updateSettings({ isDarkMode: value })} />
          </View>
        </Card>

        <Card>
          <CustomInput
            label="Shopify API URL"
            value={settings.shopifyApiUrl}
            onChangeText={(value) => updateSettings({ shopifyApiUrl: value })}
          />
          <CustomInput
            label="WooCommerce API URL"
            value={settings.wooCommerceApiUrl}
            onChangeText={(value) => updateSettings({ wooCommerceApiUrl: value })}
          />

          <Text style={[styles.helper, { color: palette.textMuted }]}>These fields are stored locally for UI configuration only.</Text>
        </Card>

        <CustomButton title="Logout" tone="danger" onPress={logout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 14,
  },
});