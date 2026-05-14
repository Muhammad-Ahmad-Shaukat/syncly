import crypto from "crypto";
import { Store, User, SyncEventLog, SyncJob, SyncRunLog, SyncDeadLetter } from "../../db/models.js";
import { userService } from "../../routes/user-routes/user-service.js";
import {
    connectorTokenExpiry,
    createWebhookSecret,
    issueConnectorAccessToken,
    issueRefreshToken,
    refreshTokenExpiry
} from "../../utils/connector-token.js";
import {
    createRunLog,
    enqueueSyncJob,
    finishRunLog,
    logIncomingEvent
} from "../../services/sync/sync-service.js";
import { runShopifyCatalogImport } from "../../services/connectors/shopify-catalog-pull.js";

function buildIdempotencyKey(input = "") {
    return crypto.createHash("sha1").update(input).digest("hex");
}

function connectorPlatform(req) {
    return req.synclyPlatform === "shopify" ? "shopify" : "woocommerce";
}

function inboundDirection(platform) {
    return platform === "shopify" ? "shopify_to_backend" : "woo_to_backend";
}

function defaultOrigin(platform) {
    return platform === "shopify" ? "shopify" : "woocommerce";
}

export async function connectorExchange(req, res) {
    try {
        const platform = connectorPlatform(req);
        const {
            email,
            password,
            store_url,
            store_name,
            plugin_callback_url,
            app_callback_url
        } = req.body || {};

        const emailTrim = typeof email === "string" ? email.trim() : "";
        const pwdLen = password == null ? 0 : String(password).length;
        console.log("[connector/auth/exchange]", {
            platform,
            bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
            email: emailTrim,
            emailLen: emailTrim.length,
            passwordLen: pwdLen,
            store_url: store_url ? String(store_url).slice(0, 120) : null
        });

        const user = await userService.authenticate(email, password);

        const callbackUrl = app_callback_url || plugin_callback_url || null;
        const storeLabel = store_name || (platform === "shopify" ? "Shopify Store" : "WooCommerce Store");

        const [store] = await Store.findOrCreate({
            where: { user_id: user.id, platform, store_url },
            defaults: {
                user_id: user.id,
                platform,
                store_name: storeLabel,
                store_url,
                plugin_callback_url: callbackUrl
            }
        });

        if (callbackUrl) {
            store.plugin_callback_url = callbackUrl;
        }
        const refreshToken = issueRefreshToken();
        const accessToken = issueConnectorAccessToken({
            storeId: store.id,
            userId: user.id,
            scope: ["sync:read", "sync:write", "sync:dispatch"]
        });
        store.connector_access_token = accessToken;
        store.connector_refresh_token = refreshToken;
        store.connector_token_issued_at = new Date();
        store.connector_token_expires_at = connectorTokenExpiry();
        store.connector_token_revoked_at = null;
        store.webhook_secret = store.webhook_secret || createWebhookSecret();
        await store.save();

        return res.json({
            success: true,
            message: "Connector token issued",
            data: {
                store_id: store.id,
                store_url: store.store_url,
                access_token: accessToken,
                refresh_token: refreshToken,
                access_expires_at: store.connector_token_expires_at,
                refresh_expires_at: refreshTokenExpiry(),
                webhook_secret: store.webhook_secret
            }
        });
    } catch (error) {
        console.warn("[connector/auth/exchange] rejected:", error.message);
        return res.status(401).json({ success: false, error: error.message });
    }
}

