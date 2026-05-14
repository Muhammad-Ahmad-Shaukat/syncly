import crypto from "crypto";
import { Op, literal } from "sequelize";
import { sequelize } from "../../db/db.js";
import {
    Product,
    Order,
    Customer,
    SyncMapping,
    SyncEventLog,
    SyncJob,
    SyncDeadLetter,
    SyncRunLog,
    Store,
} from "../../db/models.js";
import { normalizeDispatchCommand } from "./command-normalize.js";
import { dispatchShopifyAdmin } from "../connectors/shopify-admin-dispatch.js";
import { runShopifyCatalogImport } from "../connectors/shopify-catalog-pull.js";
import { runWooCommerceCatalogPullFromPlugin } from "../connectors/woocommerce-catalog-pull.js";
import { fanOutAfterProductUpsert } from "./cross-store-fanout.js";

function hashPayload(payload) {
    try {
        return crypto.createHash("sha256").update(JSON.stringify(payload ?? {})).digest("hex");
    } catch {
        return crypto.createHash("sha256").update(String(payload)).digest("hex");
    }
}

/** Clone for JSON column — drops undefined / non-JSON values (avoids MySQL / Sequelize errors). */
function jsonSafePlatformData(data) {
    if (data == null || typeof data !== "object") return {};
    try {
        return JSON.parse(JSON.stringify(data));
    } catch {
        return {};
    }
}

/** Shopify GraphQL MoneyV2 `{ amount, currencyCode }`, WC/REST string/number → decimal or null */
function coerceDecimalMoney(value) {
    if (value == null || value === "") return null;
    if (typeof value === "object" && value !== null && "amount" in value) {
        const n = Number(String(value.amount).replace(/,/g, ""));
        return Number.isFinite(n) ? n : null;
    }
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
}

function parsePayload(payload) {
    let parsed = payload;
    for (let i = 0; i < 3; i += 1) {
        if (typeof parsed !== "string") break;
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return {};
        }
    }
    return parsed && typeof parsed === "object" ? parsed : {};
}

function modelForEntity(entityType) {
    if (entityType === "product") return Product;
    if (entityType === "order") return Order;
    if (entityType === "customer") return Customer;
    throw new Error(`Unsupported entity type: ${entityType}`);
}

function externalIdField(entityType) {
    if (entityType === "product") return "platform_product_id";
    if (entityType === "order") return "platform_order_id";
    if (entityType === "customer") return "platform_customer_id";
    throw new Error(`Unsupported entity type: ${entityType}`);
}

export async function enqueueSyncJob({
    storeId,
    queueType,
    entityType,
    operation = "bulk",
    idempotencyKey,
    payload,
    runLogId = null
}) {
    const [job, created] = await SyncJob.findOrCreate({
        where: { store_id: storeId, queue_type: queueType, idempotency_key: idempotencyKey },
        defaults: {
            store_id: storeId,
            queue_type: queueType,
            entity_type: entityType,
            operation,
            payload,
            idempotency_key: idempotencyKey,
            run_log_id: runLogId
        }
    });
    if (!created && job.status === "failed") {
        await job.update({
            status: "queued",
            payload,
            last_error: null,
            attempts: 0,
            next_attempt_at: new Date(),
            ...(runLogId != null ? { run_log_id: runLogId } : {})
        });
        await SyncEventLog.update(
            { status: "queued", error_message: null },
            { where: { store_id: storeId, idempotency_key: idempotencyKey } }
        );
        console.log("[sync-ingest] re-queued previously failed job", { jobId: job.id, idempotencyKey });
    }
    try {
        const { maybeQueueSyncJobInRedis } = await import("./bull-sync.js");
        await maybeQueueSyncJobInRedis(job);
    } catch (e) {
        console.warn("[enqueueSyncJob] Bull optional queue:", e.message);
    }
    return job;
}

export async function logIncomingEvent({
    storeId,
    entityType,
    operation,
    direction,
    origin,
    idempotencyKey,
    externalId,
    payload
}) {
    const [event] = await SyncEventLog.findOrCreate({
        where: { store_id: storeId, idempotency_key: idempotencyKey },
        defaults: {
            store_id: storeId,
            entity_type: entityType,
            operation,
            direction,
            origin,
            idempotency_key: idempotencyKey,
            external_id: externalId || null,
            payload,
            status: "queued"
        }
    });
    return event;
}

