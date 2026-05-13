import { Banner, BlockStack, Box, Button, Card, Page, Text, List, InlineStack, Badge } from '@shopify/polaris';
import { useCallback, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

function formatAgo(iso) {
    if (!iso) return '—';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '—';
    const s = Math.floor((Date.now() - t) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

export default function SynclyHome({ synclyApiConfigured }) {
    const [runs, setRuns] = useState([]);
    const [events, setEvents] = useState([]);
    const [productCount, setProductCount] = useState(0);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [triggering, setTriggering] = useState(false);

    const load = useCallback(async () => {
        try {
            const [rRes, eRes, pRes] = await Promise.all([
                fetch(route('syncly.proxy.sync-runs'), { headers: { Accept: 'application/json' }, credentials: 'same-origin' }),
                fetch(route('syncly.proxy.sync-events', { limit: 30 }), { headers: { Accept: 'application/json' }, credentials: 'same-origin' }),
                fetch(route('syncly.proxy.products'), { headers: { Accept: 'application/json' }, credentials: 'same-origin' }),
            ]);
            const jr = await rRes.json();
            const je = await eRes.json();
            const jp = await pRes.json();
            if (jr.success === false) {
                setError(jr.error || 'Could not load sync status.');
            } else {
                setError(null);
                setRuns(Array.isArray(jr.data) ? jr.data : []);
            }
            if (je.success && Array.isArray(je.data)) {
                setEvents(je.data);
            }
            if (jp.success && Array.isArray(jp.data)) {
                setProductCount(jp.data.length);
            }
        } catch {
            setError('Network error while talking to Syncly.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, [load]);

    const handleTrigger = async () => {
        setTriggering(true);
        setError(null);
        try {
            const res = await fetch(route('syncly.proxy.trigger'), {
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });
            const j = await res.json();
            if (j.success === false) {
                setError(j.error || 'Sync could not be queued.');
            } else {
                await load();
            }
        } catch {
            setError('Could not start sync.');
        } finally {
            setTriggering(false);
        }
    };

    return (
        <Box paddingInline="400">
            <Page
                title="Syncly"
                subtitle="Live sync status from your Syncly backend"
                backAction={{ content: 'Dashboard', onAction: () => router.visit(route('home')) }}
                primaryAction={{
                    content: triggering ? 'Queueing…' : 'Run full sync',
                    onAction: handleTrigger,
                    loading: triggering,
                    disabled: !synclyApiConfigured,
                }}
            >
                {!synclyApiConfigured ? (
                    <Banner tone="warning" title="Configure SYNCLY_API_URL in .env for your Laravel app." />
                ) : null}
                {error ? (
                    <Box paddingBlockEnd="400">
                        <Banner tone="critical" title={error} />
                    </Box>
                ) : null}
                <BlockStack gap="400">
                    <InlineStack gap="400" wrap>
                        <Card>
                            <Box padding="400">
                                <Text as="p" variant="headingMd">
                                    Products in Syncly
                                </Text>
                                <Text as="p" variant="heading2xl">
                                    {loading ? '…' : productCount}
                                </Text>
                            </Box>
                        </Card>
                        <Card>
                            <Box padding="400">
                                <Text as="p" variant="headingMd">
                                    Recent runs
                                </Text>
                                <Text as="p" variant="heading2xl">
                                    {loading ? '…' : runs.length}
                                </Text>
                            </Box>
                        </Card>
                    </InlineStack>
                    <Card>
                        <Box padding="400">
                            <Text as="h2" variant="headingMd">
                                Activity (updates every 3s)
                            </Text>
                            <List type="bullet">
                                {events.slice(0, 15).map((ev) => (
                                    <List.Item key={ev.id}>
                                        <InlineStack gap="200" blockAlign="center" wrap={false}>
                                            <Badge tone={ev.status === 'processed' ? 'success' : 'attention'}>{ev.status}</Badge>
                                            <Text as="span">
                                                {ev.entity_type} {ev.operation} — {ev.origin} ({formatAgo(ev.created_at)})
                                            </Text>
                                        </InlineStack>
                                    </List.Item>
                                ))}
                                {!events.length && !loading ? (
                                    <List.Item>No events yet. Run a sync or wait for webhooks.</List.Item>
                                ) : null}
                            </List>
                        </Box>
                    </Card>
                </BlockStack>
            </Page>
        </Box>
    );
}
