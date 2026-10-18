import { afterEach, beforeEach, expect, test } from "bun:test";
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { YFAI_MODELS, findYfaiModel, validateYfaiParams, yfaiDefaults, yfaiModels } from "../src/lib/yfai-catalog";

const { defaultConfig, withYfaiConfig, buildYfaiChannel, resolveModelRequestConfig, useConfigStore } = await import("../src/stores/use-config-store");
const { buildYfaiInvoke, buildYfaiParams, unwrapYfai, yfaiTimings, submitYfaiTask, pollYfaiTask, waitYfaiTask, yfaiTaskUrls, prepareYfaiParams } = await import("../src/services/api/yfai");
const { requestGeneration, requestEdit, requestImageQuestion } = await import("../src/services/api/image");
const { createVideoGenerationTask, pollVideoGenerationTask } = await import("../src/services/api/video");
const { requestAudioGeneration } = await import("../src/services/api/audio");
const { buildGenerationConfig } = await import("../src/lib/canvas/canvas-generation-helpers");
const { findAutodlPrice } = await import("../src/lib/autodl-pricing");
const originalAdapter = axios.defaults.adapter;
const originalFetch = globalThis.fetch;
let calls: InternalAxiosRequestConfig[] = [];
let handler: (config: InternalAxiosRequestConfig) => unknown = () => ({});
beforeEach(() => {
    calls = [];
    axios.defaults.adapter = async (config) => { calls.push(config); return { data: await handler(config), status: 200, statusText: "OK", headers: {}, config }; };
});
afterEach(() => { axios.defaults.adapter = originalAdapter; globalThis.fetch = originalFetch; });
const model = (id: string) => findYfaiModel(`yfai::${id}`)!;
const config = (id: string) => ({ ...withYfaiConfig(defaultConfig, { apiKey: "synthetic-yfai-key" }), model: `yfai::${id}`, count: "1" });