export async function upsertCanonicalRecord({ storeId, entityType, data, origin = "woocommerce", sourceUpdatedAt = null }) {
    const store = await Store.findByPk(storeId);
    if (!store) {
        throw new Error("Store not found");
    }
    const platform = store.platform === "shopify" ? "shopify" : "woocommerce";
    const allowedSources = ["backend", "woocommerce", "shopify"];
    const sourceValue = allowedSources.includes(origin) ? origin : "woocommerce";

    const Model = modelForEntity(entityType);
    const externalField = externalIdField(entityType);
    const externalId = String(data?.external_id ?? data?.id ?? "");
    if (!externalId) throw new Error("Missing external_id");

    const modelDefaults = {
        store_id: storeId,
        platform,
        [externalField]: externalId,
        source: sourceValue,
        source_updated_at: sourceUpdatedAt ? new Date(sourceUpdatedAt) : new Date(),
        last_synced_at: new Date(),
        sync_hash: hashPayload(data),
        raw_platform_data: jsonSafePlatformData(data),
    };

    if (entityType === "product") {
        modelDefaults.title = data.title || "Untitled Product";
        modelDefaults.status = data.status || "draft";
        modelDefaults.price = coerceDecimalMoney(data.price);
        if (typeof data.price === "object" && data.price?.currencyCode) {
            modelDefaults.currency = String(data.price.currencyCode);
        } else if (data.currency) {
            modelDefaults.currency = String(data.currency);
        }
        modelDefaults.inventory_quantity =
            data.inventory_quantity == null ? null : Number(data.inventory_quantity);
        if (modelDefaults.inventory_quantity != null && !Number.isFinite(modelDefaults.inventory_quantity)) {
            modelDefaults.inventory_quantity = null;
        }
        modelDefaults.sku = data.sku || null;
        modelDefaults.image_url = data.image_url || null;
        modelDefaults.image_alt_text = data.image_alt_text || null;
    }
    if (entityType === "order") {
        modelDefaults.order_number = data.order_number || null;
        modelDefaults.status = data.status || null;
        modelDefaults.total_amount = coerceDecimalMoney(data.total_amount);
        modelDefaults.currency = data.currency || null;
        if (!modelDefaults.currency && typeof data.total_amount === "object" && data.total_amount?.currencyCode) {
            modelDefaults.currency = String(data.total_amount.currencyCode);
        }
    }
    if (entityType === "customer") {
        modelDefaults.email = data.email || null;
        modelDefaults.first_name = data.first_name || null;
        modelDefaults.last_name = data.last_name || null;
        modelDefaults.status = data.status || "active";
    }

    console.log("[sync-ingest] upsertCanonicalRecord", {
        storeId,
        entityType,
        externalId,
        platform,
        origin: sourceValue
    });

    const [record, created] = await Model.findOrCreate({
        where: { store_id: storeId, [externalField]: externalId },
        defaults: modelDefaults
    });

    if (!created) {
        const currentUpdated = record.source_updated_at ? new Date(record.source_updated_at).getTime() : 0;
        const incomingUpdated = sourceUpdatedAt ? new Date(sourceUpdatedAt).getTime() : Date.now();
        if (incomingUpdated >= currentUpdated) {
            await record.update({
                ...modelDefaults,
                version: (record.version || 1) + 1
            });
            await record.reload();
        }
    }

    const mappingPayload = {
        store_id: storeId,
        entity_type: entityType,
        external_id: externalId,
        internal_id: record.id,
        source: sourceValue,
        source_updated_at: sourceUpdatedAt ? new Date(sourceUpdatedAt) : new Date(),
        last_synced_at: new Date(),
        version: record.version || 1
    };
    const [mapping, mappingCreated] = await SyncMapping.findOrCreate({
        where: {
            store_id: storeId,
            entity_type: entityType,
            external_id: externalId
        },
        defaults: mappingPayload
    });
    if (!mappingCreated) {
        await mapping.update({
            internal_id: record.id,
            source: sourceValue,
            source_updated_at: mappingPayload.source_updated_at,
            last_synced_at: mappingPayload.last_synced_at,
            version: record.version || 1
        });
    }

    console.log("[sync-ingest] upsert OK", { entityType, externalId, internalId: record.id, created });
    return record;
}

