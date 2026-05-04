import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';
import { mobileGoogleExchange } from '../services/api';

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

export default function LoginScreen() {
  const palette = useThemePalette();
  const { login, completeSession } = useAppState();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: googleWebClientId || 'missing.apps.googleusercontent.com',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (googleResponse?.type !== 'success') return;
      const idToken =
        googleResponse.params?.id_token || googleResponse.authentication?.idToken;
      if (!idToken || cancelled) return;
      setLoading(true);
      setError('');
      const { ok, data } = await mobileGoogleExchange(idToken);
      if (cancelled) return;
      setLoading(false);
      if (!ok) {
        setError(data?.error || 'Google sign-in failed.');
        return;
      }
      await completeSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [googleResponse, completeSession]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err?.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll keyboardAvoiding>
      <View style={[styles.root, { backgroundColor: palette.background }]}>
        <View style={styles.hero}>
          <View style={[styles.logoMark, { backgroundColor: palette.primarySoft }]}>
            <Text style={[styles.logoLetter, { color: palette.primary }]}>S</Text>
          </View>
          <Text style={[styles.brand, { color: palette.text }]}>Syncly</Text>
          <Text style={[styles.copy, { color: palette.textMuted }]}>Manage Shopify and WooCommerce inventory, sync, and orders from one mobile workspace.</Text>
        </View>

        <Card>
          <Header title="Sign in" subtitle="Use your admin credentials to continue." />
          <CustomInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <CustomInput label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />

          {error ? <Text style={[styles.error, { color: palette.danger }]}>{error}</Text> : null}

          <CustomButton title="Login" onPress={handleLogin} loading={loading} style={styles.button} />

          {googleWebClientId ? (
            <CustomButton
              title="Continue with Google"
              tone="secondary"
              onPress={() => promptGoogleAsync()}
              loading={loading}
              style={styles.button}
            />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  logoMark: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: '900',
  },
  brand: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  error: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    marginTop: 6,
  },
});
