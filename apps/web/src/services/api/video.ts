import axios from "axios";
import { nanoid } from "nanoid";

import i18n from "@/i18n";
import { dataUrlToFile, readFileAsDataUrl } from "@/lib/image-utils";
import { clampVideoSeconds, computeVideoSize, inferVideoRatio } from "@/lib/media-size";
import { getMediaBlob, resolveMediaUrl, uploadMediaFile, type UploadedFile } from "@/services/file-storage";
import { imageToDataUrl } from "@/services/image-storage";
import { boolConfig, buildApiUrl, modelOptionName, resolveModelRequestConfig, resolveModelScript, withLocalProxy, type AiConfig } from "@/stores/use-config-store";
import { runModelPlugin } from "./model-plugin";
import { findAutodlModel, guessAutodlFamily, nearestOption } from "@/lib/autodl-catalog";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

type VideoResponse = { id: string; status?: string; error?: { message?: string }; url?: string; result_url?: string; video_url?: string; content?: { video_url?: string; url?: string } | null };
type ApiVideoResponse = VideoResponse | { code?: number | string; data?: VideoResponse | null; msg?: string; message?: string; error?: { message?: string } };
type ApiEnvelope<T> = T | { code?: number | string; data?: T | null; msg?: string; message?: string; error?: { message?: string } };
type RequestOptions = { signal?: AbortSignal };
type VideoMediaOptions = RequestOptions & { videos?: ReferenceVideo[]; audios?: ReferenceAudio[] };
const apiText = (key: string, options?: Record<string, unknown>) => i18n.t(`apiErrors.${key}`, options);

export type VideoGenerationResult = { blob?: Blob; url?: string; mimeType?: string };
export type VideoGenerationTask = { id: string; provider: "openai" | "gemini" | "minimax" | "kling" | "ark" | "wan" | "plugin"; model: string };
type AutodlVideoProvider = "minimax" | "kling" | "ark" | "wan";
type KlingResponse = { code?: number; message?: string; data?: { task_id?: string; task_status?: string; task_status_msg?: string; task_result?: { videos?: Array<{ url?: string }> | null } } };
type ArkTaskResponse = { id?: string; status?: string; content?: { video_url?: string }; error?: { message?: string } };
type WanTaskResponse = { output?: { task_id?: string; task_status?: string; video_url?: string; message?: string; code?: string }; message?: string };
type MiniMaxBaseResp = { status_code?: number; status_msg?: string };
type MiniMaxCreateResponse = { task_id?: string; base_resp?: MiniMaxBaseResp };
type MiniMaxQueryResponse = { status?: string; download_url?: string; error_message?: string; base_resp?: MiniMaxBaseResp };
type GeminiInlineData = { bytesBase64Encoded: string; mimeType: string };
type GeminiVideoOperation = {
    name?: string;
    done?: boolean;
    error?: { message?: string };
    response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } };
};
export type VideoGenerationTaskState = { status: "pending" } | { status: "completed"; result: VideoGenerationResult } | { status: "failed"; error: string };

/** Results for scripted (plugin) video models, which run their own create+poll in one shot at task creation. */
const pluginVideoResults = new Map<string, VideoGenerationResult>();

function aiApiUrl(config: AiConfig, path: string) {
    return buildApiUrl(config.baseUrl, path);
}

function aiHeaders(config: AiConfig, contentType?: string) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        ...(contentType ? { "Content-Type": contentType } : {}),
    };
}

export async function requestVideoGeneration(config: AiConfig, prompt: string, references: ReferenceImage[] = [], options?: VideoMediaOptions): Promise<VideoGenerationResult> {
    return waitForVideoGenerationTask(config, await createVideoGenerationTask(config, prompt, references, options), options);
}

export async function waitForVideoGenerationTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationResult> {
    // MiniMax tasks often queue for 15+ minutes on relays such as AutoDL, so poll slower and longer (45 min).
    const [attempts, intervalMs] = isAutodlVideoProvider(task.provider) ? [270, 10000] : [120, 2500];
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const state = await pollVideoGenerationTask(config, task, options);
        if (state.status === "completed") return state.result;
        if (state.status === "failed") throw videoTaskFailed(state.error);
        if (attempt === attempts - 1) throw new Error(apiText("videoTimeout", { provider: "" }));
        await delay(intervalMs, options?.signal);
    }
    throw new Error(apiText("videoTimeout", { provider: "" }));
}

