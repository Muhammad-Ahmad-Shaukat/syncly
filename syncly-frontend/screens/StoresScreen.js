import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

function platformIcon(platform) {
  return platform === 'shopify' ? 'storefront-outline' : 'shopping-outline';
}

export default function StoresScreen() {
  const palette = useThemePalette();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [message, setMessage] = useState('');

  /** @type {Record<number, { enabled: boolean, peers: Set<number> }>} */
  const [draft, setDraft] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiRequest('/api/mobile/stores');
    if (ok && Array.isArray(data?.data)) {
      setStores(data.data);
      const next = {};
      for (const s of data.data) {
        const peers = Array.isArray(s.cross_sync_peer_ids) ? s.cross_sync_peer_ids.map(Number) : [];
        next[s.id] = {
          enabled: Boolean(s.cross_sync_enabled),
          peers: new Set(peers.filter((n) => Number.isFinite(n))),
        };
      }
      setDraft(next);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function togglePeer(storeId, peerId) {
    setDraft((prev) => {
      const cur = prev[storeId] || { enabled: false, peers: new Set() };
      const peers = new Set(cur.peers);
      if (peers.has(peerId)) peers.delete(peerId);
      else peers.add(peerId);
      return { ...prev, [storeId]: { ...cur, peers } };
    });
  }

  function setEnabled(storeId, value) {
    setDraft((prev) => {
      const cur = prev[storeId] || { enabled: false, peers: new Set() };
      return { ...prev, [storeId]: { ...cur, enabled: value } };
    });
  }

  async function saveStore(store) {
    const d = draft[store.id];
    if (!d) return;
    setSavingId(store.id);
    setMessage('');
    const { ok, data } = await apiRequest(`/api/mobile/stores/${store.id}/sync`, {
      method: 'PATCH',
      body: {
        cross_sync_enabled: d.enabled,
        cross_sync_peer_ids: Array.from(d.peers),
      },
    });
    setSavingId(null);
    if (!ok) {
      setMessage(data?.error || 'Could not save store sync settings.');
      return;
    }
    setMessage(`Saved ${store.store_name}.`);
    load();
  }

  return (
    <Screen scroll>
      <View style={styles.pad}>
        <Header
          title="Connected stores"
          subtitle="Enable cross-store sync so matching SKUs stay aligned between Shopify and WooCommerce (uses dispatch jobs)."
        />

        {message ? (
          <Text style={[styles.msg, { color: palette.textMuted }]}>{message}</Text>
        ) : null}

        {loading ? (
          <Text style={{ color: palette.textMuted }}>Loading stores…</Text>
        ) : stores.length === 0 ? (
          <Card>
            <Text style={{ color: palette.textMuted }}>No stores linked yet. Connect Shopify or WooCommerce from the web connectors first.</Text>
          </Card>
        ) : (
          stores.map((store) => {
            const d = draft[store.id] || { enabled: false, peers: new Set() };
            const others = stores.filter((s) => s.id !== store.id);
            return (
              <Card key={store.id} style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={[styles.iconWrap, { backgroundColor: palette.primarySoft }]}>
                    <MaterialCommunityIcons name={platformIcon(store.platform)} size={22} color={palette.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.storeName, { color: palette.text }]}>{store.store_name}</Text>
                    <Text style={[styles.storeMeta, { color: palette.textMuted }]}>
                      {store.platform} · {store.store_url}
                    </Text>
                  </View>
                </View>

                <View style={[styles.toggleRow, { borderTopColor: palette.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: palette.text }]}>Cross-store sync</Text>
                    <Text style={[styles.hint, { color: palette.textMuted }]}>
                      When on, product upserts here fan out to selected stores (same SKU). Leave targets empty to sync to all other stores.
                    </Text>
                  </View>
                  <Switch value={d.enabled} onValueChange={(v) => setEnabled(store.id, v)} />
                </View>

                {others.length > 0 ? (
                  <View style={[styles.peers, { borderTopColor: palette.border }]}>
                    <Text style={[styles.label, { color: palette.text, marginBottom: 8 }]}>Sync to</Text>
                    {others.map((peer) => (
                      <Pressable
                        key={peer.id}
                        style={[styles.peerRow, { borderColor: palette.border }]}
                        onPress={() => togglePeer(store.id, peer.id)}
                      >
                        <MaterialCommunityIcons
                          name={d.peers.has(peer.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                          size={22}
                          color={d.peers.has(peer.id) ? palette.primary : palette.textMuted}
                        />
                        <Text style={{ color: palette.text, flex: 1 }}>{peer.store_name}</Text>
                        <Text style={{ color: palette.textMuted, fontSize: 12 }}>{peer.platform}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <CustomButton
                  title="Save this store"
                  onPress={() => saveStore(store)}
                  loading={savingId === store.id}
                  style={{ marginTop: 12 }}
                />
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },
  msg: {
    fontSize: 13,
    marginBottom: 4,
  },
  card: {
    marginBottom: 4,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '800',
  },
  storeMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 14,
    marginTop: 4,
    borderTopWidth: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  peers: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
});
