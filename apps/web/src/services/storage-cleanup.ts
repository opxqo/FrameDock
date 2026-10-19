import { listServerEntries } from "@/lib/server-storage";
import { cleanupUnusedMedia } from "@/services/file-storage";
import { cleanupUnusedImages } from "@/services/image-storage";
import { listJobs } from "@/services/api/jobs";

// FrameDock: unused-media cleanup must only delete what *nothing* references. A tab's in-memory state can be
// stale (another tab generated images after it loaded), and files are written before the node that uses them is
// saved. So every saved value on the server (canvases, assets, libraries, workbench logs) counts as in use too,
// files younger than GRACE_MS are never touched, and if the server copy cannot be read nothing is deleted.
const GRACE_MS = 10 * 60 * 1000;
const REFERENCE_STORES = ["app_state", "image_generation_logs", "video_generation_logs", "local_storage"] as const;

function parseMaybeJson(value: unknown) {
    if (typeof value !== "string") return value;
    try {
        return JSON.parse(value) as unknown;
    } catch {
        return value;
    }
}

// Background task results stay too: they are the local copy of what was paid for (the YFAI panel shows them,
// and the provider keeps them only ~15 days). They are listed as references so cleanup keeps them.
async function jobResultReferences() {
    const jobs = await listJobs({ state: "succeeded", limit: 500 });
    return jobs.flatMap((job) => (job.result?.files ?? (job.result ? [job.result] : [])).map((file) => ({ storageKey: file.key })));
}

async function serverReferences() {
    const entries = await Promise.all(REFERENCE_STORES.map((store) => listServerEntries(store)));
    return entries.flat().map((entry) => parseMaybeJson(entry.value));
}

let running: Promise<void> | null = null;

export function cleanupUnusedStorage(localData: unknown) {
    // One pass at a time; a request during a pass is covered by the next deletion trigger.
    if (running) return running;
    running = (async () => {
        try {
            const used = [localData, await serverReferences(), await jobResultReferences()];
            await cleanupUnusedImages(used, GRACE_MS);
            await cleanupUnusedMedia(used, GRACE_MS);
        } catch (error) {
            console.warn("FrameDock: skipped media cleanup", error);
        }
    })().finally(() => {
        running = null;
    });
    return running;
}