export function isVideoTaskFailed(error: unknown) {
    return error instanceof Error && error.name === "VideoTaskFailed";
}

function videoTaskFailed(message: string) {
    const error = new Error(message);
    error.name = "VideoTaskFailed";
    return error;
}

export async function createVideoGenerationTask(config: AiConfig, prompt: string, references: ReferenceImage[] = [], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const selectedModel = (config.model || config.videoModel).trim();
    const requestConfig = resolveModelRequestConfig(config, selectedModel);
    const script = resolveModelScript(config, selectedModel);
    if (script) return createPluginVideoTask(requestConfig, selectedModel, script, prompt, references, options);
    assertVideoConfig(requestConfig, requestConfig.model);
    if (requestConfig.apiFormat === "gemini") return createGeminiVideoTask(requestConfig, selectedModel, prompt, references, options);
    const autodlProvider = autodlVideoProvider(requestConfig.model, requestConfig.baseUrl);
    if (autodlProvider === "minimax") return createMiniMaxVideoTask(requestConfig, selectedModel, prompt, references, options);
    if (autodlProvider === "kling") return createKlingVideoTask(requestConfig, selectedModel, prompt, references, options);
    if (autodlProvider === "ark") return createArkVideoTask(requestConfig, selectedModel, prompt, references, options);
    if (autodlProvider === "wan") return createWanVideoTask(requestConfig, selectedModel, prompt, references, options);
    return createOpenAIVideoTask(requestConfig, selectedModel, prompt, references, options);
}

export async function pollVideoGenerationTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    if (task.provider === "plugin") {
        const result = pluginVideoResults.get(task.id);
        return result ? { status: "completed", result } : { status: "failed", error: apiText("pluginVideoExpired") };
    }
    const requestConfig = resolveModelRequestConfig(config, task.model);
    assertVideoConfig(requestConfig, requestConfig.model);
    if (task.provider === "gemini") return pollGeminiVideoTask(requestConfig, task, options);
    if (task.provider === "minimax") return pollMiniMaxVideoTask(requestConfig, task, options);
    if (task.provider === "kling") return pollKlingVideoTask(requestConfig, task, options);
    if (task.provider === "ark") return pollArkVideoTask(requestConfig, task, options);
    if (task.provider === "wan") return pollWanVideoTask(requestConfig, task, options);
    return pollOpenAIVideoTask(requestConfig, task, options);
}

// FrameDock: MiniMax Hailuo video. Request/response shapes verified against AutoDL's relay (2026-10-17):
// POST .../video_generation → { task_id }, GET .../query/video_generation/{task_id} → { status, download_url }.
function isAutodlVideoProvider(provider: VideoGenerationTask["provider"]): provider is AutodlVideoProvider {
    return provider === "minimax" || provider === "kling" || provider === "ark" || provider === "wan";
}

/** How many input images a native AutoDL video adapter uses (first/last frame); undefined when not limited. */
export function videoFrameImageLimit(model: string) {
    const provider = autodlVideoProvider(model);
    if (!provider) return undefined;
    return provider === "wan" ? 1 : 2;
}

/** Native adapters for AutoDL video families; MiniMax Hailuo names also work on the official MiniMax API. */
function autodlVideoProvider(model: string, baseUrl = ""): AutodlVideoProvider | undefined {
    const name = modelOptionName(model);
    // Models synced from the AutoDL account are not in the catalog; their family is guessed from the name.
    const family = findAutodlModel(name)?.family || (/autodl\.art/i.test(baseUrl) ? guessAutodlFamily(name, "video") : undefined);
    if (family === "minimax" || family === "kling" || family === "ark" || family === "wan") return family;
    return /^minimax-hailuo/i.test(name) ? "minimax" : undefined;
}

