import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import Screen from '../components/Screen';
import Card from '../components/Card';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Header from '../components/Header';
import { useThemePalette } from '../hooks/useThemePalette';
import { apiRequest } from '../services/api';

export default function CampaignsScreen() {
  const palette = useThemePalette();
  const [campaigns, setCampaigns] = useState([]);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiRequest('/api/mobile/campaigns');
    if (ok && data?.data) setCampaigns(data.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createDraft() {
    setMsg('');
    const { ok, data } = await apiRequest('/api/mobile/campaigns', {
      method: 'POST',
      body: { name: name || 'Untitled', subject: subject || 'Hello', body_html: body || '<p>Hi</p>' },
    });
    if (!ok) {
      setMsg(data?.error || 'Could not save');
      return;
    }
    setName('');
    setSubject('');
    setBody('');
    load();
  }

  async function sendCampaign(id) {
    setMsg('');
    const { ok, data } = await apiRequest(`/api/mobile/campaigns/${id}/send`, { method: 'POST', body: {} });
    if (!ok) {
      setMsg(data?.error || 'Send failed');
      return;
    }
    setMsg(`Queued ${data.queued} recipients.`);
    load();
  }

  async function loadStats(id) {
    const { ok, data } = await apiRequest(`/api/mobile/campaigns/${id}/stats`);
    if (ok && data?.data?.sends_by_status) {
      setMsg(`Stats: ${JSON.stringify(data.data.sends_by_status)}`);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.pad}>
        <Header title="Campaigns" subtitle="Draft a message, pick a segment, send via Resend or SendGrid." />

        <Card>
          <CustomInput label="Name" value={name} onChangeText={setName} placeholder="Spring promo" />
          <CustomInput label="Subject" value={subject} onChangeText={setSubject} placeholder="We miss you" />
          <CustomInput label="HTML body" value={body} onChangeText={setBody} placeholder="<p>Hello</p>" multiline style={styles.multi} />
          <CustomButton title="Save draft" onPress={createDraft} />
        </Card>

        {msg ? <Text style={{ color: palette.textMuted }}>{msg}</Text> : null}

        <Card>
          <Text style={[styles.h, { color: palette.text }]}>Your campaigns</Text>
          {loading ? (
            <Text style={{ color: palette.textMuted }}>Loading…</Text>
          ) : (
            <FlatList
              data={campaigns}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              ListEmptyComponent={<Text style={{ color: palette.textMuted }}>No campaigns yet.</Text>}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderColor: palette.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: palette.text, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: palette.textMuted, fontSize: 12 }}>{item.status}</Text>
                  </View>
                  <CustomButton title="Send" onPress={() => sendCampaign(item.id)} style={styles.small} />
                  <CustomButton title="Stats" tone="secondary" onPress={() => loadStats(item.id)} style={styles.small} />
                </View>
              )}
            />
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingTop: 8, gap: 12, paddingBottom: 32 },
  multi: { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  h: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  small: { paddingHorizontal: 12, minWidth: 0 },
});