export async function processJob(job) {
    try {
        const [claimed] = await SyncJob.update(
            {
                status: "processing",
                attempts: literal("attempts + 1"),
                next_attempt_at: new Date()
            },
            {
                where: {
                    id: job.id,
                    status: "queued",
                    next_attempt_at: { [Op.lte]: new Date() }
                }
            }
        );
        if (claimed === 0) {
            return false;
        }
        await job.reload();
        const attemptAfterStart = job.attempts || 1;

        console.log("[sync-ingest] processJob start", {
            jobId: job.id,
            storeId: job.store_id,
            queue: job.queue_type,
            entity: job.entity_type,
            operation: job.operation,
            attempt: attemptAfterStart,
            maxAttempts: job.max_attempts
        });

        const payload = parsePayload(job.payload);

        if (job.queue_type === "ingest") {
            const records = Array.isArray(payload.records) ? payload.records : [payload.record].filter(Boolean);
            if (records.length === 0) {
                throw new Error("Ingest payload has no records");
            }
            const op = job.operation || "update";
            for (const record of records) {
                if (op === "delete" && job.entity_type === "product") {
                    const extId = String(record?.external_id ?? record?.id ?? "");
                    if (extId) {
                        await Product.destroy({
                            where: { store_id: job.store_id, platform_product_id: extId }
                        });
                    }
                } else if (op === "delete" && job.entity_type === "order") {
                    const extId = String(record?.external_id ?? record?.id ?? "");
                    if (extId) {
                        await Order.destroy({
                            where: { store_id: job.store_id, platform_order_id: extId }
                        });
                    }
                } else if (op === "delete" && job.entity_type === "customer") {
                    const extId = String(record?.external_id ?? record?.id ?? "");
                    if (extId) {
                        await Customer.destroy({
                            where: { store_id: job.store_id, platform_customer_id: extId }
                        });
                    }
                } else {
                    try {
                        const saved = await upsertCanonicalRecord({
                            storeId: job.store_id,
                            entityType: job.entity_type,
                            data: record,
                            origin: payload.origin || "woocommerce",
                            sourceUpdatedAt: record?.updated_at || payload?.source_updated_at || null
                        });
                        if (job.entity_type === "product" && saved) {
                            await fanOutAfterProductUpsert(saved);
                        }
                    } catch (rowErr) {
                        const ext = String(record?.external_id ?? record?.id ?? "?");
                        const rowMsg =
                            rowErr?.parent?.sqlMessage ||
                            rowErr?.original?.sqlMessage ||
                            rowErr?.message ||
                            String(rowErr);
                        console.error("[sync-ingest] record upsert failed", {
                            jobId: job.id,
                            entity: job.entity_type,
                            externalId: ext,
                            rowMsg,
                            validationErrors: rowErr?.errors?.map?.((e) => e.message) || undefined
                        });
                        throw rowErr;
                    }
                }
            }
        } else if (job.queue_type === "dispatch") {
            const store = await Store.findByPk(job.store_id);
            if (!store) {
                throw new Error("Store not found");
            }
            if (!payload.command || typeof payload.command !== "object") {
                throw new Error("Dispatch payload has no command");
            }
            const cmd = payload.command;
            if (cmd.action === "mobile_requested_full_sync" && store.platform === "shopify") {
                await runShopifyCatalogImport(store);
                await drainQueuedIngestJobsForStore(store.id);
                await enqueuePushDbProductsToStore(store, cmd.run_log_id ?? null);
            } else if (cmd.action === "mobile_requested_full_sync" && store.platform === "woocommerce") {
                await runWooCommerceCatalogPullFromPlugin(store);
                await drainQueuedIngestJobsForStore(store.id);
                await enqueuePushDbProductsToStore(store, cmd.run_log_id ?? null);
                await enqueuePeerProductsMissingOnWoo(store, cmd.run_log_id ?? null);
            } else if (cmd.action === "mobile_requested_full_sync") {
                throw new Error(`Full sync is not supported for platform: ${store.platform}`);
            } else {
                const normalized = await normalizeDispatchCommand(store, cmd);
                if (store.platform === "shopify") {
                    if (!store.access_token) {
                        throw new Error("Shopify Admin token missing; complete OAuth and session link");
                    }
                    await dispatchShopifyAdmin(store, normalized);
                } else {
                    if (!store.plugin_callback_url || !store.webhook_secret) {
                        throw new Error("Store callback URL or webhook secret is missing");
                    }
                    const base = store.plugin_callback_url.replace(/\/$/, "");
                    const commandsUrl = base.endsWith("/commands") ? base : `${base}/commands`;
                    const response = await fetch(commandsUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Syncly-Webhook-Secret": store.webhook_secret
                        },
                        body: JSON.stringify(normalized)
                    });
                    const responseText = await response.text();
                    if (!response.ok) {
                        throw new Error(
                            `Plugin command failed with status ${response.status}: ${responseText?.slice(0, 200)}`
                        );
                    }
                    let pluginBody = {};
                    try {
                        pluginBody = responseText ? JSON.parse(responseText) : {};
                    } catch {
                        pluginBody = {};
                    }
                    if (pluginBody?.applied === false) {
                        throw new Error(pluginBody.reason || "WooCommerce plugin rejected the command");
                    }
                    if (store.platform === "woocommerce") {
                        console.log("[woo-dispatch] ok", {
                            jobId: job.id,
                            action: payload.command?.action,
                            applied: pluginBody?.applied,
                            external_id: pluginBody?.external_id
                        });
                    }
                    const dispatchCmd = payload.command;
                    const wooCreated =
                        store.platform === "woocommerce" &&
                        pluginBody?.applied === true &&
                        pluginBody?.external_id != null &&
                        String(pluginBody.external_id) !== "" &&
                        dispatchCmd?.action === "create_product" &&
                        dispatchCmd.product_id;
                    if (wooCreated) {
                        const newExt = String(pluginBody.external_id);
                        const prod = await Product.findByPk(dispatchCmd.product_id);
                        if (prod && prod.store_id === store.id) {
                            await prod.update({ platform_product_id: newExt });
                            await prod.reload();
                            await fanOutAfterProductUpsert(prod);
                        }
                    }
                }
            }
        }

        await job.update({ status: "completed", next_attempt_at: new Date(), last_error: null });
        await SyncEventLog.update(
            { status: "processed", error_message: null },
            { where: { store_id: job.store_id, idempotency_key: job.idempotency_key } }
        );
        console.log("[sync-ingest] processJob completed", { jobId: job.id, entity: job.entity_type });
        return true;
    } catch (error) {
        const errMsg =
            error?.parent?.sqlMessage || error?.original?.sqlMessage || error?.message || String(error);
        await job.reload().catch(() => {});
        const attemptsNow = job.attempts ?? 0;
        const nextDelayMs = Math.min(2 ** Math.max(0, attemptsNow - 1) * 1000, 5 * 60 * 1000);
        const exhausted = attemptsNow >= (job.max_attempts ?? 5);
        await job.update({
            status: exhausted ? "failed" : "queued",
            next_attempt_at: new Date(Date.now() + nextDelayMs),
            last_error: errMsg
        });
        if (exhausted) {
            await SyncDeadLetter.create({
                store_id: job.store_id,
                job_id: job.id,
                queue_type: job.queue_type,
                entity_type: job.entity_type,
                idempotency_key: job.idempotency_key,
                payload: job.payload,
                error_message: errMsg
            });
        }
        await SyncEventLog.update(
            { status: exhausted ? "failed" : "queued", error_message: errMsg },
            { where: { store_id: job.store_id, idempotency_key: job.idempotency_key } }
        );
        console.error("[sync-ingest] processJob error", {
            jobId: job.id,
            entity: job.entity_type,
            operation: job.operation,
            exhausted,
            attempts: attemptsNow,
            errMsg,
            validationErrors: error?.errors?.map?.((e) => `${e.path}: ${e.message}`) || undefined
        });
        if (exhausted) {
            console.error(
                `[sync-worker] job ${job.id} exhausted (${job.entity_type}/${job.operation}):`,
                errMsg
            );
        }
        return false;
    }
}

