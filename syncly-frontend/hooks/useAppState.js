import { createContext, useContext, useMemo, useState } from 'react';

import { mockOrders, mockProducts } from '../constants/mockData';
import { loginMock } from '../services/mockApi';

const AppContext = createContext(null);

export function AppStateProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState(mockProducts);
  const [orders, setOrders] = useState(mockOrders);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    shopifyApiUrl: 'https://admin.shopify.com/store/demo-store',
    wooCommerceApiUrl: 'https://demo.woocommerce.com/wp-json',
  });

  async function login(email, password) {
    const result = await loginMock(email, password);
    setUser(result.user);
    setIsAuthenticated(true);
  }

  function logout() {
    setIsAuthenticated(false);
    setUser(null);
  }

  function addProduct(product) {
    const nextProduct = {
      ...product,
      id: `p-${Date.now()}`,
    };
    setProducts((current) => [nextProduct, ...current]);
  }

  function addOrder(order) {
    const nextOrder = {
      ...order,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    setOrders((current) => [nextOrder, ...current]);
  }

  function updateSettings(nextSettings) {
    setSettings((current) => ({ ...current, ...nextSettings }));
  }

  function refreshMockData() {
    setProducts([...mockProducts]);
    setOrders([...mockOrders]);
  }

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      products,
      orders,
      settings,
      login,
      logout,
      addProduct,
      addOrder,
      updateSettings,
      refreshMockData,
    }),
    [isAuthenticated, user, products, orders, settings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}