import { NavigationContainer, DefaultTheme as NavigationLightTheme, DarkTheme as NavigationDarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

import { AppStateProvider, useAppState } from '../hooks/useAppState';
import { useExpoPushRegistration } from '../hooks/useExpoPushRegistration';
import { darkPalette, lightPalette } from '../constants/theme';
import AuthStack from './AuthStack';
import DashboardScreen from '../screens/DashboardScreen';
import ProductsScreen from '../screens/ProductsScreen';
import OrdersScreen from '../screens/OrdersScreen';
import AddProductScreen from '../screens/AddProductScreen';
import AddOrderScreen from '../screens/AddOrderScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LogoutScreen from '../screens/LogoutScreen';
import SyncScreen from '../screens/SyncScreen';
import CampaignsScreen from '../screens/CampaignsScreen';
import InboxScreen from '../screens/InboxScreen';
import PricingScreen from '../screens/PricingScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import { useThemePalette } from '../hooks/useThemePalette';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function getInitials(name) {
  return String(name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function MenuOverlay({ visible, onClose, user }) {
  const palette = useThemePalette();

  const items = [
    { label: 'Dashboard', icon: 'view-dashboard-outline', route: 'Dashboard' },
    { label: 'Inventory', icon: 'package-variant-closed', route: 'Products' },
    { label: 'Sync', icon: 'sync', route: 'Sync' },
    { label: 'Orders', icon: 'receipt-text-outline', route: 'Orders' },
    { label: 'Campaigns', icon: 'email-outline', route: 'Campaigns' },
    { label: 'Inbox', icon: 'inbox-outline', route: 'Inbox' },
    { label: 'Pricing', icon: 'credit-card-outline', route: 'Pricing' },
    { label: 'Add Product', icon: 'plus-box-outline', route: 'Add Product' },
    { label: 'Add Order', icon: 'cart-plus', route: 'Add Order' },
    { label: 'Settings', icon: 'cog-outline', route: 'Settings' },
    { label: 'Logout', icon: 'logout', route: 'Logout' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlayBackdrop} onPress={onClose}>
        <Pressable style={[styles.overlayPanel, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => {}}>
          <View style={[styles.overlayHeader, { borderBottomColor: palette.border }]}>
            <View style={[styles.brandMark, { backgroundColor: palette.primarySoft }]}>
              <MaterialCommunityIcons name="shopping-outline" size={22} color={palette.primary} />
            </View>
            <View style={styles.overlayCopy}>
              <Text style={[styles.brandTitle, { color: palette.text }]}>Syncly</Text>
              <Text style={[styles.brandSubtitle, { color: palette.textMuted }]}>Shopify + WooCommerce inventory</Text>
            </View>
          </View>

          <View style={[styles.profileCard, { backgroundColor: palette.surfaceSoft, borderColor: palette.border }]}>
            <View style={[styles.avatarCircle, { backgroundColor: palette.primary }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={[styles.profileName, { color: palette.text }]}>{user?.name || 'Admin User'}</Text>
              <Text style={[styles.profileMeta, { color: palette.textMuted }]}>{user?.role || 'Central Admin'}</Text>
            </View>
          </View>

          <View style={styles.menuList}>
            {items.map((item) => (
              <Pressable
                key={item.route}
                style={[styles.menuItem, { borderBottomColor: palette.border }]}
                onPress={() => {
                  onClose();
                  if (navigationRef.isReady()) {
                    navigationRef.navigate(item.route);
                  }
                }}
              >
                <MaterialCommunityIcons name={item.icon} size={20} color={palette.text} />
                <Text style={[styles.menuLabel, { color: palette.text }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AppNavigator() {
  const { isAuthenticated, settings, user } = useAppState();
  useExpoPushRegistration(isAuthenticated);
  const palette = settings.isDarkMode ? darkPalette : lightPalette;
  const [menuVisible, setMenuVisible] = useState(false);

  const paperTheme = {
    dark: settings.isDarkMode,
    roundness: 14,
    colors: {
      primary: palette.primary,
      secondary: palette.accent,
      background: palette.background,
      surface: palette.surface,
      surfaceVariant: palette.surfaceSoft,
      onSurface: palette.text,
      onSurfaceVariant: palette.textMuted,
      outline: palette.border,
    },
  };

  const navigationTheme = settings.isDarkMode
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          primary: palette.primary,
          notification: palette.accent,
        },
      }
    : {
        ...NavigationLightTheme,
        colors: {
          ...NavigationLightTheme.colors,
          background: palette.background,
          card: palette.surface,
          text: palette.text,
          border: palette.border,
          primary: palette.primary,
          notification: palette.accent,
        },
      };

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer ref={navigationRef} theme={navigationTheme}>
        <StatusBar style={settings.isDarkMode ? 'light' : 'dark'} />
        {isAuthenticated ? (
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: palette.surface },
              headerTitleStyle: { color: palette.text, fontWeight: '600', fontSize: 16 },
              headerTintColor: palette.text,
              contentStyle: { backgroundColor: palette.background },
            }}
          >
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard', headerLeft: () => <Pressable onPress={() => setMenuVisible(true)} style={styles.headerMenuButton}><MaterialCommunityIcons name="menu" size={24} color={palette.text} /></Pressable> }} />
            <Stack.Screen name="Products" component={ProductsScreen} options={{ title: 'Inventory' }} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
            <Stack.Screen name="Sync" component={SyncScreen} options={{ title: 'Sync' }} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Orders' }} />
            <Stack.Screen name="Campaigns" component={CampaignsScreen} options={{ title: 'Campaigns' }} />
            <Stack.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
            <Stack.Screen name="Pricing" component={PricingScreen} options={{ title: 'Pricing' }} />
            <Stack.Screen name="Add Product" component={AddProductScreen} options={{ title: 'Add Product' }} />
            <Stack.Screen name="Add Order" component={AddOrderScreen} options={{ title: 'Add Order' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="Logout" component={LogoutScreen} options={{ title: 'Logout', presentation: 'modal' }} />
          </Stack.Navigator>
        ) : (
          <AuthStack />
        )}
        {isAuthenticated ? <MenuOverlay visible={menuVisible} onClose={() => setMenuVisible(false)} user={user} /> : null}
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function AppShell() {
  return (
    <AppStateProvider>
      <AppNavigator />
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  headerMenuButton: {
    marginLeft: 4,
    marginRight: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    padding: 16,
    justifyContent: 'flex-start',
  },
  overlayPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 44,
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCopy: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  profileCard: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileMeta: {
    fontSize: 12,
  },
  menuList: {
    marginTop: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});