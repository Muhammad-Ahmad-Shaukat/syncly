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
          <View style={styles.logoCluster}>
            <View style={[styles.logoBlob, { backgroundColor: palette.coral }]} />
            <View style={[styles.logoBlobOverlap, { backgroundColor: palette.primary }]} />
          </View>
          <Text style={[styles.brand, { color: palette.text }]}>Syncly</Text>
          <Text style={[styles.copy, { color: palette.textMuted }]}>Shopify & Woo inventory in one place.</Text>
        </View>

        <Card>
          <Header title="Sign in" subtitle="Admin email & password" />
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
    marginBottom: 20,
  },
  logoCluster: {
    width: 72,
    height: 56,
    marginBottom: 16,
  },
  logoBlob: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 48,
    height: 48,
    borderRadius: 18,
  },
  logoBlobOverlap: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 48,
    height: 48,
    borderRadius: 18,
    opacity: 0.95,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
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