export async function connectorRefresh(req, res) {
    try {
        const { store_id, refresh_token } = req.body;
        const store = await Store.findByPk(store_id);
        if (!store || store.connector_refresh_token !== refresh_token || store.connector_token_revoked_at) {
            return res.status(401).json({ success: false, error: "Invalid refresh token" });
        }
        const user = await User.findByPk(store.user_id);
        const accessToken = issueConnectorAccessToken({
            storeId: store.id,
            userId: user.id,
            scope: ["sync:read", "sync:write", "sync:dispatch"]
        });
        store.connector_access_token = accessToken;
        store.connector_token_issued_at = new Date();
        store.connector_token_expires_at = connectorTokenExpiry();
        await store.save();

        return res.json({
            success: true,
            message: "Connector token refreshed",
            data: {
                store_id: store.id,
                access_token: accessToken,
                access_expires_at: store.connector_token_expires_at
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export async function connectorRevoke(req, res) {
    try {
        const { store_id } = req.body;
        const store = await Store.findByPk(store_id);
        if (!store) return res.status(404).json({ success: false, error: "Store not found" });
        store.connector_token_revoked_at = new Date();
        await store.save();
        return res.json({ success: true, message: "Connector token revoked" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export async function saveShopifySession(req, res) {
    try {
        const store = await Store.findByPk(req.connector.storeId);
        if (!store || store.platform !== "shopify") {
            return res.status(400).json({ success: false, error: "Store not found or not a Shopify store" });
        }
        const { shopify_access_token: shopifyToken, shop_domain: shopDomain } = req.body || {};
        if (!shopifyToken) {
            return res.status(400).json({ success: false, error: "shopify_access_token is required" });
        }
        const normalizedStoreUrl = String(store.store_url || "").replace(/^https?:\/\//, "");
        if (shopDomain && String(shopDomain).replace(/^https?:\/\//, "") !== normalizedStoreUrl) {
            return res.status(400).json({ success: false, error: "shop_domain does not match linked store" });
        }
        store.access_token = shopifyToken;
        await store.save();
        return res.json({ success: true, message: "Shopify Admin token stored" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export async function initialImportShopify(req, res) {
    try {
        const store = await Store.findByPk(req.connector.storeId);
        if (!store || store.platform !== "shopify") {
            return res.status(400).json({ success: false, error: "Invalid store" });
        }
        if (!store.access_token) {
            return res.status(400).json({ success: false, error: "Missing Shopify Admin token; complete OAuth session save first" });
        }
        await runShopifyCatalogImport(store);
        return res.json({ success: true, message: "Initial catalog import queued/processed" });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}

export async function ingestBatch(req, res) {
    try {
        const platform = connectorPlatform(req);
        const direction = inboundDirection(platform);
        const originDefault = defaultOrigin(platform);
        const storeId = req.connector.storeId;
        const { entity, records = [], origin, run_type = "initial" } = req.body;
        const resolvedOrigin = origin || originDefault;
        const runLog = await createRunLog(storeId, run_type === "initial" ? "initial" : "delta");
        for (const record of records) {
            const idempotencyKey = buildIdempotencyKey(`${storeId}:${entity}:${record.id || record.external_id}:${record.updated_at || Date.now()}`);
            await logIncomingEvent({
                storeId,
                entityType: entity,
                operation: "bulk",
                direction,
                origin: resolvedOrigin,
                idempotencyKey,
                externalId: String(record.id || record.external_id || ""),
                payload: record
            });
            await enqueueSyncJob({
                storeId,
                queueType: "ingest",
                entityType: entity,
                operation: "bulk",
                idempotencyKey,
                payload: { record, origin: resolvedOrigin },
                runLogId: runLog.id
            });
        }
        await finishRunLog(runLog.id, "completed", { queued: records.length }, "Batch queued");
        return res.json({ success: true, message: "Batch queued", queued: records.length });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function ingestDelta(req, res) {
    try {
        const platform = connectorPlatform(req);
        const direction = inboundDirection(platform);
        const originDefault = defaultOrigin(platform);
        const storeId = req.connector.storeId;
        const { entity, operation, external_id, idempotency_key, origin, data } = req.body;
        const resolvedOrigin = origin || originDefault;
        const key = idempotency_key || buildIdempotencyKey(`${storeId}:${entity}:${operation}:${external_id}:${Date.now()}`);
        await logIncomingEvent({
            storeId,
            entityType: entity,
            operation,
            direction,
            origin: resolvedOrigin,
            idempotencyKey: key,
            externalId: external_id,
            payload: data || {}
        });
        await enqueueSyncJob({
            storeId,
            queueType: "ingest",
            entityType: entity,
            operation: operation || "update",
            idempotencyKey: key,
            payload: { record: { ...data, external_id }, origin: resolvedOrigin }
        });
        return res.json({ success: true, message: "Delta queued", idempotency_key: key });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function dispatchCommand(req, res) {
    try {
        const { store_id, entity, operation, command, idempotency_key } = req.body;
        const key = idempotency_key || buildIdempotencyKey(`${store_id}:${entity}:${operation}:${Date.now()}`);
        await enqueueSyncJob({
            storeId: store_id,
            queueType: "dispatch",
            entityType: entity,
            operation: operation || "update",
            idempotencyKey: key,
            payload: { command }
        });
        return res.json({ success: true, message: "Dispatch queued", idempotency_key: key });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
}

export async function syncDiagnostics(req, res) {
    try {
        const storeId = Number(req.params.storeId);
        const [eventCount, failedJobs, deadLetters, latestRun] = await Promise.all([
            SyncEventLog.count({ where: { store_id: storeId } }),
            SyncJob.count({ where: { store_id: storeId, status: "failed" } }),
            SyncDeadLetter.count({ where: { store_id: storeId } }),
            SyncRunLog.findOne({ where: { store_id: storeId }, order: [["created_at", "DESC"]] })
        ]);
        return res.json({
            success: true,
            data: {
                store_id: storeId,
                total_events: eventCount,
                failed_jobs: failedJobs,
                dead_letters: deadLetters,
                latest_run: latestRun
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
