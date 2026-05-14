import express from "express";
import { Op } from "sequelize";
import {
    User,
    Store,
    Product,
    Order,
    Customer,
    SyncRunLog,
    SyncConflict,
    SyncEventLog
} from "../db/models.js";
import { requireMerchantAuth } from "../middleware/merchant-auth.js";
import { enqueueSyncJob, createRunLog, finishRunLog } from "../services/sync/sync-service.js";
import { detectMerchantConflicts } from "../services/conflict-detection.js";
import { generateProductPublicId, generateOrderPublicId } from "../utils/syncly-public-id.js";

const router = express.Router();

function publicUserSafe(u) {
    const j = u.toJSON ? u.toJSON() : u;
    delete j.password;
    delete j.password_reset_token;
    delete j.password_reset_expires;
    return {
        ...j,
        name: j.username,
        conflict_strategy: j.conflict_strategy || "manual"
    };
}

router.post("/auth/check-email", async (req, res) => {
    try {
        const email = String(req.body?.email || "")
            .trim()
            .toLowerCase();
        if (!email || !email.includes("@")) {
            return res.status(400).json({
                success: false,
                error: "Enter a valid email address."
            });
        }
        const user = await User.findOne({ where: { email } });
        res.json({ success: true, exists: !!user });
    } catch {
        res.status(500).json({ success: false, error: "Could not verify email. Try again." });
    }
});

router.get("/me", requireMerchantAuth, async (req, res) => {
    const user = await User.findByPk(req.mobileUserId);
    if (!user) {
        return res.status(404).json({ success: false, error: "Account not found." });
    }
    res.json({ success: true, data: publicUserSafe(user) });
});

router.patch("/me/settings", requireMerchantAuth, async (req, res) => {
    const { conflict_strategy: strategy } = req.body || {};
    const allowed = ["syncly_master", "latest_wins", "manual"];
    if (strategy != null && !allowed.includes(strategy)) {
        return res.status(400).json({
            success: false,
            error: `conflict_strategy must be one of: ${allowed.join(", ")}`
        });
    }
    const user = await User.findByPk(req.mobileUserId);
    if (!user) {
        return res.status(404).json({ success: false, error: "Account not found." });
    }
    if (strategy != null) {
        await user.update({ conflict_strategy: strategy });
    }
    res.json({ success: true, data: publicUserSafe(user) });
});

async function storeIdsForUser(userId) {
    const stores = await Store.findAll({ where: { user_id: userId }, attributes: ["id"] });
    return stores.map((s) => s.id);
}

router.get("/products", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const { search, platform } = req.query;
    const where = { store_id: storeIds };
    if (platform && ["shopify", "woocommerce"].includes(platform)) {
        where.platform = platform;
    }
    if (search) {
        where[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { sku: { [Op.like]: `%${search}%` } },
            { syncly_public_id: { [Op.like]: `%${search}%` } }
        ];
    }
    try {
        const rows = await Product.findAll({
            where,
            include: [{ model: Store, attributes: ["id", "store_name", "platform"] }],
            order: [["updated_at", "DESC"]],
            limit: 500
        });
        res.json({
            success: true,
            data: rows.map((p) => {
                const j = p.toJSON();
                return {
                    id: j.id,
                    syncly_public_id: j.syncly_public_id,
                    title: j.title,
                    sku: j.sku,
                    status: j.status,
                    price: j.price,
                    inventory_quantity: j.inventory_quantity,
                    platform: j.platform,
                    image_url: j.image_url,
                    store_id: j.store_id,
                    store: j.Store,
                    last_synced_at: j.last_synced_at
                };
            })
        });
    } catch (err) {
        const sqlMsg = err?.parent?.sqlMessage || err?.original?.sqlMessage || err?.message;
        console.error("[syncly-merchant-router] GET /products failed:", sqlMsg);
        res.status(500).json({ success: false, error: "Could not load products.", detail: sqlMsg });
    }
});

router.get("/products/by-public-id/:publicId", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    const pid = String(req.params.publicId || "").trim();
    const product = await Product.findOne({
        where: { syncly_public_id: pid, store_id: storeIds },
        include: [{ model: Store, attributes: ["id", "store_name", "platform", "store_url"] }]
    });
    if (!product) {
        return res.status(404).json({ success: false, error: "Product not found." });
    }
    res.json({ success: true, data: product.toJSON() });
});

router.get("/orders", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const { platform, status: statusFilter } = req.query;
    const where = { store_id: storeIds };
    if (platform && ["shopify", "woocommerce"].includes(platform)) {
        where.platform = platform;
    }
    if (statusFilter) {
        where.status = statusFilter;
    }
    const rows = await Order.findAll({
        where,
        include: [{ model: Store, attributes: ["id", "store_name", "platform"] }],
        order: [["updated_at", "DESC"]],
        limit: 200
    });
    res.json({
        success: true,
        data: rows.map((o) => {
            const j = o.toJSON();
            return {
                id: j.id,
                syncly_public_id: j.syncly_public_id,
                order_number: j.order_number,
                status: j.status,
                total_amount: j.total_amount,
                currency: j.currency,
                platform: j.platform,
                store_id: j.store_id,
                store: j.Store,
                last_synced_at: j.last_synced_at
            };
        })
    });
});

