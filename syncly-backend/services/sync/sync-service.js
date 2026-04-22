import crypto from "crypto";
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

function hashPayload(payload) {
    return crypto.createHash("sha256").update(JSON.stringify(payload || {})).digest("hex");
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
    const [job] = await SyncJob.findOrCreate({
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
    const Model = modelForEntity(entityType);
    const externalField = externalIdField(entityType);
    const externalId = String(data?.external_id ?? data?.id ?? "");
    if (!externalId) throw new Error("Missing external_id");

    const modelDefaults = {
        store_id: storeId,
        platform: "woocommerce",
        [externalField]: externalId,
        source: origin,
        source_updated_at: sourceUpdatedAt ? new Date(sourceUpdatedAt) : new Date(),
        last_synced_at: new Date(),
        sync_hash: hashPayload(data),
        raw_platform_data: data,
    };

    if (entityType === "product") {
        modelDefaults.title = data.title || "Untitled Product";
        modelDefaults.status = data.status || "draft";
        modelDefaults.price = data.price ?? null;
        modelDefaults.inventory_quantity = data.inventory_quantity ?? null;
        modelDefaults.sku = data.sku || null;
    }
    if (entityType === "order") {
        modelDefaults.order_number = data.order_number || null;
        modelDefaults.status = data.status || null;
        modelDefaults.total_amount = data.total_amount ?? null;
        modelDefaults.currency = data.currency || null;
    }
    if (entityType === "customer") {
        modelDefaults.email = data.email || null;
        modelDefaults.first_name = data.first_name || null;
        modelDefaults.last_name = data.last_name || null;
        modelDefaults.status = data.status || "active";
    }

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
        }
    }

    await SyncMapping.upsert({
        store_id: storeId,
        entity_type: entityType,
        external_id: externalId,
        internal_id: record.id,
        source: origin,
        source_updated_at: sourceUpdatedAt ? new Date(sourceUpdatedAt) : new Date(),
        last_synced_at: new Date(),
        version: record.version || 1
    });

    return record;
}

export async function processJob(job) {
    try {
        await job.update({ status: "processing", attempts: job.attempts + 1 });
        const payload = job.payload || {};

        if (job.queue_type === "ingest") {
            const records = Array.isArray(payload.records) ? payload.records : [payload.record].filter(Boolean);
            for (const record of records) {
                await upsertCanonicalRecord({
                    storeId: job.store_id,
                    entityType: job.entity_type,
                    data: record,
                    origin: payload.origin || "woocommerce",
                    sourceUpdatedAt: record?.updated_at || payload?.source_updated_at || null
                });
            }
        } else if (job.queue_type === "dispatch") {
            const store = await Store.findByPk(job.store_id);
            if (!store?.plugin_callback_url || !store?.webhook_secret) {
                throw new Error("Store callback URL or webhook secret is missing");
            }
            const response = await fetch(`${store.plugin_callback_url}/commands`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${store.connector_access_token || ""}`,
                    "X-Syncly-Webhook-Secret": store.webhook_secret
                },
                body: JSON.stringify(payload.command)
            });
            if (!response.ok) {
                throw new Error(`Plugin command failed with status ${response.status}`);
            }
        }

        await job.update({ status: "completed", next_attempt_at: new Date(), last_error: null });
        return true;
    } catch (error) {
        const nextDelayMs = Math.min(2 ** job.attempts * 1000, 5 * 60 * 1000);
        const exhausted = job.attempts >= job.max_attempts;
        await job.update({
            status: exhausted ? "failed" : "queued",
            next_attempt_at: new Date(Date.now() + nextDelayMs),
            last_error: error.message
        });
        if (exhausted) {
            await SyncDeadLetter.create({
                store_id: job.store_id,
                job_id: job.id,
                queue_type: job.queue_type,
                entity_type: job.entity_type,
                idempotency_key: job.idempotency_key,
                payload: job.payload,
                error_message: error.message
            });
        }
        return false;
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
        await processJob(job);
        processed += 1;
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

