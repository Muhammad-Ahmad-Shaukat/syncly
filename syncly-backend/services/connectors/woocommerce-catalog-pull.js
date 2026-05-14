/**
 * Ask the WooCommerce plugin (authenticated with webhook secret) to POST
 * the full product catalog into the Syncly backend ingest queue.
 */
export async function runWooCommerceCatalogPullFromPlugin(store) {
    if (!store.plugin_callback_url || !store.webhook_secret) {
        throw new Error("Store callback URL or webhook secret is missing");
    }
    const base = store.plugin_callback_url.replace(/\/$/, "");
    const catalogUrl = `${base}/catalog-push`;
    const response = await fetch(catalogUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Syncly-Webhook-Secret": store.webhook_secret
        },
        body: JSON.stringify({ reason: "full_sync" })
    });
    const text = await response.text();
    let body = {};
    try {
        body = text ? JSON.parse(text) : {};
    } catch {
        body = {};
    }
    if (!response.ok) {
        throw new Error(`Woo catalog push failed (${response.status}): ${text?.slice(0, 240)}`);
    }
    if (body.success === false) {
        throw new Error(body.error || "Woo catalog push rejected");
    }
    return body;
}
