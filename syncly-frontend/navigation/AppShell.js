import {
  NavigationContainer,
  DefaultTheme as NavigationLightTheme,
  DarkTheme as NavigationDarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
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

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const InventoryStack = createNativeStackNavigator();
const OrdersStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

const navigationRef = createNavigationContainerRef();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const SynclyMenuContext = createContext({ openMenu: () => {} });

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
    { label: 'Dashboard', icon: 'view-dashboard-outline', tab: 'Home', screen: 'Dashboard' },
    { label: 'Inventory', icon: 'package-variant-closed', tab: 'Inventory', screen: 'Products' },
    { label: 'Sync', icon: 'sync', tab: 'Home', screen: 'Sync' },
    { label: 'Orders', icon: 'receipt-text-outline', tab: 'Orders', screen: 'OrdersMain' },
    { label: 'Campaigns', icon: 'email-outline', tab: 'Home', screen: 'Campaigns' },
    { label: 'Inbox', icon: 'inbox-outline', tab: 'Home', screen: 'Inbox' },
    { label: 'Pricing', icon: 'credit-card-outline', tab: 'Home', screen: 'Pricing' },
    { label: 'Add Product', icon: 'plus-box-outline', tab: 'Inventory', screen: 'Add Product' },
    { label: 'Add Order', icon: 'cart-plus', tab: 'Orders', screen: 'Add Order' },
    { label: 'Settings', icon: 'cog-outline', tab: 'Settings', screen: 'SettingsMain' },
    { label: 'Logout', icon: 'logout', tab: 'Settings', screen: 'Logout' },
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
                key={`${item.tab}-${item.screen}`}
                style={[styles.menuItem, { borderBottomColor: palette.border }]}
                onPress={() => {
                  onClose();
                  if (navigationRef.isReady()) {
                    navigationRef.navigate(item.tab, { screen: item.screen });
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

function HomeNavigator() {
  const { openMenu } = useContext(SynclyMenuContext);
  const palette = useThemePalette();
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.text, fontWeight: '600', fontSize: 16 },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Home',
          headerLeft: () => (
            <Pressable onPress={() => openMenu()} style={styles.headerMenuButton}>
              <MaterialCommunityIcons name="menu" size={24} color={palette.text} />
            </Pressable>
          ),
        }}
      />
      <HomeStack.Screen name="Sync" component={SyncScreen} options={{ title: 'Sync' }} />
      <HomeStack.Screen name="Campaigns" component={CampaignsScreen} options={{ title: 'Campaigns' }} />
      <HomeStack.Screen name="Inbox" component={InboxScreen} options={{ title: 'Inbox' }} />
      <HomeStack.Screen name="Pricing" component={PricingScreen} options={{ title: 'Pricing' }} />
    </HomeStack.Navigator>
  );
}

function InventoryNavigator() {
  const palette = useThemePalette();
  return (
    <InventoryStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.text, fontWeight: '600', fontSize: 16 },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <InventoryStack.Screen name="Products" component={ProductsScreen} options={{ title: 'Inventory' }} />
      <InventoryStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <InventoryStack.Screen name="Add Product" component={AddProductScreen} options={{ title: 'Add Product' }} />
    </InventoryStack.Navigator>
  );
}

function OrdersNavigator() {
  const palette = useThemePalette();
  return (
    <OrdersStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.text, fontWeight: '600', fontSize: 16 },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <OrdersStack.Screen name="OrdersMain" component={OrdersScreen} options={{ title: 'Orders' }} />
      <OrdersStack.Screen name="Add Order" component={AddOrderScreen} options={{ title: 'Add Order' }} />
    </OrdersStack.Navigator>
  );
}

function SettingsNavigator() {
  const palette = useThemePalette();
  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.text, fontWeight: '600', fontSize: 16 },
        headerTintColor: palette.text,
        contentStyle: { backgroundColor: palette.background },
      }}
    >
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen} options={{ title: 'Settings' }} />
      <SettingsStack.Screen name="Logout" component={LogoutScreen} options={{ title: 'Logout', presentation: 'modal' }} />
    </SettingsStack.Navigator>
  );
}

function MainTabs() {
  const palette = useThemePalette();
  const tabBarActive = palette.primary;
  const tabBarInactive = palette.textMuted;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBarActive,
        tabBarInactiveTintColor: tabBarInactive,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryNavigator}
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="package-variant-closed" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersNavigator}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="receipt-text-outline" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog-outline" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

function MainTabsShell({ setMenuVisible }) {
  const openMenu = useCallback(() => setMenuVisible(true), [setMenuVisible]);
  const menuValue = useMemo(() => ({ openMenu }), [openMenu]);
  return (
    <SynclyMenuContext.Provider value={menuValue}>
      <MainTabs />
    </SynclyMenuContext.Provider>
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
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Main">
              {() => <MainTabsShell setMenuVisible={setMenuVisible} />}
            </RootStack.Screen>
          </RootStack.Navigator>
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
    <QueryClientProvider client={queryClient}>
      <AppStateProvider>
        <AppNavigator />
      </AppStateProvider>
    </QueryClientProvider>
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