/**
 * Process queued ingest jobs for one store until none remain (used after catalog pull/import).
 */
export async function drainQueuedIngestJobsForStore(storeId, maxJobs = 8000) {
    let processed = 0;
    while (processed < maxJobs) {
        const job = await SyncJob.findOne({
            where: {
                store_id: storeId,
                queue_type: "ingest",
                status: "queued",
                next_attempt_at: { [Op.lte]: new Date() }
            },
            order: [["id", "ASC"]]
        });
        if (!job) break;
        await processJob(job);
        processed += 1;
    }
    if (processed > 0) {
        console.log("[full-sync] drained ingest jobs", { storeId, processed });
    }
    return processed;
}

function needsPlatformCreate(platform, platformProductId) {
    const raw = String(platformProductId ?? "").trim();
    if (!raw) return true;
    if (/^mobile-/i.test(raw)) return true;
    if (platform === "woocommerce") {
        return !/^\d+$/.test(raw);
    }
    if (platform === "shopify") {
        return !/^\d+$/.test(raw);
    }
    return true;
}

/**
 * Queue dispatch jobs so every Product row for this store is applied on the connector (DB → store).
 */
export async function enqueuePushDbProductsToStore(store, runLogId = null) {
    const rows = await Product.findAll({
        where: { store_id: store.id },
        order: [["id", "ASC"]]
    });
    const runSuffix = runLogId != null ? `-${runLogId}` : "";
    let seq = 0;
    for (const p of rows) {
        if (needsPlatformCreate(store.platform, p.platform_product_id)) {
            if (store.platform === "shopify") {
                console.warn("[full-sync] skip Shopify push-create for product without numeric platform id", {
                    productId: p.id
                });
                continue;
            }
            await enqueueSyncJob({
                storeId: store.id,
                queueType: "dispatch",
                entityType: "product",
                operation: "create",
                idempotencyKey: `fullsync-push-create-${store.id}-${p.id}${runSuffix}-${seq}`,
                payload: {
                    command: {
                        action: "create_product",
                        product_id: p.id
                    }
                },
                runLogId
            });
        } else {
            await enqueueSyncJob({
                storeId: store.id,
                queueType: "dispatch",
                entityType: "product",
                operation: "update",
                idempotencyKey: `fullsync-push-update-${store.id}-${p.id}${runSuffix}-${seq}`,
                payload: {
                    command: {
                        action: "mobile_resync_product",
                        internal_id: p.id
                    }
                },
                runLogId
            });
        }
        seq += 1;
    }
    console.log("[full-sync] queued DB → store pushes", { storeId: store.id, products: rows.length, runLogId });
}

