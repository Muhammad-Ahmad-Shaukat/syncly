import IORedis from "ioredis";
import { Queue, Worker } from "bullmq";
import { SyncJob } from "../../db/models.js";
import { processJob } from "./sync-service.js";

const QUEUE_NAME = "syncly-sync-jobs";

let sharedConnection = null;
let queueInstance = null;
let workerStarted = false;

function isBullEnabled() {
    return (
        process.env.SYNC_USE_BULL === "true" &&
        !!(process.env.REDIS_URL || process.env.REDIS_HOST)
    );
}

function getConnection() {
    if (sharedConnection) return sharedConnection;
    const url = process.env.REDIS_URL;
    if (url) {
        sharedConnection = new IORedis(url, { maxRetriesPerRequest: null });
    } else {
        sharedConnection = new IORedis({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: Number(process.env.REDIS_PORT || 6379),
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null
        });
    }
    return sharedConnection;
}

function getQueue() {
    if (!isBullEnabled()) return null;
    if (!queueInstance) {
        queueInstance = new Queue(QUEUE_NAME, { connection: getConnection() });
    }
    return queueInstance;
}

/**
 * After a row is created/loaded in `sync_jobs`, push to Bull for async processing.
 */
export async function maybeQueueSyncJobInRedis(jobRow) {
    if (!isBullEnabled() || !jobRow) return;
    if (jobRow.status !== "queued") return;
    const q = getQueue();
    if (!q) return;
    const jobId = `sj-${jobRow.id}`;
    await q.add(
        "processSyncJob",
        { syncJobId: jobRow.id },
        {
            jobId,
            attempts: jobRow.max_attempts || 5,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: 500,
            removeOnFail: 2000
        }
    );
}

export function startBullSyncWorker() {
    if (!isBullEnabled() || workerStarted) return;
    const connection = getConnection();
    const worker = new Worker(
        QUEUE_NAME,
        async (bullJob) => {
            const { syncJobId } = bullJob.data || {};
            if (!syncJobId) return;
            const row = await SyncJob.findByPk(syncJobId);
            if (!row) return;
            if (row.status !== "queued") return;
            if (new Date(row.next_attempt_at).getTime() > Date.now()) {
                return;
            }
            await processJob(row);
        },
        { connection: connection.duplicate() }
    );
    worker.on("failed", (j, err) => {
        console.error(`[bull-sync] job ${j?.id} failed:`, err?.message);
    });
    worker.on("completed", (j) => {
        if (process.env.SYNC_BULL_LOG === "true") {
            console.log(`[bull-sync] job ${j.id} completed`);
        }
    });
    workerStarted = true;
    console.log("[bull-sync] Worker started (SYNC_USE_BULL=true, Redis connected)");
}
