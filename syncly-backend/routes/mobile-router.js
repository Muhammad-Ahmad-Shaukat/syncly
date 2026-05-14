import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { Op } from "sequelize";
import {
    sequelize,
    User,
    Store,
    Product,
    Order,
    SyncRunLog,
    MobileSession,
    SyncConflict,
    EmailCampaign,
    EmailTemplate,
    EmailSegment,
    CampaignSend,
    ConversationThread,
    ConversationMessage,
    Customer
} from "../db/models.js";
import { userService } from "./user-routes/user-service.js";
import { issueMobileAccessToken } from "../utils/mobile-jwt.js";
import { hashRefreshToken, generateRefreshToken } from "../utils/mobile-session-utils.js";
import { requireMobileUser } from "../middleware/mobile-auth.js";
import { enqueueSyncJob, createRunLog, finishRunLog } from "../services/sync/sync-service.js";
import { maybeNotifyLowStock } from "../utils/push-expo.js";
import { detectMerchantConflicts } from "../services/conflict-detection.js";

const router = express.Router();

/** Last N calendar days (oldest → newest) creation counts for charts. */
async function dailyCreationCounts(storeIds, tableName, daySpan = 7) {
    if (!storeIds.length) return Array(daySpan).fill(0);
    const safeTable = tableName === "orders" ? "orders" : "products";
    const ids = storeIds.map(Number).filter((n) => n > 0);
    if (!ids.length) return Array(daySpan).fill(0);
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await sequelize.query(
        `SELECT DATE(created_at) AS d, COUNT(*) AS c FROM \`${safeTable}\` WHERE store_id IN (${placeholders}) AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY DATE(created_at)`,
        { replacements: [...ids, daySpan - 1] }
    );
    const countsByDay = new Map();
    for (const r of rows || []) {
        const raw = r.d;
        const key =
            raw instanceof Date
                ? raw.toISOString().slice(0, 10)
                : String(raw).slice(0, 10);
        countsByDay.set(key, Number(r.c) || 0);
    }
    const series = [];
    for (let i = daySpan - 1; i >= 0; i -= 1) {
        const dt = new Date();
        dt.setHours(0, 0, 0, 0);
        dt.setDate(dt.getDate() - i);
        const key = dt.toISOString().slice(0, 10);
        series.push(countsByDay.get(key) || 0);
    }
    return series;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mobileProductUploadDir = path.join(__dirname, "..", "uploads", "mobile");
fs.mkdirSync(mobileProductUploadDir, { recursive: true });

const productImageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mobileProductUploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const safeExt = ext && ext.length <= 6 && /^\.[a-z0-9]+$/i.test(ext) ? ext : ".jpg";
        cb(null, `${req.mobileUserId}-${Date.now()}${safeExt}`);
    }
});

const uploadProductImageMiddleware = multer({
    storage: productImageStorage,
    limits: { fileSize: 8 * 1024 * 1024 }
});

const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

function publicUser(u) {
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

async function createSessionForUser(user, deviceId) {
    const plain = generateRefreshToken();
    const hash = hashRefreshToken(plain);
    const expiresAt = new Date(Date.now() + REFRESH_MS);
    await MobileSession.create({
        user_id: user.id,
        refresh_token_hash: hash,
        expires_at: expiresAt,
        device_id: deviceId || null
    });
    const accessToken = issueMobileAccessToken({ id: user.id, email: user.email });
    return { accessToken, refreshToken: plain, expiresAt };
}

async function rotateSession(oldSession, user) {
    await oldSession.destroy();
    return createSessionForUser(user, oldSession.device_id);
}

router.post("/login", async (req, res) => {
    try {
        const { email, password, device_id: deviceId } = req.body || {};
        const userRow = await userService.authenticate(email, password);
        const user = await User.findByPk(userRow.id);
        const { accessToken, refreshToken } = await createSessionForUser(user, deviceId);
        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: publicUser(user)
        });
    } catch (e) {
        const status = e.message === "Invalid email or password" ? 401 : 400;
        res.status(status).json({ success: false, error: e.message });
    }
});

