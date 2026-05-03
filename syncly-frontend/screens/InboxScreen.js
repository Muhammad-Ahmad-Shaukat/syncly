import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

export default function InboxScreen() {
  const palette = useThemePalette();
  const [threads, setThreads] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');

  const loadThreads = useCallback(async () => {
    const { ok, data } = await apiRequest('/api/mobile/inbox/threads');
    if (ok && data?.data) setThreads(data.data);
  }, []);

  const loadMessages = useCallback(async (id) => {
    if (!id) return;
    const { ok, data } = await apiRequest(`/api/mobile/inbox/threads/${id}/messages`);
    if (ok && data?.data?.messages) setMessages(data.data.messages);
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  async function createThread() {
    setMsg('');
    const { ok, data } = await apiRequest('/api/mobile/inbox/threads', {
      method: 'POST',
      body: { title: title || 'New thread', source: 'manual' },
    });
    if (!ok) {
      setMsg(data?.error || 'Failed');
      return;
    }
    setTitle('');
    loadThreads();
    setSelectedId(data.data.id);
  }

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    const { ok, data } = await apiRequest(`/api/mobile/inbox/threads/${selectedId}/reply`, {
      method: 'POST',
      body: { body: reply.trim() },
    });
    if (!ok) {
      setMsg(data?.error || 'Reply failed');
      return;
    }
    setReply('');
    loadMessages(selectedId);
  }

  return (
    <Screen scroll>
      <View style={styles.pad}>
        <Header title="Inbox" subtitle="Threads (Shopify / Woo sources can be wired to this model)." />

        <Card>
          <CustomInput label="New thread title" value={title} onChangeText={setTitle} placeholder="Order #1042" />
          <CustomButton title="Create thread" onPress={createThread} />
        </Card>

        {msg ? <Text style={{ color: palette.danger }}>{msg}</Text> : null}

        <View style={styles.split}>
          <View style={styles.col}>
            <Text style={[styles.h, { color: palette.text }]}>Threads</Text>
            <FlatList
              data={threads}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedId(item.id)}
                  style={[
                    styles.thread,
                    { borderColor: palette.border, backgroundColor: selectedId === item.id ? palette.surfaceSoft : palette.surface },
                  ]}
                >
                  <Text style={{ color: palette.text, fontWeight: '600' }}>{item.title}</Text>
                  <Text style={{ color: palette.textMuted, fontSize: 11 }}>{item.source}</Text>
                </Pressable>
              )}
            />
          </View>
          <View style={[styles.col, { flex: 1.2 }]}>
            <Text style={[styles.h, { color: palette.text }]}>Messages</Text>
            {messages.map((m) => (
              <View key={m.id} style={{ marginBottom: 8 }}>
                <Text style={{ color: palette.textMuted, fontSize: 11 }}>{m.direction}</Text>
                <Text style={{ color: palette.text }}>{m.body}</Text>
              </View>
            ))}
            <CustomInput label="Reply" value={reply} onChangeText={setReply} multiline style={styles.multi} />
            <CustomButton title="Send reply" onPress={sendReply} disabled={!selectedId} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  h: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  split: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  thread: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  multi: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
});