/** Duration snapped to what the catalog allows for this model. */
function autodlDuration(config: AiConfig, model: string, fallback: number[]) {
    return nearestOption(Number(normalizeVideoSeconds(config.videoSeconds)) || fallback[0], findAutodlModel(modelOptionName(model))?.durations || fallback);
}

function autodlResolution(config: AiConfig, model: string) {
    const options = (findAutodlModel(modelOptionName(model))?.resolutions || ["480", "720", "1080"]).map(Number);
    return nearestOption(Number.parseInt(config.vquality, 10) || 720, options);
}

function autodlUrl(config: AiConfig, path: string) {
    return withLocalProxy(`${config.baseUrl.trim().replace(/\/+$/, "")}${path}`);
}

/**
 * First/last frame by connection role. Images without any role keep the old order (1st = first, 2nd = last);
 * once roles are set, only images marked (or left unmarked for) first/last become frames.
 */
async function frameDataUrls(references: ReferenceImage[], limit = 2) {
    const hasRoles = references.some((image) => image.role);
    const first = hasRoles ? references.find((image) => image.role === "first") || references.find((image) => !image.role) : references[0];
    const last = limit < 2 ? undefined : hasRoles ? references.find((image) => image.role === "last") : references[1];
    // A last frame alone is not supported by these APIs; use it as the only (first) frame then.
    const frames = first ? [first, last] : [last, undefined];
    return Promise.all(frames.map((image) => (image ? imageToDataUrl(image) : Promise.resolve("")))).then((urls) => urls.filter(Boolean));
}

function stripDataUrl(dataUrl: string) {
    return dataUrl.replace(/^data:[^;]+;base64,/, "");
}

