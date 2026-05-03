import AsyncStorage from '@react-native-async-storage/async-storage';

import { getApiBase } from '../config/api';

const ACCESS_KEY = 'inventsync_access_token';
const REFRESH_KEY = 'inventsync_refresh_token';

let refreshInFlight = null;

export async function setAuthTokens({ accessToken, refreshToken }) {
  if (accessToken != null) {
    await AsyncStorage.setItem(ACCESS_KEY, accessToken);
  }
  if (refreshToken != null) {
    await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export async function clearAuthTokens() {
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export async function getAccessToken() {
  return AsyncStorage.getItem(ACCESS_KEY);
}

async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_KEY);
}

async function runRefresh() {
  const rt = await getRefreshToken();
  if (!rt) {
    return null;
  }
  const base = getApiBase();
  const res = await fetch(`${base}/api/mobile/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    await clearAuthTokens();
    return null;
  }
  await setAuthTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  return data.accessToken;
}

async function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * @param {string} path - e.g. "/api/mobile/me"
 * @param {{ method?: string, body?: object, headers?: Record<string, string>, skipAuth?: boolean, _retry?: boolean }} options
 */
export async function apiRequest(path, options = {}) {
  const base = getApiBase();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const method = options.method || 'GET';
  const headers = { ...options.headers };
  if (options.body !== undefined && !options.headers?.['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (!options.skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  const fetchOpts = {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  };
  let res = await fetch(url, fetchOpts);
  let data = await res.json().catch(() => ({}));

  if (res.status === 401 && !options.skipAuth && !options._retry) {
    const next = await refreshAccessToken();
    if (next) {
      return apiRequest(path, { ...options, _retry: true });
    }
  }

  return { ok: res.ok, status: res.status, data };
}

export async function mobileLogin(email, password) {
  return apiRequest('/api/mobile/login', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
  });
}

export async function mobileGoogleExchange(idToken) {
  return apiRequest('/api/mobile/auth/google', {
    method: 'POST',
    body: { id_token: idToken },
    skipAuth: true,
  });
}

export async function mobileLogoutRequest() {
  return apiRequest('/api/mobile/logout', { method: 'POST' });
}

export async function registerPushToken(expoPushToken) {
  return apiRequest('/api/mobile/me/push-token', {
    method: 'PUT',
    body: { expo_push_token: expoPushToken },
  });
}
