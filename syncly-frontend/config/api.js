import { Platform } from 'react-native';

const defaultBase =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000';

export function getApiBase() {
  const fromEnv =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL
      ? String(process.env.EXPO_PUBLIC_API_URL).replace(/\/$/, '')
      : '';
  return fromEnv || defaultBase;
}

export const apiPaths = {
  signup: () => `${getApiBase()}/api/users/users`,
  login: () => `${getApiBase()}/api/users/users/login`,
};
