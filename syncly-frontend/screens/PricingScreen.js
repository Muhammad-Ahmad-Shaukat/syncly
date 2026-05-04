import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

const TIERS = [
  { id: 'basic', name: 'Starter', blurb: 'Core inventory + sync history.' },
  { id: 'pro', name: 'Pro', blurb: 'Bulk actions, campaigns, faster queues.' },
  { id: 'extreme', name: 'Business', blurb: 'Priority support + advanced automation.' },
];

export default function PricingScreen() {
  const palette = useThemePalette();
  const [user, setUser] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    (async () => {
      const { ok, data } = await apiRequest('/api/mobile/me');
      if (ok && data?.user) setUser(data.user);
    })();
  }, []);

  async function checkout(tierType) {
    setNote('');
    const { ok, data } = await apiRequest('/api/billing/checkout-session', {
      method: 'POST',
      body: { tierType },
    });
    if (!ok || !data?.url) {
      setNote(data?.error || 'Checkout unavailable (configure Stripe on the server).');
      return;
    }
    await WebBrowser.openBrowserAsync(data.url);
  }

  async function portal() {
    setNote('');
    const { ok, data } = await apiRequest('/api/billing/portal-session', { method: 'POST', body: {} });
    if (!ok || !data?.url) {
      setNote(data?.error || 'Portal unavailable.');
      return;
    }
    await WebBrowser.openBrowserAsync(data.url);
  }

  return (
    <Screen scroll>
      <View style={styles.pad}>
        <Header title="Pricing" subtitle="Manage your Syncly subscription with Stripe." />
        {user ? (
          <Text style={{ color: palette.textMuted, marginBottom: 8 }}>
            Current plan: <Text style={{ color: palette.text, fontWeight: '600' }}>{user.tierType}</Text> · billing{' '}
            {user.subscription_status || 'none'}
          </Text>
        ) : null}

        {TIERS.map((t) => (
          <Card key={t.id} style={styles.card}>
            <Text style={[styles.name, { color: palette.text }]}>{t.name}</Text>
            <Text style={[styles.blurb, { color: palette.textMuted }]}>{t.blurb}</Text>
            <CustomButton title={`Subscribe · ${t.name}`} onPress={() => checkout(t.id)} />
          </Card>
        ))}

        <CustomButton title="Open billing portal" tone="secondary" onPress={portal} />

        {note ? <Text style={{ color: palette.textMuted, marginTop: 8 }}>{note}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  card: { gap: 8 },
  name: { fontSize: 18, fontWeight: '600' },
  blurb: { fontSize: 14, lineHeight: 20 },
});