function mapCanonicalStatusToWoo(status) {
    const s = String(status || "").toLowerCase();
    if (s === "active" || s === "publish") return "publish";
    if (s === "private") return "private";
    return "draft";
}

/**
 * For Woo full sync: create missing Woo catalog rows + dispatch creates for peer-store products (same user, same SKU).
 */
export async function enqueuePeerProductsMissingOnWoo(wooStore, runLogId = null) {
    if (!wooStore || wooStore.platform !== "woocommerce") return;
    const siblings = await Store.findAll({
        where: { user_id: wooStore.user_id, id: { [Op.ne]: wooStore.id } },
        attributes: ["id"]
    });
    if (!siblings.length) return;
    const siblingIds = siblings.map((s) => s.id);
    const peerRows = await Product.findAll({
        where: { store_id: { [Op.in]: siblingIds } },
        order: [["id", "ASC"]]
    });
    const runSuffix = runLogId != null ? `-${runLogId}` : "";
    let queued = 0;
    for (const pp of peerRows) {
        const sku = pp.sku != null ? String(pp.sku).trim() : "";
        if (!sku) continue;
        const exists = await Product.findOne({ where: { store_id: wooStore.id, sku } });
        if (exists) continue;
        const tempPid = `import-${Date.now()}-${pp.id}`;
        const row = await Product.create({
            store_id: wooStore.id,
            platform: "woocommerce",
            platform_product_id: tempPid,
            title: pp.title || "Product",
            sku,
            price: pp.price ?? null,
            inventory_quantity: pp.inventory_quantity ?? null,
            status: mapCanonicalStatusToWoo(pp.status),
            description: pp.description ?? null,
            short_description: pp.short_description ?? null,
            image_url: pp.image_url ?? null,
            image_alt_text: pp.image_alt_text ?? null,
            source: "backend"
        });
        const skuKey = crypto.createHash("sha1").update(`${wooStore.id}:${sku}`).digest("hex").slice(0, 16);
        await enqueueSyncJob({
            storeId: wooStore.id,
            queueType: "dispatch",
            entityType: "product",
            operation: "create",
            idempotencyKey: `peer-to-woo-${skuKey}${runSuffix}`,
            payload: {
                command: {
                    action: "create_product",
                    product_id: row.id
                }
            },
            runLogId
        });
        queued += 1;
    }
    if (queued > 0) {
        console.log("[full-sync] queued peer → Woo creates", { wooStoreId: wooStore.id, queued });
    }
}

export async function processQueuedJobs(limit = 25) {
    const jobs = await SyncJob.findAll({
        where: {
            status: "queued",
        },
        order: [["next_attempt_at", "ASC"]],
        limit
    });

    let processed = 0;
    for (const job of jobs) {
        if (new Date(job.next_attempt_at).getTime() > Date.now()) {
            continue;
        }
        const ran = await processJob(job);
        if (ran) processed += 1;
    }
    return processed;
}

export async function createRunLog(storeId, triggerType = "delta") {
    return SyncRunLog.create({ store_id: storeId, trigger_type: triggerType, status: "running" });
}

export async function finishRunLog(runLogId, status, totals = {}, notes = "") {
    await SyncRunLog.update({
        status,
        totals,
        notes,
        finished_at: new Date()
    }, { where: { id: runLogId } });
}

