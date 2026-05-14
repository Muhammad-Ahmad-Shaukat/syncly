import crypto from "crypto";
import {
    createRunLog,
    enqueueSyncJob,
    finishRunLog,
    logIncomingEvent
} from "../sync/sync-service.js";

const API_VER = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-10";

function gqlUrl(shop) {
    const host = String(shop || "").replace(/^https?:\/\//, "");
    return `https://${host}/admin/api/${API_VER}/graphql.json`;
}

async function graphql(shop, token, query, variables = {}) {
    const res = await fetch(gqlUrl(shop), {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token
        },
        body: JSON.stringify({ query, variables })
    });
    const j = await res.json();
    if (j.errors?.length) {
        throw new Error(j.errors.map((e) => e.message).join("; "));
    }
    return j.data;
}

function extractId(gid) {
    if (!gid) return "";
    const parts = String(gid).split("/");
    return parts[parts.length - 1];
}

/** Admin API `Money` scalar: decimal string without currency symbol (e.g. "19.99"). */
function parseMoneyScalar(value) {
    if (value == null || value === "") return null;
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
}

const PRODUCTS_PAGE = `query SynclyProducts($cursor: String) {
  products(first: 50, after: $cursor) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id
        title
        status
        updatedAt
        variants(first: 10) {
          edges { node { id price sku inventoryQuantity } }
        }
        featuredImage { url altText }
      }
    }
  }
}`;

/**
 * Pull Shopify catalog into backend ingest queue (GraphQL pagination).
 */
export async function runShopifyCatalogImport(store) {
    const shop = store.store_url;
    const token = store.access_token;
    if (!token) throw new Error("Shopify Admin token missing on store");

    const runLog = await createRunLog(store.id, "initial");
    let cursor = null;
    let hasNext = true;
    let total = 0;

    while (hasNext) {
        const data = await graphql(shop, token, PRODUCTS_PAGE, { cursor });
        const conn = data?.products;
        if (!conn) break;
        const edges = conn.edges || [];

        for (const e of edges) {
            const node = e.node;
            const v0 = node.variants?.edges?.[0]?.node;
            const pid = extractId(node.id);
            const priceAmount = parseMoneyScalar(v0?.price);
            const record = {
                id: pid,
                external_id: pid,
                title: node.title,
                status: String(node.status || "draft").toLowerCase(),
                price: priceAmount,
                inventory_quantity: v0?.inventoryQuantity ?? null,
                sku: v0?.sku ?? null,
                image_url: node.featuredImage?.url ?? null,
                image_alt_text: node.featuredImage?.altText ?? node.title,
                updated_at: node.updatedAt
            };
            const idempotencyKey = crypto
                .createHash("sha1")
                .update(`${store.id}:product:bulk:${pid}:${record.updated_at || ""}`)
                .digest("hex");

            await logIncomingEvent({
                storeId: store.id,
                entityType: "product",
                operation: "bulk",
                direction: "shopify_to_backend",
                origin: "shopify",
                idempotencyKey,
                externalId: pid,
                payload: record
            });
            await enqueueSyncJob({
                storeId: store.id,
                queueType: "ingest",
                entityType: "product",
                operation: "bulk",
                idempotencyKey,
                payload: { record, origin: "shopify" },
                runLogId: runLog.id
            });
            total += 1;
        }

        hasNext = Boolean(conn.pageInfo?.hasNextPage);
        cursor = conn.pageInfo?.endCursor || null;
    }

    await finishRunLog(runLog.id, "completed", { products: total }, "Shopify catalog import");
}
