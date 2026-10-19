import type { YfaiPrice } from "@/lib/yfai-pricing";
import axios from "axios";
import { nanoid } from "nanoid";
import i18n from "@/i18n";
import { findYfaiModel, isYfaiUrl, parseYfaiParams, validateYfaiParams, yfaiDefaults, yfaiParamVisible, YFAI_BASE_URL, type YfaiModel, type YfaiValue, resolveYfaiAutoParams } from "@/lib/yfai-catalog";
import { withLocalProxy, type AiConfig } from "@/stores/use-config-store";
import { parseYfaiAvailableCredits } from "@/lib/yfai-balance";
import { parseYfaiBalance, parseYfaiUsagePage, yfaiTaskBilling, type YfaiBalance } from "@/lib/yfai-account";
import { compileReferenceSyntax } from "@/lib/reference-syntax";
import { ackJob, addJobNotes, createJob, fetchJobBlob, type Job, listJobs, watchJob } from "@/services/api/jobs";
import { imageToDataUrl } from "@/services/image-storage";
import { getMediaBlob, resolveMediaUrl } from "@/services/file-storage";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

type Options = { signal?: AbortSignal; onJob?: (jobId: string) => void };
type MediaOptions = Options & { videos?: ReferenceVideo[]; audios?: ReferenceAudio[] };
export type YfaiTask = { task_id?: string; id?: string; status?: string; is_final?: boolean; output_url?: string; result_url?: string; url?: string; result?: Record<string, unknown>; data?: unknown; error?: unknown; [key: string]: unknown };
const headers = (key: string) => (key ? { Authorization: `Bearer ${key}` } : {});
export function yfaiUrl(path: string) { return withLocalProxy(`${YFAI_BASE_URL.replace(/\/v1$/, "")}${path}`); }
function errorMessage(value: unknown): string {
    if (typeof value === "string") return value;
    if (value && typeof value === "object") { const record = value as Record<string, unknown>; return errorMessage(record.error) || errorMessage(record.message) || errorMessage(record.msg); }
    return "";
}
export function unwrapYfai(payload: unknown): YfaiTask {
    if (!payload || typeof payload !== "object") throw new Error(i18n.t("yfai.invalidResponse"));
    const data = payload as YfaiTask;
    if ((data.error && !data.is_final) || (data.code !== undefined && ![0, 200, 201, 202, "0", "200", "201", "202"].includes(data.code as number | string))) throw new Error(errorMessage(data) || i18n.t("yfai.invalidResponse"));
    return data.code !== undefined && data.data && !Array.isArray(data.data) && typeof data.data === "object" ? data.data as YfaiTask : data;
}
export async function yfaiRequest(path: string, apiKey: string, body?: unknown, options?: Options): Promise<YfaiTask> {
    try {
        const response = body === undefined
            ? await axios.get(yfaiUrl(path), { headers: headers(apiKey), signal: options?.signal, timeout: 30_000 })
            : await axios.post(yfaiUrl(path), body, { headers: headers(apiKey), signal: options?.signal, timeout: 120_000 });
        return unwrapYfai(response.data);
    } catch (error) {
        if (axios.isCancel(error) || options?.signal?.aborted) throw error;
        if (axios.isAxiosError(error)) throw Object.assign(new Error(errorMessage(error.response?.data) || `${i18n.t("yfai.requestFailed")} (${error.response?.status || error.code})`), { status: error.response?.status });
        throw error;
    }
}
export async function fetchYfaiCatalog(options?: Options): Promise<YfaiModel[]> {
    const payload = await yfaiRequest("/v1/logical-models", "", undefined, options);
    if (!Array.isArray(payload.models)) throw new Error(i18n.t("yfai.invalidResponse"));
    const models = (payload.models as YfaiModel[]).filter((model) => model.id && ["chat", "image", "video", "audio"].includes(model.category) && model.param_schema);
    if (!models.length) throw new Error(i18n.t("yfai.invalidResponse"));
    return models;
}
export async function uploadYfaiFile(apiKey: string, file: Blob, name: string, options?: Options) {
    const form = new FormData();
    form.append("file", file, name);
    const result = await yfaiRequest("/v1/files", apiKey, form, options);
    if (typeof result.url !== "string" || !/^https:\/\//.test(result.url)) throw new Error(i18n.t("yfai.uploadFailed"));
    return result.url;
}
export function yfaiRouting(config: Pick<AiConfig, "yfaiParams">, model: YfaiModel) {
    const selected = parseYfaiParams(config.yfaiParams, model.id)._lane_ids;
    const laneIds = Array.isArray(selected) ? [...new Set(selected.filter((id) => id.trim()))] : [];
    return laneIds.length ? { lane_ids: laneIds } : {};
}
export function buildYfaiParams(config: Pick<AiConfig, "model" | "yfaiParams">, model: YfaiModel, refs: { images?: string[]; videos?: string[]; audios?: string[]; roles?: Array<ReferenceImage["role"]> } = {}) {
    const { _lane_ids, ...overrides } = parseYfaiParams(config.yfaiParams, model.id);
    const params = { ...yfaiDefaults(model), ...overrides };
    // Connection roles decide frame order; otherwise an explicit model mode wins.
    const images = refs.images?.length ? refs.images : Array.isArray(overrides.images) ? overrides.images : [];
    const videoCount = refs.videos?.length || (Array.isArray(overrides.videos) ? overrides.videos.length : 0);
    const audioCount = refs.audios?.length || (Array.isArray(overrides.audios) ? overrides.audios.length : 0);
    if (model.param_schema.mode && overrides.mode === undefined) {
        // MJ accepts 1–4 image prompts in text-to-image. Blend is a separate,
        // explicit operation, not the automatic meaning of multiple references.
        const mode = model.id === "mj_imagine" ? "text-to-image" : model.category === "image" ? images.length > 1 ? "multi-reference" : images.length ? "image-edit" : "text-to-image"
            : videoCount || audioCount || refs.roles?.includes("reference") || images.length > 2 ? "reference" : images.length > 1 ? "first-last" : images.length ? "first-frame" : "text-to-video";
        if (model.param_schema.mode.enum?.includes(mode)) params.mode = mode;
    }
    for (const key of ["images", "videos", "audios"] as const) {
        if (!refs[key]?.length) continue;
        if (key === "images" && model.param_schema.url?.type === "upload") { params.url = refs.images![0]; continue; }
        if (!model.param_schema[key]) throw new Error(`${model.display_name}: ${key} ${i18n.t("yfai.unsupported")}`);
        params[key] = refs[key]!;
    }
    if (images.length && model.param_schema.url?.type === "upload") { params.url = images[0]; delete params.images; }
    if (Array.isArray(params.url)) params.url = params.url[0] || "";
    // Hidden parameters must not leak stale values when changing mode.
    for (const [key, spec] of Object.entries(model.param_schema)) if (!yfaiParamVisible(spec, params)) delete params[key];
    return params;
}
export async function prepareYfaiParams(config: AiConfig, references: ReferenceImage[] = [], options?: MediaOptions) {
    const model = findYfaiModel(config.model, config.yfaiModels);
    if (!model) throw new Error(i18n.t("yfai.unknownModel"));
    const ordered = [...references].sort((a, b) => (a.role === "first" ? -1 : a.role === "last" ? 1 : 0) - (b.role === "first" ? -1 : b.role === "last" ? 1 : 0));
    // Validate counts/modes before uploading any media.
    const placeholders = resolveYfaiAutoParams(model, buildYfaiParams(config, model, { images: ordered.map((_, i) => `image-${i}`), videos: options?.videos?.map((_, i) => `video-${i}`), audios: options?.audios?.map((_, i) => `audio-${i}`), roles: ordered.map((image) => image.role) }), config);
    validateYfaiParams(model, { ...placeholders, prompt: "validation" });
    const upload = async (source: string, name: string, maxBytes?: number) => {
        const response = await fetch(withLocalProxy(source), { signal: options?.signal });
        if (!response.ok) throw new Error(i18n.t("yfai.uploadFailed"));
        const blob = await response.blob();
        if (blob.size > Math.min(maxBytes ?? 50 * 1024 * 1024, 50 * 1024 * 1024)) throw new Error(i18n.t("yfai.fileTooLarge", { name }));
        return uploadYfaiFile(config.apiKey, blob, name, options);
    };
    const uploadMedia = async (item: ReferenceVideo | ReferenceAudio, kind: "videos" | "audios") => {
        const blob = item.storageKey ? await getMediaBlob(item.storageKey) : null;
        const url = blob ? URL.createObjectURL(blob) : await resolveMediaUrl(item.storageKey, item.url || "");
        try { return await upload(url, item.name, model.param_schema[kind]?.max_bytes); } finally { if (blob) URL.revokeObjectURL(url); }
    };
    const [images, videos, audios] = await Promise.all([
        Promise.all(ordered.map(async (image) => upload(await imageToDataUrl(image, options), image.name || "reference.png", (model.param_schema.images || model.param_schema.url)?.max_bytes))),
        Promise.all((options?.videos || []).map((item) => uploadMedia(item, "videos"))),
        Promise.all((options?.audios || []).map((item) => uploadMedia(item, "audios"))),
    ]);
    return { model, params: resolveYfaiAutoParams(model, buildYfaiParams(config, model, { images, videos, audios, roles: ordered.map((image) => image.role) }), config) };
}
/** The runtime invoke envelope for a prepared request. Shared by the browser path and server-side jobs. */
export function buildYfaiInvoke(config: Pick<AiConfig, "yfaiParams"> & Partial<Pick<AiConfig, "size">>, model: YfaiModel, prompt: string, requested: Record<string, YfaiValue>, clientRequestId: string = `framedock-${nanoid()}`) {
    // "自动" ratio is filled here for every request path (browser, server job, settings test).
    const params = resolveYfaiAutoParams(model, requested, config);
    // max_prompt_chars is the catalog's hint, not a limit the YFAI gateway enforces (its dry-run accepts 7000 characters for MJ), so it is
    // only reported as a warning before a run (lib/yfai-preflight.ts). Sending is free if the vendor refuses: failed tasks are refunded.
    validateYfaiParams(model, { ...params, prompt });
    const { operation, ...rest } = params;
    // "图片2" in the prompt becomes the model's own way of pointing at the second reference (e.g. Seedance "@图片2").
    const count = (value: YfaiValue | undefined) => (Array.isArray(value) ? value.length : value ? 1 : 0);
    prompt = compileReferenceSyntax(prompt, model.id, { images: count(rest.images) || count(rest.url), videos: count(rest.videos), audios: count(rest.audios) });
    const imageSources = model.category === "image"
        ? (Array.isArray(rest.images) ? rest.images : typeof rest.images === "string" ? [rest.images] : typeof rest.url === "string" ? [rest.url] : []).filter((source) => source.trim())
        : [];
    return {
        model_id: model.id, modality: model.category,
        ...yfaiRouting(config, model),
        // Reference images do not imply editing: MJ's image prompts and Blend both generate.
        // The runtime reads an edit's source image from the top-level attachments envelope.
        ...(operation ? { operation } : model.category === "image" ? { operation: rest.mode === "image-edit" ? "edit" : "generate" } : {}),
        // MJ merges attachments into params.images. Sending both doubles the
        // references (3 becomes 6, beyond its 4-image limit).
        ...(imageSources.length && model.id !== "mj_imagine" ? { attachments: imageSources } : {}),
        params: { ...rest, prompt }, client_request_id: clientRequestId,
    };
}
/** Waits between attempts; tests shrink them. */
export const yfaiTimings = { pollMs: 5000, retryMs: 2000, retryCapMs: 60_000 };
/** Network drops, gateway errors and rate limits say nothing about the task itself; a cancel or a 4xx is a real answer. */
export function isTransientYfaiError(error: unknown, signal?: AbortSignal) {
    if (signal?.aborted || axios.isCancel(error) || (error instanceof DOMException && error.name === "AbortError")) return false;
    const status = (error as { status?: number }).status;
    return status === undefined || status >= 500 || status === 408 || status === 429;
}
export async function submitYfaiTask(config: AiConfig, model: YfaiModel, prompt: string, params: Record<string, YfaiValue>, options?: Options) {
    // One id for every attempt: if the first answer is lost, YFAI returns the task it already created instead of billing a second one.
    const body = buildYfaiInvoke(config, model, prompt, params);
    for (let attempt = 1; ; attempt++) {
        try { return await yfaiRequest("/api/v1/model-runtime/invoke", config.apiKey, body, options); }
        catch (error) {
            if (attempt >= 4 || !isTransientYfaiError(error, options?.signal)) throw error;
            await yfaiDelay(options?.signal, yfaiTimings.retryMs * attempt);
        }
    }
}
export async function pollYfaiTask(apiKey: string, taskId: string, options?: Options) {
    try { return await yfaiRequest(`/v1/tasks/${encodeURIComponent(taskId)}`, apiKey, undefined, options); }
    catch (error) { if ((error as { status?: number }).status === 503 || (error as { status?: number }).status === 429) return { is_final: false, status: "processing" } as YfaiTask; throw error; }
}
export function yfaiTaskUrls(task: YfaiTask, kind: "images" | "videos" | "audios") {
    const result = task.result || {};
    const items = Array.isArray(result[kind]) ? result[kind] : Array.isArray(task.data) ? task.data : [];
    const urls = items.flatMap((item: unknown) => {
        if (typeof item === "string") return [item];
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        return [record.original_url || record.url].filter((url): url is string => typeof url === "string");
    });
    if (!urls.length) { const url = task.output_url || task.result_url || task.url; if (url) urls.push(url); }
    return [...new Set(urls)].filter((url) => /^https?:\/\//.test(url));
}
/** YFAI keeps a task for at least an hour and says to poll that long: stopping early loses a result that is already paid for. */
const YFAI_WAIT_MS = 60 * 60_000;
export async function waitYfaiTask(apiKey: string, task: YfaiTask, options?: Options): Promise<YfaiTask> {
    const id = task.task_id || task.id;
    if (!id && !task.is_final) throw new Error(i18n.t("yfai.invalidResponse"));
    const withId = (reason: string) => (id ? `${reason}\n${i18n.t("yfai.taskId", { id })}` : reason);
    const deadline = Date.now() + YFAI_WAIT_MS;
    let failures = 0;
    while (Date.now() < deadline) {
        if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (task.is_final) {
            if (task.status !== "completed" || task.error) throw new Error(withId(errorMessage(task) || i18n.t("yfai.taskFailed")));
            return task;
        }
        try {
            task = await pollYfaiTask(apiKey, id!, options);
            failures = 0;
        } catch (error) {
            // A failed poll is not a failed task: keep asking through gateway errors and server restarts, back off a little.
            if (!isTransientYfaiError(error, options?.signal)) throw error instanceof Error ? Object.assign(error, { message: withId(error.message) }) : error;
            failures += 1;
            await yfaiDelay(options?.signal, Math.min(yfaiTimings.pollMs * 2 ** Math.min(failures, 4), yfaiTimings.retryCapMs));
            continue;
        }
        if (!task.is_final) await yfaiDelay(options?.signal);
    }
    throw new Error(i18n.t("yfai.timeout", { id }));
}
function yfaiDelay(signal?: AbortSignal, ms = yfaiTimings.pollMs) {
    return new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
        const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, ms);
        if (signal?.aborted) abort(); else signal?.addEventListener("abort", abort, { once: true });
    });
}
export async function requestYfaiImages(config: AiConfig, prompt: string, references: ReferenceImage[], options?: Options) {
    const { model, params } = await prepareYfaiParams(config, references, options);
    // Canvas count is an explicit per-node output choice.
    if (model.param_schema.count) params.count = Math.max(1, Number(config.count) || 1);
    const viaJob = await requestYfaiImagesViaJob(config, model, prompt, params, options);
    if (viaJob) return viaJob;
    const task = await waitYfaiTask(config.apiKey, await submitYfaiTask(config, model, prompt, params, options), options);
    const urls = yfaiTaskUrls(task, "images");
    if (!urls.length) throw new Error(i18n.t("yfai.invalidResponse"));
    return urls.map((dataUrl) => ({ id: nanoid(), dataUrl }));
}

