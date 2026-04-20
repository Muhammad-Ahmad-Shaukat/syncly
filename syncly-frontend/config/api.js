import { Platform } from 'react-native';

const defaultBase =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000';

/**
 * Backend base URL (no trailing slash).
 * Set EXPO_PUBLIC_API_URL in .env — required for physical devices (scheme + host, no trailing /api;
 * service paths already include /api/users/...).
 * Legacy: FRONTEND_URL was used earlier; still honored if EXPO_PUBLIC_API_URL is unset.
 */
export function getApiBase() {
  if (typeof process === 'undefined' || !process.env) {
    return defaultBase;
  }
  const explicit =
    process.env.EXPO_PUBLIC_API_URL || process.env.FRONTEND_URL || '';
  if (explicit) {
    return String(explicit).replace(/\/$/, '');
  }
  return defaultBase;
}