router.post("/refresh", async (req, res) => {
    try {
        const { refresh_token: refreshToken, device_id: deviceId } = req.body || {};
        if (!refreshToken) {
            return res.status(400).json({ success: false, error: "refresh_token required" });
        }
        const hash = hashRefreshToken(refreshToken);
        const session = await MobileSession.findOne({
            where: { refresh_token_hash: hash }
        });
        if (!session || new Date(session.expires_at).getTime() < Date.now()) {
            return res.status(401).json({ success: false, error: "Invalid refresh token" });
        }
        const user = await User.findByPk(session.user_id);
        if (!user || !user.is_active) {
            return res.status(401).json({ success: false, error: "User inactive" });
        }
        const next = await rotateSession(session, user);
        res.json({
            success: true,
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
            user: publicUser(user)
        });
    } catch (e) {
        if (e.message === "JWT_SECRET is not configured") {
            return res.status(500).json({ success: false, error: "Server misconfiguration" });
        }
        res.status(400).json({ success: false, error: e.message });
    }
});

router.post("/auth/google", async (req, res) => {
    try {
        const { id_token: idToken, device_id: deviceId } = req.body || {};
        if (!idToken) {
            return res.status(400).json({ success: false, error: "id_token required" });
        }
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        const info = await tokenRes.json();
        if (!tokenRes.ok || !info.email) {
            return res.status(401).json({ success: false, error: "Invalid Google token" });
        }
        const audOk =
            !process.env.GOOGLE_CLIENT_ID ||
            info.aud === process.env.GOOGLE_CLIENT_ID ||
            (info.aud && String(info.aud).includes(process.env.GOOGLE_CLIENT_ID));
        if (!audOk) {
            return res.status(401).json({ success: false, error: "Google audience mismatch" });
        }
        const user = await User.findOne({ where: { email: info.email } });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "No InventSync account for this Google email. Sign up on the web first."
            });
        }
        if (!user.is_active) {
            return res.status(403).json({ success: false, error: "Account deactivated" });
        }
        await user.update({ google_sub: info.sub || user.google_sub });
        await user.updateLastLogin();
        const { accessToken, refreshToken } = await createSessionForUser(user, deviceId);
        res.json({
            success: true,
            accessToken,
            refreshToken,
            user: publicUser(user)
        });
    } catch (e) {
        res.status(400).json({ success: false, error: e.message });
    }
});

router.post("/logout", requireMobileUser, async (req, res) => {
    await MobileSession.destroy({ where: { user_id: req.mobileUserId } });
    res.json({ success: true });
});

router.get("/me", requireMobileUser, async (req, res) => {
    const user = await User.findByPk(req.mobileUserId);
    if (!user) {
        return res.status(404).json({ success: false, error: "Not found" });
    }
    res.json({ success: true, user: publicUser(user) });
});

router.put("/me/push-token", requireMobileUser, async (req, res) => {
    const { expo_push_token: token } = req.body || {};
    const user = await User.findByPk(req.mobileUserId);
    await user.update({ expo_push_token: token || null });
    res.json({ success: true });
});

router.get("/stores", requireMobileUser, async (req, res) => {
    const rows = await Store.findAll({
        where: { user_id: req.mobileUserId },
        attributes: [
            "id",
            "store_name",
            "platform",
            "store_url",
            "sync_status",
            "last_synced_at",
            "cross_sync_enabled",
            "cross_sync_peer_ids"
        ]
    });
    res.json({ success: true, data: rows });
});

