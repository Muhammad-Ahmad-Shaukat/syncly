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
import StoresScreen from '../screens/StoresScreen';
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
  const navBlock = { backgroundColor: palette.primarySoft };

  const items = [
    { label: 'Dashboard', icon: 'view-dashboard-outline', tab: 'Home', screen: 'Dashboard' },
    { label: 'Inventory', icon: 'package-variant-closed', tab: 'Inventory', screen: 'Products' },
    { label: 'Stores', icon: 'store-settings-outline', tab: 'Home', screen: 'Stores' },
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
        <Pressable style={[styles.overlayPanel, { backgroundColor: palette.surface }]} onPress={() => {}}>
          <View style={styles.overlayHeader}>
            <View style={[styles.brandMark, { backgroundColor: palette.primary }]}>
              <MaterialCommunityIcons name="lightning-bolt" size={24} color="#fff" />
            </View>
            <View style={styles.overlayCopy}>
              <Text style={[styles.brandTitle, { color: palette.text }]}>Syncly</Text>
              <Text style={[styles.brandSubtitle, { color: palette.textMuted }]}>Inventory & sync</Text>
            </View>
          </View>

          <View style={[styles.profileRow, navBlock]}>
            <View style={[styles.avatarCircle, { backgroundColor: palette.primary }]}>
              <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={[styles.profileName, { color: palette.text }]} numberOfLines={1}>
                {user?.name || 'Admin'}
              </Text>
              <Text style={[styles.profileMeta, { color: palette.textMuted }]} numberOfLines={1}>
                {user?.role || 'Admin'}
              </Text>
            </View>
          </View>

          <View style={styles.menuGrid}>
            {items.map((item) => (
              <Pressable
                key={`${item.tab}-${item.screen}`}
                style={({ pressed }) => [styles.menuTile, navBlock, pressed && { opacity: 0.92 }]}
                onPress={() => {
                  onClose();
                  if (navigationRef.isReady()) {
                    navigationRef.navigate(item.tab, { screen: item.screen });
                  }
                }}
              >
                <MaterialCommunityIcons name={item.icon} size={22} color={palette.primary} />
                <Text style={[styles.menuTileLabel, { color: palette.text }]} numberOfLines={2}>
                  {item.label}
                </Text>
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
      <HomeStack.Screen name="Stores" component={StoresScreen} options={{ title: 'Connected stores' }} />
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
      <SettingsStack.Screen name="Stores" component={StoresScreen} options={{ title: 'Connected stores' }} />
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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          height: 62,
          paddingTop: 6,
          paddingBottom: 6,
        },
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
    roundness: 18,
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    padding: 18,
    justifyContent: 'flex-start',
  },
  overlayPanel: {
    borderRadius: 24,
    padding: 18,
    marginTop: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  overlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayCopy: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  profileCopy: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  profileMeta: {
    fontSize: 12,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  menuTile: {
    width: '48%',
    minHeight: 76,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuTileLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
});
