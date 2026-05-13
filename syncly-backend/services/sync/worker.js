import { startBullSyncWorker } from "./bull-sync.js";
import { processQueuedJobs } from "./sync-service.js";

let workerHandle = null;

export function startSyncWorker() {
    if (workerHandle) return;
    if (process.env.SYNC_USE_BULL === "true" && (process.env.REDIS_URL || process.env.REDIS_HOST)) {
        startBullSyncWorker();
        return;
    }
    const intervalMs = Number(process.env.SYNC_WORKER_INTERVAL_MS || 3000);
    workerHandle = setInterval(async () => {
        try {
            const processed = await processQueuedJobs(25);
            if (processed > 0) {
                console.log(`[sync-worker] processed jobs: ${processed}`);
            }
        } catch (error) {
            console.error("[sync-worker] error:", error.message);
        }
    }, intervalMs);
}