router.patch("/stores/:storeId/sync", requireMobileUser, async (req, res) => {
    const sid = Number(req.params.storeId);
    const store = await Store.findOne({ where: { id: sid, user_id: req.mobileUserId } });
    if (!store) {
        return res.status(404).json({ success: false, error: "Store not found" });
    }
    const { cross_sync_enabled: enabled, cross_sync_peer_ids: peerIds } = req.body || {};
    const patch = {};
    if (typeof enabled === "boolean") {
        patch.cross_sync_enabled = enabled;
    }
    if (Array.isArray(peerIds)) {
        const mine = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
        const allowed = new Set(mine.map((s) => s.id));
        allowed.delete(store.id);
        patch.cross_sync_peer_ids = peerIds.map(Number).filter((id) => allowed.has(id));
    }
    if (Object.keys(patch).length) {
        await store.update(patch);
    }
    await store.reload({
        attributes: [
            "id",
            "store_name",
            "platform",
            "store_url",
            "sync_status",
            "last_synced_at",
            "cross_sync_enabled",
            "cross_sync_peer_ids"
        ]
    });
    res.json({
        success: true,
        data: {
            id: store.id,
            store_name: store.store_name,
            platform: store.platform,
            store_url: store.store_url,
            sync_status: store.sync_status,
            last_synced_at: store.last_synced_at,
            cross_sync_enabled: Boolean(store.cross_sync_enabled),
            cross_sync_peer_ids: Array.isArray(store.cross_sync_peer_ids) ? store.cross_sync_peer_ids : []
        }
    });
});

router.post("/orders", requireMobileUser, async (req, res) => {
    const { store_id: storeId, order_number: orderNumber, total_amount: totalAmount } = req.body || {};
    const store = await Store.findOne({
        where: { id: storeId, user_id: req.mobileUserId }
    });
    if (!store) {
        return res.status(404).json({ success: false, error: "Store not found" });
    }
    const ext = `mobile-order-${Date.now()}`;
    const order = await Order.create({
        store_id: store.id,
        platform: store.platform,
        platform_order_id: ext,
        order_number: orderNumber || `INV-${Date.now()}`,
        status: "pending",
        currency: "USD",
        total_amount: totalAmount ?? 0,
        source: "backend"
    });
    await enqueueSyncJob({
        storeId: store.id,
        queueType: "dispatch",
        entityType: "order",
        operation: "create",
        idempotencyKey: `mobile-order-${order.id}`,
        payload: {
            command: {
                action: "create_order",
                internal_order_id: order.id,
                order_number: order.order_number,
                total_amount: order.total_amount
            }
        }
    }).catch(() => {});
    res.status(201).json({ success: true, data: order });
});

router.get("/orders", requireMobileUser, async (req, res) => {
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    try {
        const rows = await Order.findAll({
            where: { store_id: storeIds },
            order: [["created_at", "DESC"]],
            limit: 100,
            attributes: [
                "id",
                "store_id",
                "platform",
                "platform_order_id",
                "order_number",
                "status",
                "total_amount",
                "currency",
                "created_at",
                "updated_at"
            ],
            include: [{ model: Store, attributes: ["store_name", "platform"] }]
        });
        res.json({ success: true, data: rows });
    } catch (e) {
        console.error("[mobile] GET /orders", e?.parent?.sqlMessage || e?.message);
        res.json({ success: true, data: [], warning: "Orders list unavailable until schema is migrated." });
    }
});

router.get("/dashboard/metrics", requireMobileUser, async (req, res) => {
    const stores = await Store.findAll({
        where: { user_id: req.mobileUserId },
        attributes: ["id", "last_synced_at", "sync_status", "platform", "store_name"]
    });
    const storeIds = stores.map((s) => s.id);
    if (!storeIds.length) {
        return res.json({
            success: true,
            data: {
                productCount: 0,
                lowStockCount: 0,
                orderCount: 0,
                recentOrders: [],
                stores: [],
                lastSyncByStore: [],
                productSpark: Array(7).fill(0),
                orderSpark: Array(7).fill(0)
            }
        });
    }
    const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 10);
    const productCount = await Product.count({ where: { store_id: storeIds } });
    const lowStockCount = await Product.count({
        where: {
            store_id: storeIds,
            inventory_quantity: {
                [Op.and]: [{ [Op.ne]: null }, { [Op.lte]: threshold }]
            }
        }
    });
    const orderCount = await Order.count({ where: { store_id: storeIds } });
    const recentOrders = await Order.findAll({
        where: { store_id: storeIds },
        order: [["created_at", "DESC"]],
        limit: 5,
        attributes: ["id", "order_number", "status", "total_amount", "currency", "created_at", "store_id"]
    });
    const productSpark = await dailyCreationCounts(storeIds, "products", 7);
    const orderSpark = await dailyCreationCounts(storeIds, "orders", 7);
    res.json({
        success: true,
        data: {
            productCount,
            lowStockCount,
            orderCount,
            recentOrders,
            stores,
            lastSyncByStore: stores.map((s) => ({
                store_id: s.id,
                name: s.store_name,
                platform: s.platform,
                last_synced_at: s.last_synced_at,
                sync_status: s.sync_status
            })),
            productSpark,
            orderSpark
        }
    });
});

