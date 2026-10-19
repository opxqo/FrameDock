import { nanoid } from "nanoid";
import { logContextFor } from "@/services/api/log-context";

// FrameDock: client for the server's durable job engine (apps/server/src/jobs). A job keeps running when the
// page is closed; the page only submits it, watches it, and picks the result up from the shared kv storage.

export type JobState = "queued" | "submitting" | "running" | "succeeded" | "failed" | "canceled" | "unknown";
export type JobFile = { store: string; key: string; mime: string; size: number; width?: number; height?: number; durationMs?: number };
/** The first output at the top level; `files` lists every output (image batches). */
export type JobResult = JobFile & { files?: JobFile[] };
export type Job = {
    id: string;
    kind: "image" | "video" | "audio" | "text";
    adapter: string;
    model: string;
    state: JobState;
    remoteTaskId: string | null;
    /** The provider's request id (YFAI: X-Request-Id) — what its call log is searched by. */
    requestId: string | null;
    result: JobResult | null;
    error: string | null;
    projectId: string | null;
    nodeId: string | null;
    updatedAt: number;
    deliveredAt: number | null;
    createdAt: number;
    finishedAt: number | null;
    /** What the provider reported besides the result, e.g. YFAI's parameter-adjustment receipt. */
    notes: JobNotes | null;
    /** The start of the prompt (up to 200 characters). */
    prompt: string | null;
    /** Only on a single-job read. */
    request?: unknown;
};
/** Provider remarks (apps/server/src/jobs/types.ts JobNotes). */
export type JobNotes = {
    paramAdjustments?: Array<{ param: string; requested: unknown; applied: unknown; reason: string }>;
    /** The id the provider's account ledger uses for this call. */
    ledgerId?: string;
    /** Actual cost in the provider's display unit (YFAI ⚡). */
    cost?: number;
    lane?: string;
};
export type JobInput = {
    kind: Job["kind"];
    adapter: string;
    model: string;
    request: unknown;
    credentials: { baseUrl: string; apiKey: string };
    signal?: AbortSignal;
};

/** Where the server keeps reference files while a job needs them (cleaned up when the job ends). */
const REFERENCE_STORE = "job_refs";
const SETTLED: JobState[] = ["succeeded", "failed", "canceled", "unknown"];
const RESYNC_MS = 15_000;

const kvUrl = (store: string, key: string) => `/api/kv/${encodeURIComponent(store)}/${encodeURIComponent(key)}`;

async function jobRequest(path: string, init?: RequestInit): Promise<Job> {
    const response = await fetch(`/api/jobs${path}`, { cache: "no-store", ...init });
    const body = (await response.json().catch(() => ({}))) as { job?: Job; error?: string };
    if (!response.ok || !body.job) throw Object.assign(new Error(body.error || `FrameDock jobs ${response.status}`), { status: response.status });
    return body.job;
}

export function isSettledJob(job: Job) {
    return SETTLED.includes(job.state);
}

export async function createJob({ signal, ...input }: JobInput): Promise<Job> {
    // The log context says which node/project/run the job belongs to (same data the API call log uses).
    const context = logContextFor(signal);
    return jobRequest("", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, projectId: context.projectId, nodeId: context.nodeId, runId: context.runId, idempotencyKey: `${context.nodeId || "page"}:${nanoid()}` }),
        signal,
    });
}

export async function listJobs(filter: { node?: string; project?: string; state?: JobState; kind?: Job["kind"]; adapter?: string; undelivered?: boolean; limit?: number } = {}, signal?: AbortSignal): Promise<Job[]> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) if (value !== undefined) query.set(key, value === true ? "1" : String(value));
    const response = await fetch(`/api/jobs?${query}`, { cache: "no-store", signal });
    const body = (await response.json().catch(() => ({}))) as { jobs?: Job[]; error?: string };
    if (!response.ok || !body.jobs) throw Object.assign(new Error(body.error || `FrameDock jobs ${response.status}`), { status: response.status });
    return body.jobs;
}

/** Tells the server this client has taken the result, so it stops showing up as undelivered. */
export const ackJob = (id: string) => jobRequest(`/${encodeURIComponent(id)}/ack`, { method: "POST" });

/** Same-origin url of a stored result file (images, videos and audio are served by the kv store). */
export function jobFileUrl(job: Job, index = 0) {
    const file = job.result?.files?.[index] ?? (index === 0 ? job.result : undefined);
    return file ? kvUrl(file.store, file.key) : "";
}