router.get("/customers", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const { platform } = req.query;
    const where = { store_id: storeIds };
    if (platform && ["shopify", "woocommerce"].includes(platform)) {
        where.platform = platform;
    }
    const rows = await Customer.findAll({
        where,
        include: [{ model: Store, attributes: ["id", "store_name", "platform"] }],
        order: [["updated_at", "DESC"]],
        limit: 300
    });
    res.json({
        success: true,
        data: rows.map((c) => {
            const j = c.toJSON();
            return {
                id: j.id,
                email: j.email,
                first_name: j.first_name,
                last_name: j.last_name,
                status: j.status,
                platform: j.platform,
                store_id: j.store_id,
                store: j.Store,
                platform_customer_id: j.platform_customer_id,
                last_synced_at: j.last_synced_at
            };
        })
    });
});

router.patch("/customers/:id", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    const row = await Customer.findOne({
        where: { id: req.params.id, store_id: storeIds }
    });
    if (!row) {
        return res.status(404).json({ success: false, error: "Customer not found." });
    }
    const { email, first_name: firstName, last_name: lastName, status } = req.body || {};
    const updates = {};
    if (email !== undefined) updates.email = email;
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (status !== undefined) updates.status = status;
    await row.update(updates);
    const data = {};
    if (email !== undefined) data.email = row.email;
    if (firstName !== undefined) data.first_name = row.first_name;
    if (lastName !== undefined) data.last_name = row.last_name;
    if (status !== undefined) data.status = row.status;
    if (Object.keys(data).length) {
        await enqueueSyncJob({
            storeId: row.store_id,
            queueType: "dispatch",
            entityType: "customer",
            operation: "update",
            idempotencyKey: `syncly-merchant-cust-${row.id}-${Date.now()}`,
            payload: {
                command: {
                    entity: "customer",
                    operation: "update",
                    external_id: String(row.platform_customer_id),
                    data
                }
            }
        });
    }
    res.json({ success: true, data: row.toJSON() });
});

router.patch("/products/:id", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    const product = await Product.findOne({
        where: { id: req.params.id, store_id: storeIds }
    });
    if (!product) {
        return res.status(404).json({ success: false, error: "Product not found." });
    }
    const { price, inventory_quantity: inv, status, title } = req.body || {};
    const updates = {};
    if (price !== undefined) updates.price = price;
    if (inv !== undefined) updates.inventory_quantity = inv;
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    await product.update(updates);
    const fields = {};
    if (price !== undefined) fields.price = product.price;
    if (inv !== undefined) fields.inventory_quantity = product.inventory_quantity;
    if (status !== undefined) fields.status = product.status;
    if (title !== undefined) fields.title = product.title;
    if (Object.keys(fields).length) {
        await enqueueSyncJob({
            storeId: product.store_id,
            queueType: "dispatch",
            entityType: "product",
            operation: "update",
            idempotencyKey: `syncly-merchant-p-${product.id}-${Date.now()}`,
            payload: {
                command: {
                    action: "update_product",
                    platform_product_id: product.platform_product_id,
                    fields
                }
            }
        });
    }
    res.json({ success: true, data: product.toJSON() });
});

router.patch("/orders/:id", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    const order = await Order.findOne({
        where: { id: req.params.id, store_id: storeIds }
    });
    if (!order) {
        return res.status(404).json({ success: false, error: "Order not found." });
    }
    const { status } = req.body || {};
    if (status != null) {
        await order.update({ status });
        await enqueueSyncJob({
            storeId: order.store_id,
            queueType: "dispatch",
            entityType: "order",
            operation: "update",
            idempotencyKey: `syncly-merchant-o-${order.id}-${Date.now()}`,
            payload: {
                command: {
                    entity: "order",
                    operation: "update",
                    external_id: String(order.platform_order_id),
                    data: { status }
                }
            }
        });
    }
    res.json({ success: true, data: order.toJSON() });
});

router.get("/inventory/summary", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: { items: [], totals: { skus: 0, units: 0 } } });
    }
    const products = await Product.findAll({
        where: { store_id: storeIds },
        attributes: ["id", "syncly_public_id", "title", "sku", "inventory_quantity", "store_id", "platform"],
        include: [{ model: Store, attributes: ["store_name", "platform"] }],
        order: [["title", "ASC"]],
        limit: 1000
    });
    let units = 0;
    for (const p of products) {
        units += Number(p.inventory_quantity) || 0;
    }
    res.json({
        success: true,
        data: {
            items: products.map((p) => p.toJSON()),
            totals: { skus: products.length, units }
        }
    });
});