/**
 * Runs the image as a server job: the server submits (with an idempotent id), polls for as long as YFAI keeps the task,
 * and stores the result, so closing or reloading this page can no longer lose an image that is already paid for.
 * Returns undefined when jobs are off or the server has no job support, so the caller uses the browser-driven path.
 */
async function requestYfaiImagesViaJob(config: AiConfig, model: YfaiModel, prompt: string, params: Record<string, YfaiValue>, options?: Options) {
    if (config.serverJobs === false) return undefined;
    let submitted: Job;
    try {
        submitted = await createJob({ kind: "image", adapter: "yfai", model: config.model, request: { invoke: buildYfaiInvoke(config, model, prompt, params) }, credentials: { baseUrl: YFAI_BASE_URL, apiKey: config.apiKey }, signal: options?.signal });
    } catch (error) {
        const status = (error as { status?: number }).status;
        // No answer, or no /api/jobs on this server: fall back. Any other reply (e.g. a 400) is a real error.
        if (options?.signal?.aborted || (status !== undefined && status !== 404 && status !== 405)) throw error;
        return undefined;
    }
    options?.onJob?.(submitted.id);
    const job = await watchJob(submitted.id, options?.signal);
    if (job.state === "succeeded" && job.result) {
        const count = job.result.files?.length ?? 1;
        const images = await Promise.all(Array.from({ length: count }, async (_, index) => ({ id: nanoid(), dataUrl: URL.createObjectURL(await fetchJobBlob(job, index)) })));
        void ackJob(job.id).catch(() => undefined);
        return images;
    }
    if (job.state === "canceled") throw new DOMException("Aborted", "AbortError");
    // Say exactly which task this is, so it can be found in the provider's call log.
    const detail = [job.error || i18n.t("yfai.taskFailed"), job.remoteTaskId ? i18n.t("yfai.taskId", { id: job.remoteTaskId }) : "", job.requestId ? `Request id: ${job.requestId}` : ""].filter(Boolean).join("\n");
    throw new Error(job.state === "unknown" ? `${i18n.t("apiErrors.videoTaskUnknown")}\n${detail}` : detail);
}
/** Calendar day (Beijing time, as the ledger filters by) `days` days back. */
const ledgerStart = (days: number) => new Date(Date.now() - days * 86_400_000 + 8 * 3_600_000).toISOString().slice(0, 10);
/** One page of the account ledger (GET /v1/skills/usage), newest first, amounts signed. Free. */
export async function fetchYfaiUsage(apiKey: string, query: { days: number; cursor?: string; type?: string; size?: number }, options?: Options) {
    const params = new URLSearchParams({ size: String(query.size ?? 100), start: ledgerStart(query.days) });
    if (query.type) params.set("type", query.type);
    if (query.cursor) params.set("cursor", query.cursor);
    return parseYfaiUsagePage(await yfaiRequest(`/v1/skills/usage?${params}`, apiKey, undefined, options));
}
/**
 * The server's YFAI jobs, newest first. Finished jobs from before the ledger id was recorded are looked up once at
 * YFAI (a free GET /v1/tasks/{id} each, at most `backfill` per call) and the result is stored on the job. Older
 * tasks are returned without billing, so for those the ledger is matched by model and time (matchYfaiLedger).
 */