router.post("/upload/product-image", requireMobileUser, (req, res) => {
    uploadProductImageMiddleware.single("image")(req, res, (err) => {
        if (err) {
            const msg =
                err.code === "LIMIT_FILE_SIZE" ? "Image too large (max 8MB)" : err.message || "Upload failed";
            return res.status(400).json({ success: false, error: msg });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, error: "Image file required (form field: image)" });
        }
        const relative = `/uploads/mobile/${req.file.filename}`;
        res.json({ success: true, url: relative });
    });
});

router.get("/products", requireMobileUser, async (req, res) => {
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const { search, platform, low_stock: lowStock, sort } = req.query;
    const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 10);
    const where = { store_id: storeIds };
    if (platform && ["shopify", "woocommerce"].includes(platform)) {
        where.platform = platform;
    }
    if (lowStock === "1" || lowStock === "true") {
        where.inventory_quantity = {
            [Op.and]: [{ [Op.ne]: null }, { [Op.lte]: threshold }]
        };
    }
    if (search) {
        where[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { sku: { [Op.like]: `%${search}%` } },
            { syncly_public_id: { [Op.like]: `%${search}%` } }
        ];
    }
    let order = [["updated_at", "DESC"]];
    if (sort === "price_asc") order = [["price", "ASC"]];
    else if (sort === "price_desc") order = [["price", "DESC"]];
    else if (sort === "title") order = [["title", "ASC"]];
    else if (sort === "stock_low") order = [["inventory_quantity", "ASC"]];
    const rows = await Product.findAll({
        where,
        include: [{ model: Store, attributes: ["id", "store_name", "platform"] }],
        order,
        limit: 200
    });
    res.json({
        success: true,
        data: rows.map((p) => {
            const j = p.toJSON();
            return {
                id: j.id,
                title: j.title,
                sku: j.sku,
                status: j.status,
                price: j.price,
                inventory_quantity: j.inventory_quantity,
                platform: j.platform,
                image_url: j.image_url,
                store_id: j.store_id,
                syncly_public_id: j.syncly_public_id,
                platform_product_id: j.platform_product_id,
                store: j.Store
            };
        })
    });
});

router.get("/products/:id", requireMobileUser, async (req, res) => {
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    const product = await Product.findOne({
        where: { id: req.params.id, store_id: storeIds },
        include: [{ model: Store, attributes: ["id", "store_name", "platform", "store_url"] }]
    });
    if (!product) {
        return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, data: product.toJSON() });
});

