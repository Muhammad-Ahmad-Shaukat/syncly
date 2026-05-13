import { Op } from "sequelize";
import { Store, Product, SyncConflict } from "../db/models.js";

function snapshotMini(p) {
    return {
        id: p.id,
        syncly_public_id: p.syncly_public_id,
        title: p.title,
        store_id: p.store_id,
        platform: p.platform,
        price: p.price,
        inventory_quantity: p.inventory_quantity
    };
}

/** SKU collisions across channels (same merchant). */
export async function detectDuplicateSkuConflicts(userId) {
    const stores = await Store.findAll({ where: { user_id: userId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    if (!storeIds.length) return;
    const products = await Product.findAll({
        where: {
            store_id: storeIds,
            sku: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] }
        }
    });
    const map = new Map();
    for (const p of products) {
        const k = String(p.sku).trim();
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(p);
    }
    for (const [sku, list] of map) {
        if (list.length < 2) continue;
        const existing = await SyncConflict.findOne({
            where: { user_id: userId, sku, status: "open", conflict_kind: "duplicate_sku" }
        });
        if (existing) continue;
        const [a, b] = list;
        await SyncConflict.create({
            user_id: userId,
            sku,
            conflict_kind: "duplicate_sku",
            field_key: null,
            syncly_public_id: null,
            left_snapshot: snapshotMini(a),
            right_snapshot: snapshotMini(b),
            left_platform: a.platform,
            right_platform: b.platform
        });
    }
}

/** Same SKU on two channels with materially different price (window: current row state). */
export async function detectPriceMismatchConflicts(userId) {
    const stores = await Store.findAll({ where: { user_id: userId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    if (!storeIds.length) return;
    const products = await Product.findAll({
        where: {
            store_id: storeIds,
            sku: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "" }] }
        }
    });
    const map = new Map();
    for (const p of products) {
        const k = String(p.sku).trim();
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(p);
    }
    for (const [sku, list] of map) {
        if (list.length < 2) continue;
        const prices = list.map((p) => Number(p.price));
        const minP = Math.min(...prices.map((x) => (Number.isFinite(x) ? x : 0)));
        const maxP = Math.max(...prices.map((x) => (Number.isFinite(x) ? x : 0)));
        if (Math.abs(maxP - minP) < 0.01) continue;
        const existing = await SyncConflict.findOne({
            where: {
                user_id: userId,
                sku,
                status: "open",
                conflict_kind: "field_mismatch",
                field_key: "price"
            }
        });
        if (existing) continue;
        const [a, b] = list;
        await SyncConflict.create({
            user_id: userId,
            sku,
            conflict_kind: "field_mismatch",
            field_key: "price",
            syncly_public_id: null,
            left_snapshot: snapshotMini(a),
            right_snapshot: snapshotMini(b),
            left_platform: a.platform,
            right_platform: b.platform
        });
    }
}

export async function detectMerchantConflicts(userId) {
    await detectDuplicateSkuConflicts(userId);
    await detectPriceMismatchConflicts(userId);
}