router.get("/sync/runs", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const rows = await SyncRunLog.findAll({
        where: { store_id: storeIds },
        order: [["started_at", "DESC"]],
        limit: 50
    });
    res.json({ success: true, data: rows });
});

router.get("/sync/events", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const rows = await SyncEventLog.findAll({
        where: { store_id: storeIds },
        include: [{ model: Store, attributes: ["store_name", "platform"] }],
        order: [["created_at", "DESC"]],
        limit
    });
    res.json({ success: true, data: rows });
});

router.get("/conflicts", requireMerchantAuth, async (req, res) => {
    const rows = await SyncConflict.findAll({
        where: { user_id: req.mobileUserId },
        order: [["created_at", "DESC"]],
        limit: 100
    });
    res.json({ success: true, data: rows });
});

router.post("/conflicts/:id/resolve", requireMerchantAuth, async (req, res) => {
    const row = await SyncConflict.findOne({
        where: { id: req.params.id, user_id: req.mobileUserId }
    });
    if (!row) {
        return res.status(404).json({ success: false, error: "Conflict not found." });
    }
    const { winner } = req.body || {};
    if (winner !== "left" && winner !== "right") {
        return res.status(400).json({ success: false, error: "winner must be left or right." });
    }
    const snap = winner === "left" ? row.left_snapshot : row.right_snapshot;
    const other = winner === "left" ? row.right_snapshot : row.left_snapshot;
    if (row.conflict_kind === "duplicate_sku" && snap?.id && other?.id) {
        const loser = await Product.findByPk(other.id);
        if (loser) {
            await loser.update({ sku: `${row.sku}-resolved-${loser.id}` });
        }
        const winProduct = await Product.findByPk(snap.id);
        if (winProduct) {
            await winProduct.update({ sku: row.sku });
        }
    }
    await row.update({
        status: "resolved",
        resolution: { winner, resolved_at: new Date().toISOString() }
    });
    res.json({ success: true, data: row });
});

router.post("/sync/trigger", requireMerchantAuth, async (req, res) => {
    const { scope, store_ids: bodyStoreIds, product_ids: productIds } = req.body || {};
    const stores = await Store.findAll({
        where: { user_id: req.mobileUserId },
        attributes: ["id"]
    });
    let storeIds = stores.map((s) => s.id);
    if (Array.isArray(bodyStoreIds) && bodyStoreIds.length) {
        storeIds = storeIds.filter((id) => bodyStoreIds.includes(id));
    }
    if (!storeIds.length) {
        return res.status(400).json({ success: false, error: "No stores connected." });
    }
    const runs = [];
    for (const sid of storeIds) {
        const run = await createRunLog(sid, scope === "full" ? "full" : "delta");
        runs.push(run);
        if (scope === "selective" && Array.isArray(productIds) && productIds.length) {
            const prods = await Product.findAll({
                where: { id: { [Op.in]: productIds }, store_id: sid }
            });
            for (const p of prods) {
                await enqueueSyncJob({
                    storeId: sid,
                    queueType: "dispatch",
                    entityType: "product",
                    operation: "update",
                    idempotencyKey: `syncly-api-sel-${p.id}-${run.id}`,
                    payload: {
                        command: {
                            action: "mobile_resync_product",
                            platform_product_id: p.platform_product_id,
                            internal_id: p.id
                        }
                    },
                    runLogId: run.id
                });
            }
        } else {
            await enqueueSyncJob({
                storeId: sid,
                queueType: "dispatch",
                entityType: "product",
                operation: "bulk",
                idempotencyKey: `syncly-api-full-${sid}-${run.id}`,
                payload: {
                    command: {
                        action: "mobile_requested_full_sync",
                        run_log_id: run.id,
                        requested_at: new Date().toISOString()
                    }
                },
                runLogId: run.id
            });
        }
        await finishRunLog(run.id, "completed", { scope: scope || "full", queued: true }, "sync trigger");
    }
    await detectMerchantConflicts(req.mobileUserId);
    res.json({ success: true, data: { run_ids: runs.map((r) => r.id) } });
});

router.post("/maintenance/backfill-public-ids", requireMerchantAuth, async (req, res) => {
    const storeIds = await storeIdsForUser(req.mobileUserId);
    if (!storeIds.length) {
        return res.json({ success: true, data: { products_updated: 0, orders_updated: 0 } });
    }
    const prods = await Product.findAll({
        where: { store_id: storeIds, syncly_public_id: { [Op.or]: [null, ""] } }
    });
    let pu = 0;
    for (const p of prods) {
        await p.update({ syncly_public_id: generateProductPublicId() });
        pu += 1;
    }
    const ords = await Order.findAll({
        where: { store_id: storeIds, syncly_public_id: { [Op.or]: [null, ""] } }
    });
    let ou = 0;
    for (const o of ords) {
        await o.update({ syncly_public_id: generateOrderPublicId() });
        ou += 1;
    }
    res.json({ success: true, data: { products_updated: pu, orders_updated: ou } });
});

export default router;