test("catalog contains all 125 active models and keeps retired identities separate", () => {
    expect(yfaiModels(YFAI_MODELS)).toHaveLength(125);
    expect(YFAI_MODELS.filter((model) => model.deprecated)).toHaveLength(6);
    expect(findYfaiModel("autodl::gpt-image-2")).toBeUndefined();
    expect(buildYfaiChannel("key", yfaiModels().map((model) => model.id)).models).toHaveLength(121);
    expect(buildYfaiChannel("key", ["whisper-1"]).models).toHaveLength(0);
});
test("one key builds four model categories without changing any AutoDL credentials", () => {
    const source = { ...defaultConfig, channels: defaultConfig.channels.map((channel) => channel.id === "autodl" ? { ...channel, apiKey: "synthetic-autodl" } : channel) };
    const next = withYfaiConfig(source, { apiKey: "synthetic-yfai" });
    expect(next.channels.find((channel) => channel.id === "autodl")?.apiKey).toBe("synthetic-autodl");
    expect(new Set(next.channels.find((channel) => channel.id === "yfai")?.models.map((item) => item.capability)).size).toBe(4);
    expect(resolveModelRequestConfig(next, "yfai::gpt-image-2").apiKey).toBe("synthetic-yfai");
    expect(findAutodlPrice("yfai::gpt-image-2")).toBeUndefined();
});
test("mode follows frame roles; exact enum values and 30 second options survive", () => {
    const cfg = config("seedance-2-5");
    expect(buildYfaiParams(cfg, model("seedance-2-5")).mode).toBe("text-to-video");
    expect(buildYfaiParams(cfg, model("seedance-2-5"), { images: ["a", "b"], roles: ["first", "last"] }).mode).toBe("first-last");
    expect(buildYfaiParams(cfg, model("seedance-2-5"), { images: ["a"], roles: ["reference"] }).mode).toBe("reference");
    cfg.yfaiParams = JSON.stringify({ "seedance-2-5": { duration: "30", resolution: "1080p" } });
    expect(buildYfaiParams(cfg, model("seedance-2-5"))).toMatchObject({ duration: "30", resolution: "1080p" });
    expect(() => validateYfaiParams(model("seedance-2-5"), { duration: "999" })).toThrow();
});
test("preflight rejects too many references before upload or paid submission", async () => {
    const cfg = config("seedance-2-5");
    const refs = Array.from({ length: 31 }, (_, i) => ({ id: String(i), name: "ref.png", type: "image/png", dataUrl: "data:image/png;base64,AA==", role: "reference" as const }));
    await expect(prepareYfaiParams(resolveModelRequestConfig(cfg, cfg.model), refs)).rejects.toThrow("max 30");
    expect(calls).toHaveLength(0);
});
test("super resolution maps the image to the documented singular url field", () => {
    expect(buildYfaiParams(config("aliyun-image-superres"), model("aliyun-image-superres"), { images: ["https://ref/image.png"] })).toMatchObject({ url: "https://ref/image.png" });
});
test("connected frames are uploaded in first/last order and use public URLs", async () => {
    const cfg = config("seedance-2-5");
    const names: string[] = [];
    handler = (call) => {
        expect(call.url).toEndWith("/v1/files");
        expect(call.headers.Authorization).toBe("Bearer synthetic-yfai-key");
        names.push(((call.data as FormData).get("file") as File).name);
        return { url: `https://cdn/${names[names.length - 1]}` };
    };
    globalThis.fetch = (async () => new Response(new Blob(["synthetic image"], { type: "image/png" }))) as typeof fetch;
    const refs = [
        { id: "last", name: "last.png", type: "image/png", dataUrl: "data:image/png;base64,AA==", role: "last" as const },
        { id: "first", name: "first.png", type: "image/png", dataUrl: "data:image/png;base64,AA==", role: "first" as const },
    ];
    const prepared = await prepareYfaiParams(resolveModelRequestConfig(cfg, cfg.model), refs);
    expect(names).toEqual(["first.png", "last.png"]);
    expect(prepared.params.images).toEqual(["https://cdn/first.png", "https://cdn/last.png"]);
    expect(prepared.params.mode).toBe("first-last");
});
test("draft-only resolution and required reference linkages are validated before submission", () => {
    expect(() => validateYfaiParams(model("seedance-2-5"), { draft: true, resolution: "1080p" })).toThrow("unavailable");
    expect(() => validateYfaiParams(model("veo-3.1"), { mode: "reference", images: [] })).toThrow("required");
});
test("HTTP 200 media envelope is accepted and original image bytes take precedence", () => {
    expect(unwrapYfai({ code: 200, data: { task_id: "task-one" } }).task_id).toBe("task-one");
    expect(() => unwrapYfai({ error: { message: "invalid key" } })).toThrow("invalid key");
    expect(yfaiTaskUrls({ result: { images: [{ url: "https://cdn/preview.jpg", original_url: "https://cdn/original.png" }, { url: "https://cdn/second.png" }] } }, "images")).toEqual(["https://cdn/original.png", "https://cdn/second.png"]);
});
test("image generation submits the async runtime envelope then reads task results", async () => {
    handler = (call) => call.method === "post" ? { task_id: "image-task", is_final: false } : { status: "completed", is_final: true, result: { images: [{ original_url: "https://cdn/full.png", url: "https://cdn/small.jpg" }] } };
    const images = await requestGeneration(config("gpt-image-2"), "synthetic test prompt");
    expect(images[0].dataUrl).toBe("https://cdn/full.png");
    expect(calls[0].url).toEndWith("/api/v1/model-runtime/invoke");
    expect(JSON.parse(calls[0].data)).toMatchObject({ model_id: "gpt-image-2", modality: "image", params: { prompt: "synthetic test prompt", count: 1 } });
    expect(calls[1].url).toEndWith("/v1/tasks/image-task");
});
test("canvas image slots always submit one image even with a stale provider batch count", async () => {
    handler = (call) => call.method === "post" ? { task_id: "one-slot" } : { status: "completed", is_final: true, output_url: "https://cdn/one.png" };
    const cfg = { ...config("gpt-image-2"), yfaiParams: JSON.stringify({ "gpt-image-2": { count: 50 } }), count: "1" };
    await requestGeneration(cfg, "test");
    expect(JSON.parse(calls[0].data).params.count).toBe(1);
});
test("MJ with a connected reference image generates instead of triggering the edit attachment error", async () => {
    handler = (call) => {
        if (call.url?.endsWith("/v1/files")) return { url: "https://cdn/reference.png" };
        if (call.method === "post") {
            const body = JSON.parse(call.data);
            if (body.operation === "edit" && !body.attachments?.[0]) throw new AxiosError("bad request", "ERR_BAD_REQUEST", call, {}, { data: { error: { message: "operation=edit requires attachments[0] (source image)" } }, status: 400, statusText: "Bad Request", headers: {}, config: call });
            expect(body.operation).toBe("generate");
            expect(body.params.mode).toBe("text-to-image");
            expect(body.attachments).toBeUndefined();
            expect(body.params.images).toEqual(["https://cdn/reference.png"]);
            return { task_id: "mj-reference" };
        }
        return { is_final: true, status: "completed", output_url: "https://cdn/mj-output.png" };
    };
    globalThis.fetch = (async () => new Response(new Blob(["synthetic reference"], { type: "image/png" }))) as typeof fetch;
    const result = await requestEdit(config("mj_imagine"), "cat knight", [{ id: "ref", name: "ref.png", type: "image/png", dataUrl: "data:image/png;base64,AA==" }]);
    expect(result[0].dataUrl).toBe("https://cdn/mj-output.png");
});
test("MJ with four connected image prompts stays in text-to-image unless Blend was explicitly chosen", async () => {
    handler = (call) => {
        if (call.url?.endsWith("/v1/files")) return { url: `https://cdn/${((call.data as FormData).get("file") as File).name}` };
        if (call.method === "post") return { task_id: "mj-four-references" };
        return { is_final: true, status: "completed", output_url: "https://cdn/result.png" };
    };
    globalThis.fetch = (async () => new Response(new Blob(["synthetic reference"], { type: "image/png" }))) as typeof fetch;
    const refs = Array.from({ length: 4 }, (_, index) => ({ id: String(index), name: `${index}.png`, type: "image/png", dataUrl: "data:image/png;base64,AA==" }));
    await requestEdit(config("mj_imagine"), "cat knight", refs);
    const body = JSON.parse(calls.find((call) => call.url?.endsWith("/api/v1/model-runtime/invoke"))!.data);
    expect(body.params.mode).toBe("text-to-image");
    expect(body.attachments).toBeUndefined();
    expect(body.params.images).toHaveLength(4);
    const explicitBlend = { ...config("mj_imagine"), yfaiParams: JSON.stringify({ mj_imagine: { mode: "multi-reference" } }) };
    expect(buildYfaiParams(explicitBlend, model("mj_imagine"), { images: body.params.images }).mode).toBe("multi-reference");
});
test("MJ three references are sent only once, staying under the upstream four-image limit", async () => {
    let upstreamImageCount = 0;
    handler = (call) => {
        if (call.url?.endsWith("/v1/files")) return { url: `https://cdn/${((call.data as FormData).get("file") as File).name}` };
        if (call.method === "post") {
            const body = JSON.parse(call.data);
            // Verified by the platform dry-run: MJ concatenates params.images and attachments.
            upstreamImageCount = (body.params.images?.length || 0) + (body.attachments?.length || 0);
            return { task_id: "mj-three-refs" };
        }
        return upstreamImageCount > 4
            ? { is_final: true, status: "failed", error: "生成失败，请稍后重试", error_class: "protocol_adaptor_response" }
            : { is_final: true, status: "completed", output_url: "https://cdn/mj-three.png" };
    };
    globalThis.fetch = (async () => new Response(new Blob(["synthetic reference"], { type: "image/png" }))) as typeof fetch;
    const refs = Array.from({ length: 3 }, (_, i) => ({ id: String(i), name: `${i}.png`, type: "image/png", dataUrl: "data:image/png;base64,AA==" }));
    const result = await requestEdit(config("mj_imagine"), "original prompt unchanged", refs);
    expect(result[0].dataUrl).toBe("https://cdn/mj-three.png");
    expect(upstreamImageCount).toBe(3);
});
test("a failed YFAI task keeps its original reason and task ID for diagnosis", async () => {
    handler = () => ({ is_final: true, status: "failed", error: { message: "生成失败，请稍后重试" } });
    await expect(waitYfaiTask("synthetic-key", { task_id: "synthetic-upstream-failure" })).rejects.toThrow("synthetic-upstream-failure");
    await expect(waitYfaiTask("synthetic-key", { task_id: "synthetic-upstream-failure" })).rejects.toThrow("生成失败，请稍后重试");
});
for (const scenario of [
    { name: "MJ Blend", id: "mj_imagine", params: { mode: "multi-reference", images: ["https://cdn/a.png", "https://cdn/b.png"] }, operation: "generate", attachments: undefined },
    { name: "image editing", id: "gpt-image-2", params: { mode: "image-edit", images: ["https://cdn/source.png"] }, operation: "edit", attachments: ["https://cdn/source.png"] },
    { name: "empty reference list", id: "mj_imagine", params: { mode: "text-to-image", images: [] }, operation: "generate", attachments: undefined },
    { name: "image super resolution", id: "aliyun-image-superres", params: { mode: "base", url: "https://cdn/source.png" }, operation: "generate", attachments: ["https://cdn/source.png"] },
] as const) {
    test(`${scenario.name} uses the documented runtime operation and attachment envelope`, async () => {
        handler = () => ({ task_id: "contract-task" });
        await submitYfaiTask(config(scenario.id), model(scenario.id), "test", { ...yfaiDefaults(model(scenario.id)), ...scenario.params, ...("images" in scenario.params ? { images: [...scenario.params.images] } : {}) });
        const body = JSON.parse(calls[0].data);
        expect(body.operation).toBe(scenario.operation);
        expect(body.attachments).toEqual(scenario.attachments);
        if (scenario.attachments) expect(body.attachments[0]).toBeTruthy();
    });
}
test("video persists the encoded model and resumes via YFAI task endpoint", async () => {
    handler = (call) => call.method === "post" ? { code: 200, data: { task_id: "video-one" } } : { is_final: true, status: "failed", error: { message: "upstream failed" } };
    const cfg = config("seedance-2-5");
    const task = await createVideoGenerationTask(cfg, "synthetic test prompt");
    expect(task).toEqual({ id: "video-one", provider: "yfai", model: "yfai::seedance-2-5" });
    expect(await pollVideoGenerationTask(cfg, task)).toEqual({ status: "failed", error: "upstream failed" });
    expect(calls[1].url).toEndWith("/v1/tasks/video-one");
    expect(calls[1].headers.Authorization).toBe("Bearer synthetic-yfai-key");
});
test("needs_review is non-final; a 503 continues queries; 410 stops them", async () => {
    handler = () => ({ is_final: false, status: "needs_review" });
    expect((await pollYfaiTask("key", "review-task")).is_final).toBe(false);
    handler = (config) => { throw new AxiosError("temporary", "ERR_BAD_RESPONSE", config, {}, { data: {}, status: 503, statusText: "", headers: {}, config }); };
    expect((await pollYfaiTask("key", "review-task")).is_final).toBe(false);
    handler = (config) => { throw new AxiosError("gone", "ERR_BAD_RESPONSE", config, {}, { data: { error: { message: "task expired" } }, status: 410, statusText: "", headers: {}, config }); };
    await expect(pollYfaiTask("key", "review-task")).rejects.toThrow("task expired");
});
test("an unanswered submission is repeated with the same client_request_id, so it cannot be billed twice", async () => {
    yfaiTimings.retryMs = 1;
    const ids: unknown[] = [];
    handler = (config) => { ids.push(JSON.parse(String(config.data)).client_request_id); throw new AxiosError("timeout", "ECONNABORTED", config); };
    await expect(submitYfaiTask(config("seedance-2-5"), model("seedance-2-5"), "test", { ...yfaiDefaults(model("seedance-2-5")), mode: "text-to-video" })).rejects.toThrow();
    expect(calls).toHaveLength(4);
    expect(new Set(ids).size).toBe(1);
    expect(String(ids[0])).toStartWith("framedock-");
});
test("a rejected submission (4xx) is not repeated", async () => {
    handler = (config) => { throw new AxiosError("bad", "ERR_BAD_REQUEST", config, null, { status: 400, data: { error: { message: "bad params" } }, statusText: "", headers: {}, config } as never); };
    await expect(submitYfaiTask(config("seedance-2-5"), model("seedance-2-5"), "test", { ...yfaiDefaults(model("seedance-2-5")), mode: "text-to-video" })).rejects.toThrow("bad params");
    expect(calls).toHaveLength(1);
});
test("polling rides out gateway errors and dropped connections, because the task keeps running and keeps costing", async () => {
    yfaiTimings.pollMs = 1; yfaiTimings.retryCapMs = 5;
    let polls = 0;
    handler = (config) => {
        polls += 1;
        if (polls === 1) throw new AxiosError("bad gateway", "ERR_BAD_RESPONSE", config, null, { status: 502, data: "", statusText: "", headers: {}, config } as never);
        if (polls === 2) throw new AxiosError("network", "ERR_NETWORK", config);
        if (polls === 3) return { task_id: "t-1", is_final: false, status: "processing" };
        return { task_id: "t-1", is_final: true, status: "completed", result: { images: [{ url: "https://cdn.example/a.png" }] } };
    };
    const done = await waitYfaiTask("key", { task_id: "t-1", is_final: false });
    expect(polls).toBe(4);
    expect(yfaiTaskUrls(done, "images")).toEqual(["https://cdn.example/a.png"]);
});
test("a poll that is refused for good ends the wait and names the task", async () => {
    yfaiTimings.pollMs = 1;
    handler = (config) => { throw new AxiosError("denied", "ERR_BAD_REQUEST", config, null, { status: 401, data: { error: { message: "invalid key" } }, statusText: "", headers: {}, config } as never); };
    await expect(waitYfaiTask("key", { task_id: "t-lost", is_final: false })).rejects.toThrow("t-lost");
});

