import { useCallback, useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  LegacyStack as Stack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [me, setMe] = useState(null);
  const [runs, setRuns] = useState([]);
  const [events, setEvents] = useState([]);
  const [productCount, setProductCount] = useState(0);

  const loadStatus = useCallback(async () => {
    try {
      const meRes = await fetch("/api/bridge/syncly/me", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const meJson = await meRes.json();
      if (meJson.success && meJson.data) {
        setConnected(true);
        setMe(meJson.data);
      } else {
        setConnected(false);
        setMe(null);
      }
    } catch {
      setConnected(false);
    }
  }, []);

  const loadSync = useCallback(async () => {
    if (!connected) return;
    try {
      const [rRes, eRes, pRes] = await Promise.all([
        fetch("/api/bridge/syncly/sync/runs", {
          headers: { Accept: "application/json" },
          credentials: "include",
        }),
        fetch("/api/bridge/syncly/sync/events?limit=25", {
          headers: { Accept: "application/json" },
          credentials: "include",
        }),
        fetch("/api/bridge/syncly/products", {
          headers: { Accept: "application/json" },
          credentials: "include",
        }),
      ]);
      const rj = await rRes.json();
      const ej = await eRes.json();
      const pj = await pRes.json();
      if (rj.success && Array.isArray(rj.data)) setRuns(rj.data);
      if (ej.success && Array.isArray(ej.data)) setEvents(ej.data);
      if (pj.success && Array.isArray(pj.data)) setProductCount(pj.data.length);
    } catch {
      /* ignore */
    }
  }, [connected]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!connected) return undefined;
    loadSync();
    const t = setInterval(loadSync, 5000);
    return () => clearInterval(t);
  }, [connected, loadSync]);

  const handleLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/syncly/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const j = await res.json();
      if (!j.success) {
        setError(j.error || "Login failed.");
        setConnected(false);
      } else {
        setConnected(true);
        setPassword("");
        await loadStatus();
        await loadSync();
      }
    } catch (e) {
      setError(e.message || "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const runInitialImport = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bridge/syncly/sync/initial-import", {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const j = await res.json();
      if (!j.success) setError(j.error || "Initial import failed.");
      await loadSync();
    } catch (e) {
      setError(e.message || "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const triggerSync = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bridge/syncly/sync/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const j = await res.json();
      if (!j.success) setError(j.error || "Could not queue sync.");
      await loadSync();
    } catch (e) {
      setError(e.message || "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page narrowWidth>
      <TitleBar title="Syncly" />
      <Layout>
        <Layout.Section>
          {error ? (
            <Banner status="critical" onDismiss={() => setError(null)}>
              {error}
            </Banner>
          ) : null}
        </Layout.Section>
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="loose">
              <Text as="h2" variant="headingMd">
                Syncly account
              </Text>
              <Text as="p" variant="bodyMd">
                Sign in with the same email and password you use for Syncly. Your catalog
                syncs to the Syncly backend (shared with WooCommerce when you connect both).
              </Text>
              <FormLayout>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                  disabled={busy}
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  autoComplete="current-password"
                  disabled={busy}
                />
                <Button primary onClick={handleLogin} loading={busy}>
                  Connect Syncly
                </Button>
              </FormLayout>
            </Stack>
          </Card>
        </Layout.Section>

        {connected ? (
          <>
            <Layout.Section>
              <Card sectioned>
                <Stack vertical spacing="tight">
                  <Text as="p" variant="bodyMd">
                    Signed in as <strong>{me?.email || me?.username || "merchant"}</strong>.
                  </Text>
                  <Stack distribution="equalSpacing" spacing="tight">
                    <Button onClick={runInitialImport} loading={busy}>
                      Initial product import
                    </Button>
                    <Button onClick={triggerSync} loading={busy}>
                      Queue sync
                    </Button>
                  </Stack>
                  <Text as="p" variant="bodySm" color="subdued">
                    After Shopify OAuth, the app saves your Admin API token to the backend.
                    Use Initial import once per store to pull products into Syncly.
                  </Text>
                </Stack>
              </Card>
            </Layout.Section>
            <Layout.Section>
              <Card sectioned>
                <Stack vertical spacing="tight">
                  <Text as="p" variant="bodyMd">
                    Products in Syncly: <strong>{productCount}</strong>
                  </Text>
                  <Text as="h3" variant="headingSm">
                    Recent runs
                  </Text>
                  {runs.slice(0, 5).map((r) => (
                    <Text key={r.id} as="p" variant="bodySm">
                      #{r.id} — {r.trigger_type} — {r.status}
                    </Text>
                  ))}
                  <Text as="h3" variant="headingSm">
                    Recent events
                  </Text>
                  {events.slice(0, 8).map((e) => (
                    <Text key={e.id} as="p" variant="bodySm">
                      {e.entity_type} {e.operation} ({e.status})
                    </Text>
                  ))}
                </Stack>
              </Card>
            </Layout.Section>
          </>
        ) : null}
      </Layout>
    </Page>
  );
}
