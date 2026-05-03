import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  apiRequest,
  clearAuthTokens,
  getAccessToken,
  mobileLogin,
  mobileLogoutRequest,
  setAuthTokens,
} from '../services/api';

const AppContext = createContext(null);

export function AppStateProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    isDarkMode: false,
    shopifyApiUrl: 'https://admin.shopify.com/store/demo-store',
    wooCommerceApiUrl: 'https://demo.woocommerce.com/wp-json',
  });
  const [bootstrapDone, setBootstrapDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) {
          return;
        }
        const { ok, data } = await apiRequest('/api/mobile/me');
        if (!cancelled && ok && data?.user) {
          setUser(data.user);
          setIsAuthenticated(true);
        }
      } finally {
        if (!cancelled) {
          setBootstrapDone(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completeSession = useCallback(async (session) => {
    await setAuthTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    setUser(session.user);
    setIsAuthenticated(true);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { ok, data } = await mobileLogin(email, password);
      if (!ok) {
        throw new Error(data?.error || 'Unable to sign in.');
      }
      await completeSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    },
    [completeSession]
  );

  async function logout() {
    try {
      await mobileLogoutRequest();
    } catch {
      /* offline */
    }
    await clearAuthTokens();
    setIsAuthenticated(false);
    setUser(null);
  }

  function updateSettings(nextSettings) {
    setSettings((current) => ({ ...current, ...nextSettings }));
  }

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      settings,
      bootstrapDone,
      login,
      completeSession,
      logout,
      updateSettings,
    }),
    [isAuthenticated, user, settings, bootstrapDone, completeSession, login]
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
