// Official YFAI catalog: GET /v1/logical-models. Data only, refreshed by the user in Settings.
import snapshot from "./yfai-models.json";

export const YFAI_BASE_URL = "https://yf.token6688.com/v1";
export const YFAI_DOCS_URL = "https://yf.token6688.com/zh-CN/api-docs";
export type YfaiValue = string | number | boolean | string[];
export type YfaiParam = {
    type: string; label?: { zh?: string; en?: string }; description?: string; required?: boolean;
    default?: YfaiValue; enum?: Array<string | number>; options?: Array<{ value: string | number; label?: string; label_en?: string; ref_min?: number; ref_max?: number; ref_min_videos?: number }>;
    min?: number; max?: number; max_items?: number; max_items_by_mode?: Record<string, number>; max_bytes?: number;
    ui_widget?: string; available_when?: Record<string, Array<string | number | boolean>>;
};
export type YfaiModel = {
    id: string; public_id?: string; category: "chat" | "image" | "video" | "audio";
    available?: boolean; deprecated?: boolean; display_name: string; display_name_en?: string;
    description?: string; description_en?: string; max_prompt_chars?: number; capabilities?: string[];
    param_schema: Record<string, YfaiParam>;
    linkages?: Array<{ action: string; affected_param: string; affected_values?: string[]; control_param: string; control_value: string }>;
};
export const YFAI_SNAPSHOT_AT = snapshot.fetchedAt;
export const YFAI_MODELS = snapshot.models as unknown as YfaiModel[];
let liveModels: YfaiModel[] = YFAI_MODELS;
export function setLiveYfaiModels(models?: YfaiModel[]) { liveModels = models?.length ? models : YFAI_MODELS; }
export function yfaiModels(models?: YfaiModel[]) { return (models?.length ? models : liveModels).filter((model) => !model.deprecated); }
export function findYfaiModel(value: string, models?: YfaiModel[]) {
    if (value.includes("::") && !value.startsWith("yfai::")) return undefined;
    const name = value.replace(/^yfai::/, "");
    return (models?.length ? models : liveModels).find((model) => model.id === name || model.public_id === name);
}
export function isYfaiUrl(baseUrl: string) {
    try { return new URL(baseUrl).hostname === "yf.token6688.com"; } catch { return false; }
}
export function yfaiCapability(model: YfaiModel) { return model.category === "chat" ? "text" as const : model.category; }
export function yfaiToolOnly(model: YfaiModel) { return ["voice-clone", "voice-design", "whisper-1"].includes(model.id); }
export function parseYfaiParams(serialized = "", model: string): Record<string, YfaiValue> {
    try { const parsed = JSON.parse(serialized); const values = parsed[model.replace(/^yfai::/, "")]; return values && typeof values === "object" && !Array.isArray(values) ? values : {}; } catch { return {}; }
}
// FrameDock: aspect ratio defaults to "自动" — never pre-filled, so the panel shows "自动" until the user picks one.
const AUTO_DEFAULT_PARAMS = ["aspect_ratio", "ratio"];
export function yfaiDefaults(model: YfaiModel) {
    return Object.fromEntries(Object.entries(model.param_schema).flatMap(([key, spec]) => spec.default !== undefined && spec.type !== "upload" && !AUTO_DEFAULT_PARAMS.includes(key) ? [[key, spec.default]] : [])) as Record<string, YfaiValue>;
}
/**
 * Request-time meaning of "自动" for ratio params: optional ones are left out (the provider decides); required
 * ones follow the canvas size when it is one of the model's ratios, else the model default.
 */
export function resolveYfaiAutoParams(model: YfaiModel, params: Record<string, YfaiValue>, config: { size?: string }) {
    const next = { ...params };
    for (const key of AUTO_DEFAULT_PARAMS) {
        const spec = model.param_schema[key];
        if (!spec?.required || (next[key] !== undefined && next[key] !== "")) continue;
        const allowed = (spec.options?.map((option) => String(option.value)) || spec.enum?.map(String) || []);
        const fromSize = config.size && allowed.includes(config.size) ? config.size : undefined;
        const fallback = fromSize ?? spec.default;
        if (fallback !== undefined) next[key] = fallback as YfaiValue;
    }
    return next;
}
/**
 * FrameDock preset nodes: use `ratio` for the model's ratio parameter when the user left it on "自动" and the model
 * offers that ratio. Returns the serialized params unchanged otherwise (non-YFAI model, unsupported ratio, explicit choice).
 */
