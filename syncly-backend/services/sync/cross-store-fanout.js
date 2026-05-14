import { Op } from "sequelize";
import { Store, Product } from "../../db/models.js";

function normalizePeerIds(store) {
    const raw = store?.cross_sync_peer_ids;
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * When enabled (per-store or SYNCLY_CROSS_STORE_FANOUT), a product upsert pushes updates to peer stores
 * (Shopify ↔ WooCommerce) when the same SKU exists on the peer.
 */
export async function fanOutAfterProductUpsert(product) {
    if (!product) return;
    const sourceStore = await Store.findByPk(product.store_id);
    if (!sourceStore) return;

    const envFanout = process.env.SYNCLY_CROSS_STORE_FANOUT === "true";
    const storeFanout = Boolean(sourceStore.cross_sync_enabled);
    if (!envFanout && !storeFanout) return;

    const sku = product.sku != null ? String(product.sku).trim() : "";
    if (!sku) return;

    const { enqueueSyncJob } = await import("./sync-service.js");

    let peerIds = normalizePeerIds(sourceStore);
    if ((storeFanout || envFanout) && peerIds.length === 0) {
        const others = await Store.findAll({
            where: { user_id: sourceStore.user_id, id: { [Op.ne]: sourceStore.id } },
            attributes: ["id"]
        });
        peerIds = others.map((s) => s.id);
    }

    for (const peerId of peerIds) {
        if (peerId === sourceStore.id) continue;
        const peer = await Store.findOne({
            where: { id: peerId, user_id: sourceStore.user_id }
        });
        if (!peer) continue;

        const peerProduct = await Product.findOne({
            where: { store_id: peer.id, sku }
        });
        if (!peerProduct) continue;

        if (peer.platform === "shopify" && !peer.access_token) {
            console.warn("[cross-store-fanout] skip Shopify peer (no Admin token); Woo and other paths unaffected", {
                peerStoreId: peer.id,
                sku
            });
            continue;
        }
        if (peer.platform === "woocommerce" && (!peer.plugin_callback_url || !peer.webhook_secret)) {
            console.warn("[cross-store-fanout] skip Woo peer (missing plugin callback or webhook secret)", {
                peerStoreId: peer.id,
                sku
            });
            continue;
        }

        await enqueueSyncJob({
            storeId: peer.id,
            queueType: "dispatch",
            entityType: "product",
            operation: "update",
            idempotencyKey: `fanout-${product.id}-${peerProduct.id}-${product.updated_at || Date.now()}`,
            payload: {
                command: {
                    entity: "product",
                    operation: "update",
                    external_id: String(peerProduct.platform_product_id),
                    data: {
                        title: product.title,
                        price: product.price,
                        inventory_quantity: product.inventory_quantity,
                        status: product.status
                    }
                }
            }
        });
    }
}
