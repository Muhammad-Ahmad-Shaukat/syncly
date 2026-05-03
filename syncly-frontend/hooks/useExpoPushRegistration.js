import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { registerPushToken } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function useExpoPushRegistration(isAuthenticated) {
  useEffect(() => {
    if (!isAuthenticated || !Device.isDevice) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) {
          return;
        }
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        await registerPushToken(token);
      } catch (e) {
        console.warn('[push]', e?.message || e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
