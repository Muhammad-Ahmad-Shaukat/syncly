import { DeliveryMethod } from "@shopify/shopify-api";
import { getConnectorForShop, clearConnectorForShop } from "./syncly-connector-store.js";
import { synclyBackendFetch } from "./syncly-backend-bridge.js";

function webhookProductRecord(payload) {
    const p = typeof payload === "string" ? JSON.parse(payload) : payload;
    const id = String(p.id ?? "");
    const v0 = Array.isArray(p.variants) ? p.variants[0] : null;
    return {
        id,
        external_id: id,
        title: p.title ?? "",
        status: p.status ?? "draft",
        price: v0?.price ?? null,
        inventory_quantity: v0?.inventory_quantity ?? null,
        sku: v0?.sku ?? null,
        image_url: p.image?.src || p.images?.[0]?.src || null,
        image_alt_text: p.title ?? null,
        updated_at: p.updated_at || new Date().toISOString()
    };
}

function webhookOrderRecord(payload) {
    const o = typeof payload === "string" ? JSON.parse(payload) : payload;
    const id = String(o.id ?? "");
    return {
        id,
        external_id: id,
        order_number: o.name || o.order_number || id,
        status: o.financial_status || o.fulfillment_status || o.display_financial_status || "unknown",
        total_amount: o.total_price != null ? Number(o.total_price) : null,
        currency: o.currency || null,
        updated_at: o.updated_at || new Date().toISOString()
    };
}

function webhookCustomerRecord(payload) {
    const c = typeof payload === "string" ? JSON.parse(payload) : payload;
    const id = String(c.id ?? "");
    return {
        id,
        external_id: id,
        email: c.email || null,
        first_name: c.first_name || null,
        last_name: c.last_name || null,
        status: "active",
        updated_at: c.updated_at || new Date().toISOString()
    };
}

async function forwardDelta(shop, { entity, operation, external_id, data, idempotency_key }) {
    const conn = getConnectorForShop(shop);
    if (!conn?.access_token) {
        console.warn(`[syncly-webhook] No Syncly connector for ${shop}; skip ${entity}/${operation}`);
        return;
    }
    const { ok, json } = await synclyBackendFetch(
        "POST",
        "/api/connectors/shopify/sync/delta",
        {
            entity,
            operation,
            external_id: String(external_id),
            origin: "shopify",
            data: data || {},
            idempotency_key
        },
        conn.access_token
    );
    if (!ok) {
        console.error("[syncly-webhook] Backend delta failed", json);
    }
}

const http = {
    deliveryMethod: DeliveryMethod.Http,
    callbackUrl: "/api/webhooks"
};

/**
 * @type {Record<string, import("@shopify/shopify-api").WebhookHandler>}
 */
export default {
    "products/create": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const rec = webhookProductRecord(body);
            await forwardDelta(shop, {
                entity: "product",
                operation: "update",
                external_id: rec.external_id,
                data: rec,
                idempotency_key: webhookId || `wh-pc-${rec.id}-${rec.updated_at}`
            });
        }
    },
    "products/update": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const rec = webhookProductRecord(body);
            await forwardDelta(shop, {
                entity: "product",
                operation: "update",
                external_id: rec.external_id,
                data: rec,
                idempotency_key: webhookId || `wh-pu-${rec.id}-${rec.updated_at}`
            });
        }
    },
    "products/delete": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const p = typeof body === "string" ? JSON.parse(body) : body;
            const id = String(p.id ?? "");
            await forwardDelta(shop, {
                entity: "product",
                operation: "delete",
                external_id: id,
                data: { id, updated_at: new Date().toISOString() },
                idempotency_key: webhookId || `wh-pd-${id}`
            });
        }
    },
    "orders/create": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const rec = webhookOrderRecord(body);
            await forwardDelta(shop, {
                entity: "order",
                operation: "update",
                external_id: rec.external_id,
                data: rec,
                idempotency_key: webhookId || `wh-oc-${rec.id}`
            });
        }
    },
    "orders/updated": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const rec = webhookOrderRecord(body);
            await forwardDelta(shop, {
                entity: "order",
                operation: "update",
                external_id: rec.external_id,
                data: rec,
                idempotency_key: webhookId || `wh-ou-${rec.id}-${rec.updated_at}`
            });
        }
    },
    "orders/delete": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const o = typeof body === "string" ? JSON.parse(body) : body;
            const id = String(o.id ?? "");
            await forwardDelta(shop, {
                entity: "order",
                operation: "delete",
                external_id: id,
                data: { id },
                idempotency_key: webhookId || `wh-od-${id}`
            });
        }
    },
    "customers/create": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const rec = webhookCustomerRecord(body);
            await forwardDelta(shop, {
                entity: "customer",
                operation: "update",
                external_id: rec.external_id,
                data: rec,
                idempotency_key: webhookId || `wh-cc-${rec.id}`
            });
        }
    },
    "customers/update": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const rec = webhookCustomerRecord(body);
            await forwardDelta(shop, {
                entity: "customer",
                operation: "update",
                external_id: rec.external_id,
                data: rec,
                idempotency_key: webhookId || `wh-cu-${rec.id}`
            });
        }
    },
    "customers/delete": {
        ...http,
        callback: async (_topic, shop, body, webhookId) => {
            const c = typeof body === "string" ? JSON.parse(body) : body;
            const id = String(c.id ?? "");
            await forwardDelta(shop, {
                entity: "customer",
                operation: "delete",
                external_id: id,
                data: { id },
                idempotency_key: webhookId || `wh-cd-${id}`
            });
        }
    },
    "app/uninstalled": {
        ...http,
        callback: async (_topic, shop) => {
            const conn = getConnectorForShop(shop);
            if (conn?.store_id) {
                await synclyBackendFetch("POST", "/api/connectors/shopify/auth/revoke", {
                    store_id: conn.store_id
                });
            }
            clearConnectorForShop(shop);
        }
    }
};