/** Stores billing facts looked up at the provider after the job finished. */
export const addJobNotes = (id: string, notes: Pick<JobNotes, "ledgerId" | "cost" | "lane">) => jobRequest(`/${encodeURIComponent(id)}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notes) });

/** Has the server download a finished job's result from the provider again (the key is used for that call only). */
export const restoreJobResult = (id: string, apiKey: string) => jobRequest(`/${encodeURIComponent(id)}/restore`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey }) });

/** True when the first stored result file of a finished job is still there. */
export async function hasJobFile(job: Job) {
    const url = jobFileUrl(job);
    if (!url) return false;
    const response = await fetch(url, { method: "HEAD", cache: "no-store" }).catch(() => undefined);
    return Boolean(response?.ok);
}

export const getJob = (id: string, signal?: AbortSignal) => jobRequest(`/${encodeURIComponent(id)}`, { signal });
export const cancelJob = (id: string) => jobRequest(`/${encodeURIComponent(id)}/cancel`, { method: "POST" });
export const resubmitJob = (id: string) => jobRequest(`/${encodeURIComponent(id)}/resubmit`, { method: "POST" });

/** Stores a reference file on the server and returns the pointer a job request can carry. */
export async function uploadJobFile(blob: Blob) {
    const key = nanoid();
    const response = await fetch(kvUrl(REFERENCE_STORE, key), { method: "PUT", headers: { "x-kv-kind": "blob", "Content-Type": blob.type || "application/octet-stream" }, body: blob });
    if (!response.ok) throw new Error(`FrameDock storage ${response.status}: ${REFERENCE_STORE}`);
    return { store: REFERENCE_STORE, key };
}

export async function fetchJobBlob(job: Job, index = 0): Promise<Blob> {
    const file = job.result?.files?.[index] ?? (index === 0 ? job.result : undefined);
    if (!file) throw new Error("Job has no result");
    const response = await fetch(kvUrl(file.store, file.key), { cache: "no-store" });
    if (!response.ok) throw new Error(`FrameDock storage ${response.status}: ${file.store}`);
    return response.blob();
}

/** Same-origin events: every job state change this page may care about (the shared stream is opened on demand). */
export function onJobEvent(listener: (job: Job) => void) {
    anyListeners.add(listener);
    openStream();
    return () => {
        anyListeners.delete(listener);
        closeStreamIfIdle();
    };
}

// One shared event stream for every job this page is waiting on. EventSource reconnects by itself; after each
// (re)connect, and every RESYNC_MS, the watched jobs are fetched again so a missed event cannot leave a wait hanging.
type Listener = (job: Job) => void;
const listeners = new Map<string, Set<Listener>>();
let source: EventSource | null = null;

const anyListeners = new Set<Listener>();

function emit(job: Job) {
    listeners.get(job.id)?.forEach((listener) => listener(job));
    anyListeners.forEach((listener) => listener(job));
}

/** True while this page is itself waiting for the job, i.e. its caller will deliver the result. */
export const isWatchingJob = (id: string) => Boolean(listeners.get(id)?.size);

async function resync() {
    await Promise.all([...listeners.keys()].map((id) => getJob(id).then(emit, () => undefined)));
}

function openStream() {
    if (source || typeof EventSource === "undefined") return;
    source = new EventSource("/api/jobs/events");
    source.addEventListener("job", (event) => {
        try {
            emit(JSON.parse((event as MessageEvent<string>).data) as Job);
        } catch {
            // Ignore a malformed event; the periodic resync covers it.
        }
    });
    source.addEventListener("open", () => void resync());
}

function closeStreamIfIdle() {
    if (listeners.size || anyListeners.size || !source) return;
    source.close();
    source = null;
}

/**
 * Resolves with the job once it is settled (succeeded, failed, canceled, or unknown). Aborting `signal` only
 * stops this wait; the job itself keeps running on the server.
 */
export function watchJob(id: string, signal?: AbortSignal): Promise<Job> {
    return new Promise((resolve, reject) => {
        let finished = false;
        let timer: ReturnType<typeof setInterval> | undefined;
        const done = (action: () => void) => {
            if (finished) return;
            finished = true;
            clearInterval(timer);
            signal?.removeEventListener("abort", onAbort);
            const set = listeners.get(id);
            set?.delete(listener);
            if (set && !set.size) listeners.delete(id);
            closeStreamIfIdle();
            action();
        };
        const listener: Listener = (job) => {
            if (isSettledJob(job)) done(() => resolve(job));
        };
        const onAbort = () => done(() => reject(new DOMException("Aborted", "AbortError")));
        if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
        signal?.addEventListener("abort", onAbort, { once: true });
        if (!listeners.has(id)) listeners.set(id, new Set());
        listeners.get(id)?.add(listener);
        openStream();
        // A vanished job (404) can never settle, so that ends the wait; any other error is retried at the next resync.
        const check = () =>
            getJob(id, signal).then(listener, (error: unknown) => {
                if ((error as { status?: number }).status === 404) done(() => reject(error));
            });
        void check();
        timer = setInterval(() => void check(), RESYNC_MS);
    });
}

export type AuditFinding = { code: "undelivered" | "missing_file" | "provider_done" | "stalled" | "unknown"; jobId: string; kind: string; model: string; nodeId: string | null; projectId: string | null; remoteTaskId: string | null; requestId: string | null; message: string; providerStatus?: "running" | "succeeded" | "failed" | "unreachable"; at: number };
export type AuditReport = { since: number; summary: Record<string, number> & { total: number }; findings: AuditFinding[] };

/** Cross-checks every recent job with the stored files and, for open jobs, with the provider. */
export async function fetchJobAudit(days = 7, signal?: AbortSignal): Promise<AuditReport> {
    const response = await fetch(`/api/jobs/audit?days=${days}`, { cache: "no-store", signal });
    if (!response.ok) throw new Error(`FrameDock jobs ${response.status}`);
    return response.json();
}
