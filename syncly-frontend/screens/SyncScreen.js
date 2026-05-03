import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

export default function SyncScreen() {
  const palette = useThemePalette();
  const [runs, setRuns] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c] = await Promise.all([
      apiRequest('/api/mobile/sync/runs'),
      apiRequest('/api/mobile/sync/conflicts'),
    ]);
    if (r.ok && r.data?.data) setRuns(r.data.data);
    if (c.ok && c.data?.data) setConflicts(c.data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function trigger(scope) {
    setBusy(true);
    setMessage('');
    const { ok, data } = await apiRequest('/api/mobile/sync/trigger', {
      method: 'POST',
      body: { scope },
    });
    setBusy(false);
    if (!ok) {
      setMessage(data?.error || 'Sync failed');
      return;
    }
    setMessage(scope === 'selective' ? 'Selective jobs queued (with product list on backend).' : 'Full sync jobs queued.');
    load();
  }

  async function resolveConflict(id, winner) {
    const { ok, data } = await apiRequest(`/api/mobile/sync/conflicts/${id}/resolve`, {
      method: 'POST',
      body: { winner },
    });
    if (!ok) {
      setMessage(data?.error || 'Resolve failed');
      return;
    }
    load();
  }

  return (
    <Screen scroll>
      <View style={styles.pad}>
        <Header title="Sync" subtitle="History, manual runs, and open conflicts." />

        <Card>
          <Text style={[styles.section, { color: palette.text }]}>Actions</Text>
          <View style={styles.row}>
            <CustomButton title="Full sync" onPress={() => trigger('full')} loading={busy} style={styles.flexBtn} />
            <CustomButton title="Selective (demo)" tone="secondary" onPress={() => trigger('selective')} loading={busy} style={styles.flexBtn} />
          </View>
          {message ? <Text style={{ color: palette.textMuted, marginTop: 8 }}>{message}</Text> : null}
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.text }]}>Open conflicts</Text>
          {loading ? (
            <Text style={{ color: palette.textMuted }}>Loading…</Text>
          ) : conflicts.filter((x) => x.status === 'open').length === 0 ? (
            <Text style={{ color: palette.textMuted }}>No open SKU conflicts.</Text>
          ) : (
            conflicts
              .filter((x) => x.status === 'open')
              .map((c) => (
                <View key={c.id} style={[styles.conflict, { borderColor: palette.border }]}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>SKU {c.sku}</Text>
                  <View style={styles.row}>
                    <Pressable
                      style={[styles.mini, { borderColor: palette.border }]}
                      onPress={() => resolveConflict(c.id, 'left')}
                    >
                      <Text style={{ color: palette.text }}>Keep left</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.mini, { borderColor: palette.border }]}
                      onPress={() => resolveConflict(c.id, 'right')}
                    >
                      <Text style={{ color: palette.text }}>Keep right</Text>
                    </Pressable>
                  </View>
                </View>
              ))
          )}
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.text }]}>Recent runs</Text>
          <FlatList
            data={runs}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={{ color: palette.textMuted }}>No runs yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.runRow}>
                <MaterialCommunityIcons name="history" size={18} color={palette.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text }}>Run #{item.id}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    {item.status} · {item.trigger_type}
                  </Text>
                </View>
              </View>
            )}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  section: { fontSize: 16, fontWeight: '600', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },
  conflict: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  mini: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  runRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
});
