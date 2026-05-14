import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import { useAppState } from '../hooks/useAppState';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

export default function SyncScreen() {
  const navigation = useNavigation();
  const palette = useThemePalette();
  const { settings } = useAppState();
  const [runs, setRuns] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [r, c, s] = await Promise.all([
      apiRequest('/api/mobile/sync/runs'),
      apiRequest('/api/mobile/sync/conflicts'),
      apiRequest('/api/mobile/stores'),
    ]);
    if (r.ok && r.data?.data) setRuns(r.data.data);
    if (c.ok && c.data?.data) setConflicts(c.data.data);
    if (s.ok && Array.isArray(s.data?.data)) {
      setStores(s.data.data);
      setSelectedStoreIds((prev) => {
        if (prev.size > 0) return prev;
        return new Set(s.data.data.map((x) => x.id));
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleStoreTarget(id) {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function trigger(scope) {
    setBusy(true);
    setMessage('');
    const body = { scope };
    if (stores.length && selectedStoreIds.size > 0) {
      body.store_ids = Array.from(selectedStoreIds);
    }
    const { ok, data } = await apiRequest('/api/mobile/sync/trigger', {
      method: 'POST',
      body,
    });
    setBusy(false);
    if (!ok) {
      setMessage(data?.error || 'Sync failed');
      return;
    }
    setMessage(
      scope === 'selective'
        ? 'Selective jobs queued (uses product_ids when provided on backend).'
        : `Full sync queued for ${body.store_ids?.length ?? 'all'} store(s): catalog → DB, then DB → store (runs in the background).`
    );
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
        <Header title="Sync" subtitle="History & manual runs" />

        <Card>
          {settings.showSyncTips !== false ? (
            <Text style={[styles.helper, { color: palette.textMuted }]}>
              Full sync: store → database, then every catalog row back to that store. Cross-store rules:{' '}
              <Text style={{ color: palette.primary, fontWeight: '700' }} onPress={() => navigation.navigate('Stores')}>
                Stores
              </Text>
              .
            </Text>
          ) : null}

          {stores.length > 0 ? (
            <View style={{ marginBottom: 14 }}>
              <Text style={[styles.subLabel, { color: palette.textMuted }]}>Stores</Text>
              {stores.map((st) => (
                <Pressable
                  key={st.id}
                  style={[styles.storePick, { backgroundColor: selectedStoreIds.has(st.id) ? palette.primarySoft : palette.chipInactive }]}
                  onPress={() => toggleStoreTarget(st.id)}
                >
                  <MaterialCommunityIcons
                    name={selectedStoreIds.has(st.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={selectedStoreIds.has(st.id) ? palette.primary : palette.textMuted}
                  />
                  <Text style={{ color: palette.text, flex: 1 }}>{st.store_name}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>{st.platform}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.row}>
            <CustomButton title="Full sync" onPress={() => trigger('full')} loading={busy} style={styles.flexBtn} />
            {/* <CustomButton title="Selective (demo)" tone="secondary" onPress={() => trigger('selective')} loading={busy} style={styles.flexBtn} /> */}
          </View>
          {message ? <Text style={{ color: palette.textMuted, marginTop: 8 }}>{message}</Text> : null}
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>Conflicts</Text>
          {loading ? (
            <Text style={{ color: palette.textMuted }}>Loading…</Text>
          ) : conflicts.filter((x) => x.status === 'open').length === 0 ? (
            <Text style={{ color: palette.textMuted }}>No open SKU conflicts.</Text>
          ) : (
            conflicts
              .filter((x) => x.status === 'open')
              .map((c) => (
                <View key={c.id} style={styles.conflict}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>SKU {c.sku}</Text>
                  <View style={styles.row}>
                    <Pressable style={styles.mini} onPress={() => resolveConflict(c.id, 'left')}>
                      <Text style={{ color: palette.primary, fontWeight: '700' }}>Keep left</Text>
                    </Pressable>
                    <Pressable style={styles.mini} onPress={() => resolveConflict(c.id, 'right')}>
                      <Text style={{ color: palette.primary, fontWeight: '700' }}>Keep right</Text>
                    </Pressable>
                  </View>
                </View>
              ))
          )}
        </Card>

        <Card>
          <Text style={[styles.section, { color: palette.textMuted }]}>Runs</Text>
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
  section: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  helper: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
  subLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  storePick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 10 },
  flexBtn: { flex: 1 },
  conflict: { borderRadius: 14, padding: 14, marginBottom: 10, backgroundColor: 'rgba(251, 113, 133, 0.12)' },
  mini: { flex: 1, padding: 10, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.12)' },
  runRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
});