export function withPreferredYfaiRatio(serialized: string, modelValue: string, ratio: string | undefined, models?: YfaiModel[]) {
    const model = ratio && ratio !== "auto" ? findYfaiModel(modelValue, models) : undefined;
    if (!model || !ratio) return serialized;
    const values = parseYfaiParams(serialized, model.id);
    for (const key of AUTO_DEFAULT_PARAMS) {
        const spec = model.param_schema[key];
        if (!spec) continue;
        if (values[key] !== undefined && values[key] !== "" && values[key] !== "auto") return serialized;
        const allowed = spec.options?.map((option) => String(option.value)) || spec.enum?.map(String) || [];
        if (!allowed.includes(ratio)) return serialized;
        let all: Record<string, unknown> = {};
        try { const parsed = JSON.parse(serialized || "{}"); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) all = parsed; } catch { /* start fresh */ }
        return JSON.stringify({ ...all, [model.id]: { ...values, [key]: ratio } });
    }
    return serialized;
}
export function yfaiParamVisible(spec: YfaiParam, params: Record<string, YfaiValue>) {
    return !spec.available_when || Object.entries(spec.available_when).every(([key, values]) => values.some((value) => String(value) === String(params[key])));
}
export function validateYfaiParams(model: YfaiModel, params: Record<string, YfaiValue>) {
    for (const rule of model.linkages || []) {
        if (String(params[rule.control_param]) !== rule.control_value) continue;
        const value = params[rule.affected_param];
        const empty = value === undefined || value === "" || (Array.isArray(value) && !value.length);
        if (rule.action === "require" && empty) throw new Error(`${rule.affected_param} is required for ${params[rule.control_param]}`);
        if (rule.action === "hide" && !empty && (!rule.affected_values || rule.affected_values.includes(String(value)))) throw new Error(`${rule.affected_param}: unavailable for ${rule.control_param}=${rule.control_value}`);
    }
    for (const [key, spec] of Object.entries(model.param_schema)) {
        if (!yfaiParamVisible(spec, params)) continue;
        const value = params[key];
        const empty = value === undefined || value === "" || (Array.isArray(value) && !value.length);
        if (empty) { if (spec.required) throw new Error(`${model.display_name}: ${key} is required`); continue; }
        if (spec.enum && !spec.enum.some((allowed) => String(allowed) === String(value))) throw new Error(`${key}: ${spec.enum.join(" / ")}`);
        if (spec.type === "int" && (!Number.isInteger(Number(value)) || (spec.min !== undefined && Number(value) < spec.min) || (spec.max !== undefined && Number(value) > spec.max))) throw new Error(`${key}: ${spec.min ?? ""}–${spec.max ?? ""}`);
        if (spec.type === "upload") {
            const count = Array.isArray(value) ? value.length : 1;
            const limit = spec.max_items_by_mode?.[String(params.mode)] ?? spec.max_items;
            if (limit !== undefined && count > limit) throw new Error(`${key}: max ${limit}`);
        }
    }
    const mode = model.param_schema.mode?.options?.find((option) => String(option.value) === String(params.mode));
    const imageCount = Array.isArray(params.images) ? params.images.length : params.images ? 1 : 0;
    const videoCount = Array.isArray(params.videos) ? params.videos.length : params.videos ? 1 : 0;
    if (mode?.ref_min && imageCount < mode.ref_min) throw new Error(`images: min ${mode.ref_min}`);
    if (mode?.ref_max && imageCount > mode.ref_max) throw new Error(`images: max ${mode.ref_max}`);
    if (mode?.ref_min_videos && videoCount < mode.ref_min_videos) throw new Error(`videos: min ${mode.ref_min_videos}`);
}
