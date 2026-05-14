const API_VER = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-10";

/**
 * Shopify Admin REST product.status must be one of: active, draft, archived.
 * Canonical DB may use publish/draft/private (Woo) or GraphQL-style values.
 */
export function normalizeProductStatusForShopify(status) {
    const s = String(status ?? "")
        .trim()
        .toLowerCase();
    if (!s) return "active";
    if (s === "active" || s === "publish" || s === "published") return "active";
    if (s === "draft" || s === "pending") return "draft";
    if (s === "archived" || s === "private") return "archived";
    return "active";
}

function adminUrl(shop, path) {
    const host = String(shop || "").replace(/^https?:\/\//, "");
    return `https://${host}/admin/api/${API_VER}${path.startsWith("/") ? path : `/${path}`}`;
}

async function shopifyRest(shop, accessToken, method, path, body = null) {
    const url = adminUrl(shop, path);
    const opts = {
        method,
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": accessToken
        }
    };
    if (body != null && method !== "GET" && method !== "DELETE") {
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const text = await res.text();
    let json = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = { raw: text };
    }
    if (!res.ok) {
        throw new Error(`Shopify Admin ${method} ${path} failed: ${res.status} ${text?.slice(0, 400)}`);
    }
    return json;
}

/**
 * @param {import("../../modals/products/store.js").default} store
 * @param {{ entity: string, operation: string, external_id: string, data: object }} n
 */
export async function dispatchShopifyAdmin(store, n) {
    const token = store.access_token;
    if (!token) throw new Error("Missing Shopify Admin token on store");
    const shop = store.store_url;

    if (n.entity === "product") {
        const id = n.external_id;
        if (n.operation === "delete" && id) {
            await shopifyRest(shop, token, "DELETE", `/products/${id}.json`);
            return;
        }
        if (!id) {
            throw new Error("Shopify product create via dispatch is not implemented in this path");
        }
        const product = {};
        if (n.data.title) product.title = n.data.title;
        product.status = normalizeProductStatusForShopify(n.data?.status);
        await shopifyRest(shop, token, "PUT", `/products/${id}.json`, { product });
        return;
    }

    if (n.entity === "order") {
        const id = n.external_id;
        if (!id) throw new Error("Missing order id");
        if (n.operation === "update" && n.data?.status) {
            await shopifyRest(shop, token, "PUT", `/orders/${id}.json`, {
                order: {
                    id: Number(id),
                    note: n.data.note || `Syncly: requested status ${n.data.status}`,
                    tags: n.data.tags || `syncly_status_${String(n.data.status).replace(/\s+/g, "_")}`
                }
            });
        }
        return;
    }

    if (n.entity === "customer") {
        const id = n.external_id;
        if (!id) throw new Error("Missing customer id");
        const customer = {};
        if (n.data.email) customer.email = n.data.email;
        if (n.data.first_name != null) customer.first_name = n.data.first_name;
        if (n.data.last_name != null) customer.last_name = n.data.last_name;
        if (Object.keys(customer).length) {
            await shopifyRest(shop, token, "PUT", `/customers/${id}.json`, { customer });
        }
        return;
    }

    throw new Error(`Shopify dispatch unsupported entity: ${n.entity}`);
}
