import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi } from '../services/api';

export default function LoginScreen({ onGoToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    const trimmed = email.trim();
    if (!trimmed || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const { ok, status, data } = await authApi.login(trimmed, password);
      if (!ok) {
        Alert.alert('Sign in failed', data.error || `HTTP ${status}`);
        return;
      }
      Alert.alert('Welcome', `Signed in as ${data.data?.username || trimmed}`);
    } catch (e) {
      Alert.alert(
        'Network error',
        e?.message ||
          'Could not reach the server. Check that the API is running and EXPO_PUBLIC_API_URL if you use a physical device.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>Syncly</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#8b92a8"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#8b92a8"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign in</Text>
          )}
        </Pressable>

        <Pressable style={styles.secondaryWrap} onPress={onGoToSignup} disabled={loading}>
          <Text style={styles.secondaryText}>
            No account? <Text style={styles.secondaryBold}>Create one</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1117',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    justifyContent: 'flex-start',
  },
  header: {
    marginBottom: 28,
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f4f5f7',
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#9aa3b5',
  },
  card: {
    backgroundColor: '#181c27',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#252a38',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#c5cad8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f1117',
    borderWidth: 1,
    borderColor: '#2a3142',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
    color: '#f4f5f7',
    marginBottom: 18,
  },
  primaryBtn: {
    backgroundColor: '#4f6cf7',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#9aa3b5',
    fontSize: 15,
  },
  secondaryBold: {
    color: '#8eabff',
    fontWeight: '600',
  },
});