export async function listYfaiJobs(apiKey: string, limit = 120, backfill = 40, options?: Options): Promise<Job[]> {
    const jobs = await listJobs({ adapter: "yfai", limit }, options?.signal);
    const missing = jobs.filter((job) => job.remoteTaskId && job.notes?.ledgerId === undefined && ["succeeded", "failed"].includes(job.state)).slice(0, apiKey ? backfill : 0);
    const updated = new Map<string, Job>();
    for (let index = 0; index < missing.length; index += 4) {
        await Promise.all(
            missing.slice(index, index + 4).map(async (job) => {
                try {
                    const notes = yfaiTaskBilling(await yfaiRequest(`/v1/tasks/${encodeURIComponent(job.remoteTaskId!)}`, apiKey, undefined, options));
                    // Older tasks come back in a slim form without billing; "" records that, so they are not asked again.
                    updated.set(job.id, await addJobNotes(job.id, { ...notes, ledgerId: notes.ledgerId ?? "" }));
                } catch (error) {
                    if (options?.signal?.aborted) throw error;
                }
            }),
        );
    }
    return jobs.map((job) => updated.get(job.id) ?? job);
}
/** Total, frozen and spendable ⚡ (GET /v1/skills/balance). Free; throws when the key is rejected. */
export async function fetchYfaiBalance(apiKey: string, options?: Options): Promise<YfaiBalance> {
    return parseYfaiBalance(await yfaiRequest("/v1/skills/balance", apiKey, undefined, options));
}
/** Spendable ⚡ credits right now (balance minus what running tasks hold back). Free; undefined when it cannot be read. */
export async function fetchYfaiAvailableCredits(apiKey: string, options?: Options): Promise<number | undefined> {
    try {
        const payload = await yfaiRequest("/v1/skills/balance", apiKey, undefined, options);
        return parseYfaiAvailableCredits(payload);
    } catch {
        return undefined;
    }
}
export { isYfaiUrl };

/** Two batch requests cover the catalog; prices are account-specific, free estimates at model defaults. */
export async function fetchYfaiPrices(apiKey: string, models: YfaiModel[]): Promise<Record<string, YfaiPrice>> {
    const media = models.filter((model) => !model.deprecated && model.available !== false && model.category !== "chat");
    const prices: Record<string, YfaiPrice> = {};
    for (let offset = 0; offset < media.length; offset += 100) {
        const payload = await yfaiRequest("/v1/pricing-estimate/batch", apiKey, { items: media.slice(offset, offset + 100).map((model) => ({ model: model.id, params: resolveYfaiAutoParams(model, buildYfaiParams({ model: model.id, yfaiParams: "" }, model), {}) })) });
        if (!Array.isArray(payload.results)) continue;
        for (const result of payload.results as Array<{ model?: string; estimate?: { effective_total_rmb?: number; max_effective_total_rmb?: number; required_freeze_rmb?: number } }>) {
            const quote = result.estimate;
            if (result.model && quote && typeof quote.effective_total_rmb === "number") prices[result.model] = { price: quote.effective_total_rmb, max: quote.max_effective_total_rmb, freeze: quote.required_freeze_rmb };
        }
    }
    return prices;
}