router.patch("/products/:id", requireMobileUser, async (req, res) => {
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    const product = await Product.findOne({
        where: { id: req.params.id, store_id: storeIds }
    });
    if (!product) {
        return res.status(404).json({ success: false, error: "Product not found" });
    }
    const prevQty = product.inventory_quantity;
    const { price, inventory_quantity: inv, status } = req.body || {};
    const updates = {};
    if (price !== undefined) updates.price = price;
    if (inv !== undefined) updates.inventory_quantity = inv;
    if (status !== undefined) updates.status = status;
    await product.update(updates);
    const user = await User.findByPk(req.mobileUserId);
    await maybeNotifyLowStock({
        user,
        previousQty: prevQty,
        newQty: product.inventory_quantity,
        productTitle: product.title
    });
    const fields = {};
    if (price !== undefined) fields.price = product.price;
    if (inv !== undefined) fields.inventory_quantity = product.inventory_quantity;
    if (status !== undefined) fields.status = product.status;
    if (Object.keys(fields).length) {
        await enqueueSyncJob({
            storeId: product.store_id,
            queueType: "dispatch",
            entityType: "product",
            operation: "update",
            idempotencyKey: `mobile-p-${product.id}-${Date.now()}`,
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

router.post("/products/bulk", requireMobileUser, async (req, res) => {
    const { product_ids: ids, updates } = req.body || {};
    if (!Array.isArray(ids) || !ids.length || !updates || typeof updates !== "object") {
        return res.status(400).json({ success: false, error: "product_ids and updates required" });
    }
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    const products = await Product.findAll({
        where: { id: { [Op.in]: ids }, store_id: storeIds }
    });
    const { price, inventory_quantity: inv, status } = updates;
    for (const p of products) {
        const u = {};
        if (price !== undefined) u.price = price;
        if (inv !== undefined) u.inventory_quantity = inv;
        if (status !== undefined) u.status = status;
        if (Object.keys(u).length) {
            await p.update(u);
            await enqueueSyncJob({
                storeId: p.store_id,
                queueType: "dispatch",
                entityType: "product",
                operation: "update",
                idempotencyKey: `mobile-bulk-${p.id}-${Date.now()}`,
                payload: {
                    command: {
                        action: "update_product",
                        platform_product_id: p.platform_product_id,
                        fields: u
                    }
                }
            });
        }
    }
    res.json({ success: true, updated: products.length });
});

router.post("/products", requireMobileUser, async (req, res) => {
    const {
        store_id: storeId,
        title,
        sku,
        price,
        inventory_quantity: inv,
        status,
        description,
        image_url: imageUrl,
        image_alt_text: imageAltText
    } = req.body || {};
    const store = await Store.findOne({
        where: { id: storeId, user_id: req.mobileUserId }
    });
    if (!store) {
        return res.status(404).json({ success: false, error: "Store not found" });
    }
    const tempExt = `mobile-${Date.now()}`;
    const product = await Product.create({
        store_id: store.id,
        platform: store.platform,
        platform_product_id: tempExt,
        title: title || "New product",
        sku: sku || null,
        price: price ?? null,
        inventory_quantity: inv ?? null,
        status: status || "draft",
        description: description || null,
        image_url: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl.trim() : null,
        image_alt_text: typeof imageAltText === "string" && imageAltText.trim() ? imageAltText.trim() : null,
        source: "backend"
    });
    await enqueueSyncJob({
        storeId: store.id,
        queueType: "dispatch",
        entityType: "product",
        operation: "create",
        idempotencyKey: `mobile-create-${product.id}`,
        payload: {
            command: {
                action: "create_product",
                product_id: product.id,
                title: product.title,
                sku: product.sku,
                price: product.price,
                inventory_quantity: product.inventory_quantity,
                status: product.status,
                description: product.description,
                image_url: product.image_url
            }
        }
    });
    res.status(201).json({ success: true, data: product.toJSON() });
});

router.get("/sync/runs", requireMobileUser, async (req, res) => {
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    if (!storeIds.length) {
        return res.json({ success: true, data: [] });
    }
    const rows = await SyncRunLog.findAll({
        where: { store_id: storeIds },
        order: [["created_at", "DESC"]],
        limit: 50
    });
    res.json({ success: true, data: rows });
});

router.get("/sync/conflicts", requireMobileUser, async (req, res) => {
    try {
        const rows = await SyncConflict.findAll({
            where: { user_id: req.mobileUserId },
            order: [["created_at", "DESC"]],
            limit: 100
        });
        res.json({ success: true, data: rows });
    } catch (e) {
        console.error("[mobile] /sync/conflicts", e?.parent?.sqlMessage || e?.message);
        res.json({ success: true, data: [], warning: "Conflict list unavailable until DB schema is updated." });
    }
});

router.post("/sync/conflicts/:id/resolve", requireMobileUser, async (req, res) => {
    const row = await SyncConflict.findOne({
        where: { id: req.params.id, user_id: req.mobileUserId }
    });
    if (!row) {
        return res.status(404).json({ success: false, error: "Conflict not found" });
    }
    const { winner } = req.body || {};
    if (winner !== "left" && winner !== "right") {
        return res.status(400).json({ success: false, error: "winner must be left or right" });
    }
    const snap = winner === "left" ? row.left_snapshot : row.right_snapshot;
    const other = winner === "left" ? row.right_snapshot : row.left_snapshot;
    if (snap?.id && other?.id) {
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

router.post("/sync/trigger", requireMobileUser, async (req, res) => {
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
        return res.status(400).json({ success: false, error: "No stores" });
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
                    idempotencyKey: `mobile-sel-${p.id}-${run.id}`,
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
                idempotencyKey: `mobile-full-${sid}-${run.id}`,
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
        await finishRunLog(run.id, "completed", { scope: scope || "full", queued: true }, "mobile sync trigger");
    }
    await detectMerchantConflicts(req.mobileUserId);
    res.json({ success: true, data: { run_ids: runs.map((r) => r.id) } });
});

router.get("/campaigns", requireMobileUser, async (req, res) => {
    const rows = await EmailCampaign.findAll({
        where: { user_id: req.mobileUserId },
        order: [["created_at", "DESC"]],
        limit: 50
    });
    res.json({ success: true, data: rows });
});

router.post("/campaigns", requireMobileUser, async (req, res) => {
    const { name, subject, body_html: bodyHtml, email_segment_id: segId, email_template_id: tplId } = req.body || {};
    if (!name || !subject || !bodyHtml) {
        return res.status(400).json({ success: false, error: "name, subject, body_html required" });
    }
    const row = await EmailCampaign.create({
        user_id: req.mobileUserId,
        name,
        subject,
        body_html: bodyHtml,
        email_segment_id: segId || null,
        email_template_id: tplId || null,
        status: "draft"
    });
    res.status(201).json({ success: true, data: row });
});

router.get("/campaigns/:id/stats", requireMobileUser, async (req, res) => {
    const c = await EmailCampaign.findOne({
        where: { id: req.params.id, user_id: req.mobileUserId }
    });
    if (!c) {
        return res.status(404).json({ success: false, error: "Not found" });
    }
    const sent = await CampaignSend.count({ where: { campaign_id: c.id, status: "sent" } });
    const failed = await CampaignSend.count({ where: { campaign_id: c.id, status: "failed" } });
    const queued = await CampaignSend.count({ where: { campaign_id: c.id, status: "queued" } });
    res.json({
        success: true,
        data: { campaign: c, sends_by_status: { sent, failed, queued } }
    });
});

router.post("/campaigns/:id/send", requireMobileUser, async (req, res) => {
    const actor = await User.findByPk(req.mobileUserId);
    if (!actor || !["pro", "extreme"].includes(actor.tierType)) {
        return res.status(403).json({
            success: false,
            error: "Campaign sending requires Pro or Business tier."
        });
    }
    const c = await EmailCampaign.findOne({
        where: { id: req.params.id, user_id: req.mobileUserId }
    });
    if (!c) {
        return res.status(404).json({ success: false, error: "Not found" });
    }
    const stores = await Store.findAll({ where: { user_id: req.mobileUserId }, attributes: ["id"] });
    const storeIds = stores.map((s) => s.id);
    const segment = c.email_segment_id
        ? await EmailSegment.findOne({
            where: { id: c.email_segment_id, user_id: req.mobileUserId }
        })
        : null;
    const rules = segment?.rules_json || { platform: "all" };
    const custWhere = { store_id: storeIds };
    if (rules.platform === "shopify" || rules.platform === "woocommerce") {
        custWhere.platform = rules.platform;
    }
    const customers = await Customer.findAll({
        where: { ...custWhere, email: { [Op.ne]: null } },
        attributes: ["email"],
        limit: 5000
    });
    const emails = [...new Set(customers.map((x) => x.email).filter(Boolean))];
    await c.update({ status: "sending" });
    for (const email of emails) {
        await CampaignSend.create({
            campaign_id: c.id,
            recipient_email: email,
            status: "queued"
        });
    }
    res.json({ success: true, queued: emails.length });
});

router.get("/templates", requireMobileUser, async (req, res) => {
    const rows = await EmailTemplate.findAll({
        where: { user_id: req.mobileUserId },
        order: [["created_at", "DESC"]]
    });
    res.json({ success: true, data: rows });
});

router.post("/templates", requireMobileUser, async (req, res) => {
    const { name, subject, body_html: bodyHtml } = req.body || {};
    if (!name || !subject || !bodyHtml) {
        return res.status(400).json({ success: false, error: "name, subject, body_html required" });
    }
    const row = await EmailTemplate.create({
        user_id: req.mobileUserId,
        name,
        subject,
        body_html: bodyHtml
    });
    res.status(201).json({ success: true, data: row });
});

router.get("/segments", requireMobileUser, async (req, res) => {
    const rows = await EmailSegment.findAll({
        where: { user_id: req.mobileUserId },
        order: [["created_at", "DESC"]]
    });
    res.json({ success: true, data: rows });
});

router.post("/segments", requireMobileUser, async (req, res) => {
    const { name, rules_json: rules } = req.body || {};
    if (!name) {
        return res.status(400).json({ success: false, error: "name required" });
    }
    const row = await EmailSegment.create({
        user_id: req.mobileUserId,
        name,
        rules_json: rules || { platform: "all" }
    });
    res.status(201).json({ success: true, data: row });
});

router.get("/inbox/threads", requireMobileUser, async (req, res) => {
    const rows = await ConversationThread.findAll({
        where: { user_id: req.mobileUserId },
        order: [["updated_at", "DESC"]],
        limit: 100
    });
    res.json({ success: true, data: rows });
});

router.get("/inbox/threads/:id/messages", requireMobileUser, async (req, res) => {
    const thread = await ConversationThread.findOne({
        where: { id: req.params.id, user_id: req.mobileUserId }
    });
    if (!thread) {
        return res.status(404).json({ success: false, error: "Thread not found" });
    }
    const messages = await ConversationMessage.findAll({
        where: { thread_id: thread.id },
        order: [["created_at", "ASC"]]
    });
    res.json({ success: true, data: { thread, messages } });
});

router.post("/inbox/threads", requireMobileUser, async (req, res) => {
    const { title, source, external_ref: externalRef } = req.body || {};
    const thread = await ConversationThread.create({
        user_id: req.mobileUserId,
        title: title || "Conversation",
        source: source || "manual",
        external_ref: externalRef || null
    });
    res.status(201).json({ success: true, data: thread });
});

router.post("/inbox/threads/:id/reply", requireMobileUser, async (req, res) => {
    const thread = await ConversationThread.findOne({
        where: { id: req.params.id, user_id: req.mobileUserId }
    });
    if (!thread) {
        return res.status(404).json({ success: false, error: "Thread not found" });
    }
    const { body } = req.body || {};
    if (!body) {
        return res.status(400).json({ success: false, error: "body required" });
    }
    const msg = await ConversationMessage.create({
        thread_id: thread.id,
        direction: "out",
        body,
        metadata_json: { via: "inventsync_mobile" }
    });
    await thread.update({ updated_at: new Date() });
    const firstStore = await Store.findOne({ where: { user_id: req.mobileUserId } });
    if (firstStore) {
        await enqueueSyncJob({
            storeId: firstStore.id,
            queueType: "dispatch",
            entityType: "customer",
            operation: "bulk",
            idempotencyKey: `inbox-reply-${thread.id}-${msg.id}`,
            payload: {
                command: {
                    action: "inbox_reply",
                    thread_source: thread.source,
                    external_ref: thread.external_ref,
                    body
                }
            }
        }).catch(() => {});
    }
    res.status(201).json({ success: true, data: msg });
});

export default router;