// Kling: POST /kling/v1/videos/{text2video|image2video}; the endpoint kind is kept in the task id for polling.
async function createKlingVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const frames = await frameDataUrls(references);
    const kind = frames.length ? "image2video" : "text2video";
    const body = {
        model_name: modelOptionName(model),
        prompt: prompt.slice(0, 2500),
        duration: String(autodlDuration(config, model, [5, 10])),
        mode: autodlResolution(config, model) >= 1000 ? "pro" : "std",
        ...(frames[0] ? { image: stripDataUrl(frames[0]) } : { aspect_ratio: videoAspectRatio(config.size) }),
        ...(frames[1] ? { image_tail: stripDataUrl(frames[1]) } : {}),
    };
    try {
        const data = (await axios.post<KlingResponse>(autodlUrl(config, `/kling/v1/videos/${kind}`), body, { headers: aiHeaders(config, "application/json"), signal: options?.signal })).data;
        if (data.code !== 0 || !data.data?.task_id) throw new Error(data.message || apiText("noVideoTaskId"));
        return { id: `${kind}/${data.data.task_id}`, provider: "kling", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollKlingVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const data = (await axios.get<KlingResponse>(autodlUrl(config, `/kling/v1/videos/${task.id}`), { headers: aiHeaders(config), signal: options?.signal })).data.data;
        if (data?.task_status === "succeed") {
            const url = data.task_result?.videos?.[0]?.url;
            return url ? { status: "completed", result: await videoResultFromUrl(url, options) } : { status: "failed", error: apiText("noPlayableVideo") };
        }
        if (data?.task_status === "failed") return { status: "failed", error: data.task_status_msg || apiText("videoGenerationFailed") };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

// Volcengine Ark (Seedance): POST /ark/v3/contents/generations/tasks, GET .../tasks/{id}.
async function createArkVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const frames = await frameDataUrls(references);
    const body = {
        model: modelOptionName(model),
        content: [
            { type: "text", text: prompt },
            ...frames.map((url, index) => ({ type: "image_url", image_url: { url }, role: index === 0 ? "first_frame" : "last_frame" })),
        ],
        resolution: `${autodlResolution(config, model)}p`,
        ratio: frames.length ? "adaptive" : videoAspectRatio(config.size),
        duration: autodlDuration(config, model, [5]),
        generate_audio: boolConfig(config.videoGenerateAudio, true),
        watermark: boolConfig(config.videoWatermark, false),
    };
    try {
        const data = (await axios.post<ArkTaskResponse>(autodlUrl(config, "/ark/v3/contents/generations/tasks"), body, { headers: aiHeaders(config, "application/json"), signal: options?.signal })).data;
        if (!data.id) throw new Error(data.error?.message || apiText("noVideoTaskId"));
        return { id: data.id, provider: "ark", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollArkVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const data = (await axios.get<ArkTaskResponse>(autodlUrl(config, `/ark/v3/contents/generations/tasks/${encodeURIComponent(task.id)}`), { headers: aiHeaders(config), signal: options?.signal })).data;
        if (data.status === "succeeded") {
            const url = data.content?.video_url;
            return url ? { status: "completed", result: await videoResultFromUrl(url, options) } : { status: "failed", error: apiText("noPlayableVideo") };
        }
        if (data.status === "failed" || data.status === "cancelled" || data.status === "expired") return { status: "failed", error: data.error?.message || apiText("videoGenerationFailed") };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

// Alibaba DashScope (Wan): async POST .../video-synthesis with X-DashScope-Async, GET /ali/api/v1/tasks/{id}.
async function createWanVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const [frame = ""] = await frameDataUrls(references, 1);
    const body = {
        model: modelOptionName(model),
        input: { prompt, ...(frame ? { img_url: frame } : {}) },
        parameters: { resolution: `${autodlResolution(config, model)}P`, duration: autodlDuration(config, model, [5]) },
    };
    try {
        const data = (await axios.post<WanTaskResponse>(autodlUrl(config, "/ali/api/v1/services/aigc/video-generation/video-synthesis"), body, { headers: { ...aiHeaders(config, "application/json"), "X-DashScope-Async": "enable" }, signal: options?.signal })).data;
        if (!data.output?.task_id) throw new Error(data.message || apiText("noVideoTaskId"));
        return { id: data.output.task_id, provider: "wan", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollWanVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const output = (await axios.get<WanTaskResponse>(autodlUrl(config, `/ali/api/v1/tasks/${encodeURIComponent(task.id)}`), { headers: aiHeaders(config), signal: options?.signal })).data.output;
        if (output?.task_status === "SUCCEEDED") {
            return output.video_url ? { status: "completed", result: await videoResultFromUrl(output.video_url, options) } : { status: "failed", error: apiText("noPlayableVideo") };
        }
        if (output?.task_status === "FAILED" || output?.task_status === "CANCELED" || output?.task_status === "UNKNOWN") return { status: "failed", error: output.message || apiText("videoGenerationFailed") };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

function miniMaxUrl(config: AiConfig, path: string) {
    const base = config.baseUrl.trim().replace(/\/+$/, "");
    // AutoDL exposes MiniMax under /api/v1/minimax/v1; the official API lives at <host>/v1.
    return withLocalProxy(/autodl\.art/i.test(base) ? `${base}/minimax/v1${path}` : `${base.replace(/\/v1$/i, "")}/v1${path}`);
}

function miniMaxResolution(vquality: string, hasFirstFrame: boolean) {
    const height = Number.parseInt(vquality, 10) || 720;
    if (height >= 1000) return "1080P";
    // 512P is only offered for image-to-video and is the cheapest tier.
    return height <= 540 && hasFirstFrame ? "512P" : "768P";
}

async function createMiniMaxVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const frames = await frameDataUrls(references);
    const resolution = miniMaxResolution(String(autodlResolution(config, model)), frames.length > 0);
    const duration = resolution === "1080P" ? 6 : autodlDuration(config, model, [6, 10]);
    const body = {
        model: modelOptionName(model),
        prompt: prompt.slice(0, 2000),
        duration,
        resolution,
        ...(frames[0] ? { first_frame_image: frames[0] } : {}),
        ...(frames[1] ? { last_frame_image: frames[1] } : {}),
    };
    try {
        const data = (await axios.post<MiniMaxCreateResponse>(miniMaxUrl(config, "/video_generation"), body, { headers: aiHeaders(config, "application/json"), signal: options?.signal })).data;
        if (!data.task_id || (data.base_resp?.status_code ?? 0) !== 0) throw new Error(data.base_resp?.status_msg || apiText("noVideoTaskId"));
        return { id: data.task_id, provider: "minimax", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollMiniMaxVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const data = (await axios.get<MiniMaxQueryResponse>(miniMaxUrl(config, `/query/video_generation/${encodeURIComponent(task.id)}`), { headers: aiHeaders(config), signal: options?.signal })).data;
        if (data.status === "Success") {
            if (!data.download_url) return { status: "failed", error: apiText("noPlayableVideo") };
            return { status: "completed", result: await videoResultFromUrl(data.download_url, options) };
        }
        if (data.status === "Fail") return { status: "failed", error: data.error_message || data.base_resp?.status_msg || apiText("videoGenerationFailed") };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

async function createPluginVideoTask(config: AiConfig, model: string, script: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    if (!config.baseUrl.trim()) throw new Error(apiText("baseUrlRequired"));
    if (!config.apiKey.trim()) throw new Error(apiText("apiKeyRequired"));
    const refs = await Promise.all(references.map((image) => imageToDataUrl(image)));
    const videos = await Promise.all((options?.videos || []).map((video) => referenceMediaToFile(video, "ref.mp4", "invalidReferenceVideo", options)));
    const audios = await Promise.all((options?.audios || []).map((audio) => referenceMediaToFile(audio, "ref.mp3", "invalidReferenceAudio", options)));
    const result = videoPluginResult(
        await runModelPlugin({
            capability: "video",
            script,
            config,
            prompt,
            images: refs,
            videos,
            audios,
            params: {
                seconds: normalizeVideoSeconds(config.videoSeconds),
                size: normalizeVideoSize(config.size, config.vquality),
                resolution: normalizeVideoResolution(config.vquality),
                ratio: videoAspectRatio(config.size),
                generateAudio: boolConfig(config.videoGenerateAudio, true),
                watermark: boolConfig(config.videoWatermark, false),
                mode: resolveVideoMode(config.videoMode, references),
            },
            signal: options?.signal,
        }),
    );
    const id = nanoid();
    pluginVideoResults.set(id, result);
    return { id, provider: "plugin", model };
}

function videoPluginResult(result: unknown): VideoGenerationResult {
    if (result instanceof Blob) return { blob: result };
    if (typeof result === "string") return { url: result, mimeType: "video/mp4" };
    if (result && typeof result === "object") {
        const record = result as Record<string, unknown>;
        if (record.blob instanceof Blob) return { blob: record.blob };
        const url = [record.url, record.video_url, record.result_url].find((value) => typeof value === "string" && value) as string | undefined;
        if (url) return { url, mimeType: "video/mp4" };
    }
    throw new Error(apiText("scriptNoVideo"));
}

export async function storeGeneratedVideo(result: VideoGenerationResult): Promise<UploadedFile> {
    if (result.blob) return uploadMediaFile(result.blob, "video");
    if (result.url) {
        try {
            return await uploadMediaFile(result.url, "video");
        } catch {
            return { url: result.url, storageKey: "", bytes: 0, mimeType: result.mimeType || "video/mp4" };
        }
    }
    throw new Error(apiText("noPlayableVideo"));
}

async function createOpenAIVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const images = await Promise.all(references.map(async (image) => dataUrlToFile({ ...image, dataUrl: await imageToDataUrl(image) })));
    const videos = await Promise.all((options?.videos || []).map((video) => referenceMediaToFile(video, "ref.mp4", "invalidReferenceVideo", options)));
    const audios = await Promise.all((options?.audios || []).map((audio) => referenceMediaToFile(audio, "ref.mp3", "invalidReferenceAudio", options)));
    const mode = resolveVideoMode(config.videoMode, references);
    const ratio = inferVideoRatio(config.size || "16:9");
    const body = new FormData();
    body.append("model", modelOptionName(model));
    body.append("prompt", prompt);
    body.append("seconds", normalizeVideoSeconds(config.videoSeconds));
    body.append("size", normalizeVideoSize(config.size, config.vquality) || "1280x720");
    if (ratio && ratio !== "auto") {
        body.append("ratio", ratio);
    }
    body.append("resolution_name", normalizeVideoResolution(config.vquality));
    body.append("generate_audio", String(boolConfig(config.videoGenerateAudio, true)));
    body.append("watermark", String(boolConfig(config.videoWatermark, false)));
    body.append("mode", mode);
    if (mode === "frames") {
        if (images[0]) {
            body.append("first_frame", images[0], "first.png");
            body.append("images", images[0], "first.png");
        }
        if (images[1]) {
            body.append("last_frame", images[1], "last.png");
            body.append("images", images[1], "last.png");
        }
    } else {
        images.forEach((file, idx) => {
            body.append("image[]", file, `ref_${idx + 1}.png`);
            body.append("images", file, `ref_${idx + 1}.png`);
        });
    }
    videos.forEach((file) => body.append("video[]", file));
    audios.forEach((file) => body.append("audio[]", file));
    try {
        const created = unwrapVideoResponse((await axios.post<ApiVideoResponse>(aiApiUrl(config, "/videos"), body, { headers: aiHeaders(config), signal: options?.signal })).data);
        if (!created.id) throw new Error(apiText("noVideoTaskId"));
        return { id: created.id, provider: "openai", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollOpenAIVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const video = unwrapVideoResponse((await axios.get<ApiVideoResponse>(aiApiUrl(config, `/videos/${task.id}`), { headers: aiHeaders(config), signal: options?.signal })).data);
        const url = videoResultUrl(video);
        if (url) return { status: "completed", result: await videoResultFromUrl(url, options) };
        if (video.status === "completed") {
            const content = await axios.get<Blob>(aiApiUrl(config, `/videos/${task.id}/content`), { headers: aiHeaders(config), responseType: "blob", signal: options?.signal });
            await assertVideoBlob(content.data);
            return { status: "completed", result: { blob: content.data } };
        }
        if (video.status === "failed" || video.status === "cancelled") return { status: "failed", error: readApiErrorMessage(video.error?.message) || apiText("videoGenerationFailed") };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

async function videoResultFromUrl(url: string, options?: RequestOptions): Promise<VideoGenerationResult> {
    try {
        const response = await axios.get<Blob>(withLocalProxy(url), { responseType: "blob", signal: options?.signal });
        await assertVideoBlob(response.data);
        return { blob: response.data };
    } catch (error) {
        if (axios.isCancel(error) || options?.signal?.aborted) throw error;
        return { url, mimeType: "video/mp4" };
    }
}

async function createGeminiVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: VideoMediaOptions): Promise<VideoGenerationTask> {
    const images = await Promise.all(references.map((image) => imageToDataUrl(image)));
    const videos = await Promise.all((options?.videos || []).map((video) => referenceMediaToFile(video, "ref.mp4", "invalidReferenceVideo", options)));
    const audios = await Promise.all((options?.audios || []).map((audio) => referenceMediaToFile(audio, "ref.mp3", "invalidReferenceAudio", options)));
    const mode = resolveVideoMode(config.videoMode, references);
    const instance: Record<string, unknown> = { prompt };
    if (mode === "frames") {
        if (images[0]) instance.image = parseDataUrlInline(images[0]);
        if (images[1]) instance.lastFrame = parseDataUrlInline(images[1]);
    } else {
        instance.referenceImages = images.map((dataUrl) => ({ image: parseDataUrlInline(dataUrl), referenceType: "asset" }));
    }
    if (videos[0]) instance.video = await fileToGeminiInline(videos[0]);
    if (audios[0]) instance.audio = await fileToGeminiInline(audios[0]);
    try {
        const created = unwrapEnvelope((await axios.post<ApiEnvelope<GeminiVideoOperation>>(geminiVideoUrl(config, model, "predictLongRunning"), {
            instances: [instance],
            parameters: {
                aspectRatio: videoAspectRatio(config.size),
                durationSeconds: Number(normalizeVideoSeconds(config.videoSeconds)) || 8,
                resolution: normalizeVideoResolution(config.vquality),
                generateAudio: boolConfig(config.videoGenerateAudio, true),
                addWatermark: boolConfig(config.videoWatermark, false),
            },
        }, { headers: geminiVideoHeaders(config), signal: options?.signal })).data, apiText("noVideoTask"));
        if (!created.name) throw new Error(apiText("noVideoTaskId"));
        return { id: created.name, provider: "gemini", model };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskCreateFailed")));
    }
}

async function pollGeminiVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const state = unwrapEnvelope((await axios.get<ApiEnvelope<GeminiVideoOperation>>(geminiOperationUrl(config, task.id), { headers: geminiVideoHeaders(config), signal: options?.signal })).data, apiText("videoTaskQueryFailed"));
        if (state.error) return { status: "failed", error: readApiErrorMessage(state.error.message) || apiText("videoGenerationFailed") };
        if (!state.done) return { status: "pending" };
        const uri = state.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) return { status: "failed", error: apiText("noPlayableVideo") };
        const url = uri.includes("key=") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}key=${config.apiKey}`;
        return { status: "completed", result: await videoResultFromUrl(url, options) };
    } catch (error) {
        throw new Error(readAxiosError(error, apiText("videoTaskQueryFailed")));
    }
}

function assertVideoConfig(config: AiConfig, model: string) {
    if (!model) throw new Error(apiText("videoModelRequired"));
    if (!config.baseUrl.trim()) throw new Error(apiText("baseUrlRequired"));
    if (!config.apiKey.trim()) throw new Error(apiText("apiKeyRequired"));
}

function geminiVideoBaseUrl(config: Pick<AiConfig, "baseUrl">) {
    const normalizedBaseUrl = config.baseUrl.trim().replace(/\/+$/, "");
    const lowerBaseUrl = normalizedBaseUrl.toLowerCase();
    return lowerBaseUrl.endsWith("/v1") || lowerBaseUrl.endsWith("/v1beta") ? normalizedBaseUrl : `${normalizedBaseUrl}/v1beta`;
}

function geminiVideoUrl(config: Pick<AiConfig, "baseUrl">, model: string, action: string) {
    return withLocalProxy(`${geminiVideoBaseUrl(config)}/models/${encodeURIComponent(modelOptionName(model).replace(/^models\//, ""))}:${action}`);
}

function geminiOperationUrl(config: Pick<AiConfig, "baseUrl">, name: string) {
    return withLocalProxy(`${geminiVideoBaseUrl(config)}/${name.replace(/^\//, "")}`);
}

function geminiVideoHeaders(config: Pick<AiConfig, "apiKey">) {
    return { "x-goog-api-key": config.apiKey, "Content-Type": "application/json" };
}

function videoAspectRatio(size: string) {
    const ratio = inferVideoRatio(size);
    return ratio === "auto" ? "16:9" : ratio;
}

function parseDataUrlInline(dataUrl: string, fallbackType = "image/png"): GeminiInlineData {
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
    return { bytesBase64Encoded: match?.[2] || "", mimeType: match?.[1] || fallbackType };
}

async function fileToGeminiInline(file: File): Promise<GeminiInlineData> {
    return parseDataUrlInline(await readFileAsDataUrl(file), file.type || "application/octet-stream");
}

async function referenceMediaToFile(item: { name: string; type?: string; url?: string; storageKey?: string }, fallbackName: string, errorKey: "invalidReferenceVideo" | "invalidReferenceAudio", options?: RequestOptions) {
    let blob = item.storageKey ? await getMediaBlob(item.storageKey) : null;
    if (!blob) {
        const url = item.storageKey ? await resolveMediaUrl(item.storageKey, item.url || "") : item.url || "";
        if (!url) throw new Error(apiText(errorKey));
        try {
            blob = await (await fetch(url, { signal: options?.signal })).blob();
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") throw error;
            throw new Error(apiText(errorKey));
        }
    }
    if (!blob.size) throw new Error(apiText(errorKey));
    return new File([blob], item.name || fallbackName, { type: item.type || blob.type || "application/octet-stream" });
}

function normalizeVideoSeconds(value: string) {
    return clampVideoSeconds(value);
}

function resolveVideoMode(mode: string | undefined, references: ReferenceImage[]) {
    // Connection roles decide when present: reference images without a first frame → reference mode.
    if (references.some((image) => image.role === "reference") && !references.some((image) => image.role === "first")) return "reference";
    if (references.some((image) => image.role === "first" || image.role === "last")) return "frames";
    if (mode === "reference" || references.length > 2) return "reference";
    return "frames";
}

function normalizeVideoSize(value: string, resolution?: string) {
    if (value === "auto") return null;
    if (/^\d+x\d+$/.test(value || "")) return value;
    const ratio = inferVideoRatio(value || "16:9");
    if (ratio === "auto") return null;
    return computeVideoSize(resolution || "720", ratio);
}

function normalizeVideoResolution(value: string) {
    if (value === "low") return "480p";
    if (value === "auto" || value === "high" || value === "medium") return "720p";
    const resolution = value.replace(/p$/i, "") || "720";
    return `${resolution}p`;
}

function unwrapVideoResponse(payload: ApiVideoResponse) {
    return unwrapEnvelope(payload, apiText("noVideoTask"));
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>, emptyMessage: string): T {
    if (!payload) throw new Error(emptyMessage);
    if (typeof payload === "object" && "code" in payload && payload.code !== undefined) {
        if (payload.code !== 0 && payload.code !== "0") throw new Error(readApiErrorMessage(payload) || apiText("requestFailed"));
        if (!payload.data) throw new Error(emptyMessage);
        return payload.data;
    }
    return payload as T;
}

function videoResultUrl(payload: VideoResponse) {
    return [payload.video_url, payload.result_url, payload.url, payload.content?.video_url, payload.content?.url].find((url) => typeof url === "string" && (isPublicMediaUrl(url) || /\.mp4(\?|#|$)/i.test(url)));
}

function readApiErrorMessage(value: unknown): string {
    if (!value) return "";
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            const inner = readApiErrorMessage(parsed) || value;
            if (inner === value && typeof parsed === "object" && Object.keys(parsed).length === 0) return "";
            return inner;
        } catch {
            if (/<[a-z][\s\S]*>/i.test(value)) return apiText("htmlError", { preview: `${value.slice(0, 80)}...` });
            return value;
        }
    }
    if (typeof value !== "object") return "";
    const payload = value as { msg?: unknown; message?: unknown; error?: unknown; detail?: unknown };
    // error may be a string or an object containing a message.
    const errorMsg =
        typeof payload.error === "string"
            ? payload.error
            : (payload.error as { message?: unknown })?.message;
    return (
        readApiErrorMessage(payload.msg) ||
        readApiErrorMessage(payload.message) ||
        readApiErrorMessage(errorMsg) ||
        readApiErrorMessage(payload.detail) ||
        ""
    );
}

function readAxiosError(error: unknown, fallback: string) {
    if (axios.isCancel(error)) return apiText("requestCanceled");
    if (axios.isAxiosError<{ error?: { message?: string }; msg?: string; message?: string; code?: number | string }>(error)) {
        if (!error.response && error.code === "ERR_NETWORK") return apiText("requestFailed");
        const responseData = error.response?.data;
        return readApiErrorMessage(responseData) || statusMessage(error.response?.status, fallback);
    }
    if (error instanceof DOMException && error.name === "AbortError") return apiText("requestCanceled");
    return error instanceof Error ? readApiErrorMessage(error.message) || error.message : fallback;
}

function statusMessage(status: number | undefined, fallback: string) {
    if (status === 401 || status === 403) return apiText("authenticationFailed");
    if (status === 429) return apiText("rateLimited");
    return status ? `${fallback}（${status}）` : fallback;
}

async function assertVideoBlob(blob: Blob) {
    if (!blob.type.includes("json")) return;
    let payload: { code?: number; msg?: string; error?: { message?: string } };
    try {
        payload = JSON.parse(await blob.text()) as { code?: number; msg?: string; error?: { message?: string } };
    } catch {
        return;
    }
    if (typeof payload.code === "number" && payload.code !== 0) throw new Error(readApiErrorMessage(payload) || apiText("videoDownloadFailed"));
    if (payload.error?.message) throw new Error(readApiErrorMessage(payload.error.message) || payload.error.message);
}

function isPublicMediaUrl(value: string) {
    return /^https?:\/\//i.test(value || "");
}

function delay(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}
