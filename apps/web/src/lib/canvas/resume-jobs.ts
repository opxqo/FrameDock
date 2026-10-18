// FrameDock: after a reload, pick up generations that a server job (apps/server/src/jobs) is still producing.
// Generation code stores the job id on the node (`metadata.jobId`) or on the image placeholder
// (`images[i].jobId`); resetInterruptedGeneration leaves those loading, and this module polls the job, writes
// every returned output back into the node (the shown count follows what the provider returned) and acks it.
import { resolveImageUrl } from "@/services/image-storage";
import type { CanvasNodeData, CanvasNodeImage, CanvasNodeMetadata } from "@/types/canvas";

export type JobFile = { store: string; key: string; mime: string; size: number; width?: number; height?: number };
export type PublicJob = { id: string; kind: string; state: string; error?: string | null; result?: (JobFile & { files?: JobFile[] }) | null };

const TERMINAL = new Set(["succeeded", "failed", "canceled", "unknown"]);
const POLL_MS = 3000;

export function jobFiles(job: PublicJob): JobFile[] {
    if (!job.result) return [];
    return job.result.files?.length ? job.result.files : [job.result];
}

export function pendingJobIds(node: CanvasNodeData) {
    const ids = (node.metadata?.images || []).filter((image) => image.status === "loading" && image.jobId).map((image) => image.jobId as string);
    if (node.metadata?.status === "loading" && node.metadata.jobId) ids.push(node.metadata.jobId);
    return [...new Set(ids)];
}

function imageEntry(file: JobFile, url: string, id: string): CanvasNodeImage {
    return { id, status: "success", content: url, storageKey: file.key, naturalWidth: file.width || 0, naturalHeight: file.height || 0, bytes: file.size, mimeType: file.mime };
}

/**
 * Metadata patch for one finished job. Pure: `urls` are the resolved object URLs for jobFiles(job).
 * Image placeholders for the job are replaced by the first output; extra outputs are appended right after it.
 */
export function applyJobResult(metadata: CanvasNodeMetadata, job: PublicJob, urls: string[], newId: () => string): CanvasNodeMetadata {
    const files = jobFiles(job);
    const failed = job.state !== "succeeded" || !files.length;
    const errorDetails = failed ? job.error || (job.state === "unknown" ? "任务状态未知，可在任务列表里重新提交" : "生成失败") : undefined;
    const images = metadata.images;
    if (images?.some((image) => image.jobId === job.id)) {
        const next = images.flatMap((image) => {
            if (image.jobId !== job.id) return [image];
            if (failed) return [{ ...image, status: "error" as const, errorDetails, jobId: undefined }];
            return files.map((file, index) => imageEntry(file, urls[index] || "", index === 0 ? image.id : newId()));
        });
        const settled = !next.some((image) => image.status === "loading");
        const primary = next.find((image) => image.id === metadata.primaryImageId && image.status === "success") || next.find((image) => image.status === "success");
        return {
            ...metadata,
            images: next,
            ...(primary ? { primaryImageId: primary.id, content: primary.content, storageKey: primary.storageKey, naturalWidth: primary.naturalWidth, naturalHeight: primary.naturalHeight, bytes: primary.bytes, mimeType: primary.mimeType } : {}),
            ...(settled ? { status: primary ? ("success" as const) : ("error" as const), errorDetails: primary ? undefined : errorDetails } : {}),
        };
    }
    if (metadata.jobId !== job.id) return metadata;
    if (failed) return { ...metadata, jobId: undefined, status: "error", errorDetails };
    const [first, ...rest] = files;
    const extra = rest.map((file, index) => imageEntry(file, urls[index + 1] || "", newId()));
    const firstEntry = job.kind === "image" ? imageEntry(first, urls[0] || "", newId()) : undefined;
    return {
        ...metadata,
        jobId: undefined,
        status: "success",
        errorDetails: undefined,
        content: urls[0] || metadata.content,
        storageKey: first.key,
        naturalWidth: first.width || metadata.naturalWidth,
        naturalHeight: first.height || metadata.naturalHeight,
        bytes: first.size,
        mimeType: first.mime,
        ...(firstEntry && extra.length ? { images: [firstEntry, ...extra], primaryImageId: firstEntry.id } : {}),
    };
}

async function fetchJob(id: string): Promise<PublicJob | null> {
    const response = await fetch(`/api/jobs/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.status === 404) return { id, kind: "image", state: "failed", error: "任务记录已不存在，请重新生成" };
    if (!response.ok) return null;
    return ((await response.json()) as { job: PublicJob }).job;
}

/**
 * Polls every pending job on these nodes until it settles, then calls `apply(nodeId, job, urls)`.
 * Returns a stop function (call it when the project closes).
 */
export function watchPendingJobs(nodes: CanvasNodeData[], apply: (nodeId: string, job: PublicJob, urls: string[]) => void) {
    let stopped = false;
    const pending = nodes.flatMap((node) => pendingJobIds(node).map((jobId) => ({ nodeId: node.id, jobId })));
    for (const { nodeId, jobId } of pending) {
        void (async () => {
            while (!stopped) {
                const job = await fetchJob(jobId).catch(() => null);
                if (job && TERMINAL.has(job.state)) {
                    const urls = await Promise.all(jobFiles(job).map((file) => resolveImageUrl(file.key, "")));
                    if (stopped) return;
                    apply(nodeId, job, urls);
                    if (job.state === "succeeded") await fetch(`/api/jobs/${encodeURIComponent(jobId)}/ack`, { method: "POST" }).catch(() => undefined);
                    return;
                }
                await new Promise((resolve) => window.setTimeout(resolve, POLL_MS));
            }
        })();
    }
    return () => {
        stopped = true;
    };
}
