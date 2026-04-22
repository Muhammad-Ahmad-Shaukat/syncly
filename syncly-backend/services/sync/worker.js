import { processQueuedJobs } from "./sync-service.js";

let workerHandle = null;

export function startSyncWorker() {
    if (workerHandle) return;
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

