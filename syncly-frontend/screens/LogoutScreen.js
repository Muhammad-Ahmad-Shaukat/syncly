import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';

export default function LogoutScreen() {
  const palette = useThemePalette();
  const { logout } = useAppState();

  useEffect(() => {
    logout();
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <Text style={[styles.title, { color: palette.text }]}>Signing out</Text>
          <Text style={[styles.copy, { color: palette.textMuted }]}>Your session is being cleared and you will return to the login screen.</Text>
          <CustomButton title="Back to login" onPress={logout} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
});