test("a final failed task throws instead of being interpreted as a successful result", async () => {
    await expect(waitYfaiTask("key", { is_final: true, status: "failed", error: { message: "failed safely" } })).rejects.toThrow("failed safely");
    expect(calls).toHaveLength(0);
});
test("music uses runtime generate and downloads the returned audio without leaking the key", async () => {
    handler = (call) => call.method === "post" ? { task_id: "music-one" } : { is_final: true, status: "completed", output_url: "https://cdn/music.mp3" };
    let downloadInit: RequestInit | undefined;
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => { downloadInit = init; return new Response(new Blob(["synthetic audio"], { type: "audio/mpeg" })); }) as typeof fetch;
    const blob = await requestAudioGeneration(config("music"), "synthetic music prompt");
    expect(blob.type).toBe("audio/mpeg");
    expect(JSON.parse(calls[0].data)).toMatchObject({ modality: "audio", operation: "generate" });
    expect(downloadInit?.headers).toBeUndefined();
});
test("chat uses completions and retains streaming with its provider key", async () => {
    let body: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        body = JSON.parse(String(init?.body));
        expect(String(_url)).toEndWith("/v1/chat/completions");
        return new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n', { headers: { "Content-Type": "text/event-stream" } });
    }) as typeof fetch;
    let text = "";
    await requestImageQuestion(config("gpt-5.5"), [{ role: "user", content: "hello" }], (delta) => { text = delta; });
    expect(body.model).toBe("gpt-5.5");
    expect(text).toBe("hello");
});
test("node parameters override global defaults and stay scoped by model", () => {
    const serialized = JSON.stringify({ "seedance-2-5": { duration: "30" } });
    const cfg = buildGenerationConfig(config("seedance-2-5"), { id: "node", type: "video", title: "", position: { x: 0, y: 0 }, width: 300, height: 200, metadata: { model: "yfai::seedance-2-5", yfaiParams: serialized } }, "video");
    expect(cfg.yfaiParams).toBe(serialized);
    expect(buildYfaiParams(cfg, model("seedance-2-5")).duration).toBe("30");
    expect(buildYfaiParams(cfg, model("gpt-image-2")).duration).toBeUndefined();
    expect(useConfigStore.getState().isAiConfigReady(withYfaiConfig(cfg, { apiKey: "" }), cfg.model)).toBe(false);
});

test("a prompt longer than the catalog's length hint is still sent: the YFAI gateway does not enforce it", () => {
    const long = "字".repeat(1500);
    const body = buildYfaiInvoke(config("mj_imagine"), model("mj_imagine"), long, { ...yfaiDefaults(model("mj_imagine")), mode: "text-to-image" });
    expect((body.params as { prompt: string }).prompt).toHaveLength(1500);
});
