import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

export default function SettingsScreen({ navigation }) {
  const palette = useThemePalette();
  const { settings, updateSettings, logout } = useAppState();

  return (
    <Screen scroll keyboardAvoiding>
      <View style={styles.container}>
        <Header title="Settings" subtitle="Device preferences" />

        <Card>
          <Text style={[styles.groupTitle, { color: palette.textMuted }]}>Appearance</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>Dark mode</Text>
            </View>
            <Switch value={settings.isDarkMode} onValueChange={(value) => updateSettings({ isDarkMode: value })} />
          </View>
          {/* <View style={[styles.toggleRow, styles.toggleSpaced]}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>Compact layout</Text>
            </View>
            <Switch
              value={Boolean(settings.compactLayout)}
              onValueChange={(value) => updateSettings({ compactLayout: value })}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>Reduce motion</Text>
            </View>
            <Switch
              value={Boolean(settings.reduceMotion)}
              onValueChange={(value) => updateSettings({ reduceMotion: value })}
            />
          </View> */}
        </Card>

        <Card>
          <Text style={[styles.groupTitle, { color: palette.textMuted }]}>Sync</Text>
          <View style={[styles.toggleRow, { paddingBottom: 2 }]}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleLabel, { color: palette.text }]}>Sync tab tips</Text>
            </View>
            <Switch
              value={settings.showSyncTips !== false}
              onValueChange={(value) => updateSettings({ showSyncTips: value })}
            />
          </View>
          <Pressable
            style={[styles.navRow, { backgroundColor: palette.mintSoft }]}
            onPress={() => navigation.navigate('Stores')}
          >
            <MaterialCommunityIcons name="store-settings-outline" size={22} color={palette.mint} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.navTitle, { color: palette.text }]}>Stores</Text>
              <Text style={[styles.navSub, { color: palette.textMuted }]}>Cross-store by SKU</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={palette.textMuted} />
          </Pressable>
        </Card>

        <Card>
          <Text style={[styles.groupTitle, { color: palette.textMuted }]}>Connectors</Text>
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

          <Text style={[styles.helper, { color: palette.textMuted }]}>
            Reference URLs; the app uses your configured API base.
          </Text>
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
    paddingBottom: 32,
    gap: 12,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
  },
  toggleSpaced: {
    marginTop: 4,
    marginBottom: 4,
  },
  toggleCopy: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  navSub: {
    fontSize: 12,
    marginTop: 2,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: 14,
  },
});
