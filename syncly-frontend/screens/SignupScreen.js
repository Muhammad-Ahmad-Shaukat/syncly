import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authApi } from '../services/api';

export default function SignupScreen({ onGoToLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    const u = username.trim();
    const em = email.trim();
    if (!u || !em || !password) {
      Alert.alert('Missing fields', 'Username, email, and password are required.');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(u)) {
      Alert.alert('Username', 'Use only letters and numbers (3–50 characters).');
      return;
    }
    if (u.length < 3) {
      Alert.alert('Username', 'Username must be at least 3 characters.');
      return;
    }
    setLoading(true);
    try {
      const { ok, status, data } = await authApi.signup({
        username: u,
        email: em,
        password,
        tierType: 'basic',
      });
      if (!ok) {
        Alert.alert('Sign up failed', data.error || `HTTP ${status}`);
        return;
      }
      Alert.alert('Account created', 'You can sign in now.', [
        { text: 'OK', onPress: onGoToLogin },
      ]);
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>Syncly</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="johndoe"
            placeholderTextColor="#8b92a8"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />

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
            placeholder="Min 8 characters"
            placeholderTextColor="#8b92a8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Text style={styles.hint}>
            Use 8+ characters with upper & lower case, a number, and one of @$!%*?&
          </Text>

          <Pressable
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create account</Text>
            )}
          </Pressable>

          <Pressable style={styles.secondaryWrap} onPress={onGoToLogin} disabled={loading}>
            <Text style={styles.secondaryText}>
              Already have an account? <Text style={styles.secondaryBold}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0f1117',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 32,
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
  hint: {
    fontSize: 12,
    color: '#6b7289',
    marginTop: -10,
    marginBottom: 16,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#3d9a6a',
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
