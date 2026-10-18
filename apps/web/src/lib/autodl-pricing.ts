// FrameDock: AutoDL.Art pricing. Prices come from the AutoDL model market price list
// (POST /api/v1/mllm/model/list). `autodl-pricing.json` is a full snapshot (incl. models only
// visible when logged in); "连接并同步模型" refreshes the public part at runtime.
// Units: AutoDL prices are in 1/1000 yuan; member price = price × member_discount / 100 unless given.

import snapshot from "./autodl-pricing.json";
import { findAutodlModel, nearestOption } from "./autodl-catalog";

export type AutodlPriceEntry = { n: string; t: "text" | "image" | "video"; p: string; d: number; c: unknown };
export type PriceQuote = { member: number; original: number; approximate: boolean; note?: string };
export type PriceLabel = { member: string; original?: string; approximate: boolean; note?: string };
export type CostParams = {
    count?: number;
    /** Image size "WxH" or ratio like "1:1". */
    size?: string;
    quality?: string;
    /** Video resolution in the settings panel's units: "480" / "720" / "1080". */
    resolution?: string;
    seconds?: number;
    hasFirstFrame?: boolean;
    hasReferenceVideo?: boolean;
};

type Fields = Record<string, unknown> & { member_price?: Record<string, number> };
type JsonItem = Fields & { price: number; billing_mode?: string; task_type?: string; resolution?: string; quality?: string; duration_seconds?: number; has_audio?: boolean; has_reference_video?: boolean; has_specified_voice?: boolean };

export const AUTODL_PRICES_FETCHED_AT = snapshot.fetchedAt;
const snapshotEntries = new Map((snapshot.models as AutodlPriceEntry[]).map((entry) => [entry.n.toLowerCase(), entry]));
let liveEntries = new Map<string, AutodlPriceEntry>();

/** Live prices from the latest sync override the bundled snapshot. */
export function setLiveAutodlPrices(entries: AutodlPriceEntry[] | undefined) {
    liveEntries = new Map((entries || []).map((entry) => [entry.n.toLowerCase(), entry]));
}

/** Downloads the public price list (anonymous; login-only models keep their snapshot price). */
export async function fetchAutodlPrices(fetchImpl: (url: string, init: RequestInit) => Promise<Response>): Promise<AutodlPriceEntry[]> {
    const entries: AutodlPriceEntry[] = [];
    for (const [tag, t] of [[22, "text"], [23, "image"], [24, "video"]] as const) {
        const response = await fetchImpl("https://www.autodl.art/api/v1/mllm/model/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token_group: "discount", page_size: 100, page_index: 1, model_types: [], unified_tag_ids: [tag] }),
        });
        const payload = (await response.json()) as { data?: { list?: Array<{ model_name: string; price_type: string; price_config: Record<string, unknown> & { member_discount?: number } }> } };
        for (const item of payload.data?.list || []) entries.push({ n: item.model_name, t, p: item.price_type, d: item.price_config.member_discount ?? 100, c: item.price_config[item.price_type] });
    }
    return entries;
}

export function findAutodlPrice(model: string) {
    if (model.includes("::") && !model.startsWith("autodl::") && !model.startsWith("autodl-gemini::")) return undefined;
    const name = (model.includes("::") ? model.slice(model.indexOf("::") + 2) : model).trim().toLowerCase();
    return liveEntries.get(name) || snapshotEntries.get(name);
}

const yuan = (milli: number) => milli / 1000;
const round = (value: number) => Math.round(value * 100) / 100;

function fieldPair(entry: AutodlPriceEntry, fields: Fields, key: string) {
    const original = Number(fields[key] ?? 0);
    const member = fields.member_price?.[key] ?? (original * entry.d) / 100;
    return { original: yuan(original), member: yuan(member) };
}

function money(value: number) {
    if (value >= 100) return `¥${value.toFixed(0)}`;
    if (value >= 1) return `¥${value.toFixed(2).replace(/\.?0+$/, "")}`;
    return `¥${value.toFixed(value < 0.1 ? 3 : 2).replace(/0+$/, "").replace(/\.$/, "")}`;
}

// ---- token based (chat and Gemini/GPT image) ----

function tokenFields(entry: AutodlPriceEntry): Fields | undefined {
    const config = entry.c as Fields | Fields[] | undefined;
    if (Array.isArray(config)) return config[0];
    // Time-of-day tiers (DeepSeek): quote the peak tier, off-peak is half.
    const tiers = (config as { tiers?: Array<{ price: Fields; tier_name?: string }> } | undefined)?.tiers;
    if (tiers?.length) return (tiers.find((tier) => tier.tier_name === "peak") || tiers[0]).price;
    return config;
}

/** Typical output tokens per image, used to estimate token-billed image models. */
function imageOutputTokens(model: string, params: CostParams) {
    const name = model.toLowerCase();
    if (name.startsWith("gemini-2.5")) return 1290;
    if (name.includes("gemini") || name.includes("banana")) return /4k/i.test(params.quality || "") ? 2000 : 1120;
    // gpt-image: 1024² ≈ 272 / 1056 / 4160 tokens for low / medium / high; auto is treated as high.
    const [w, h] = (params.size || "").split("x").map(Number);
    const scale = w > 0 && h > 0 ? (w * h) / (1024 * 1024) : 1;
    const base = params.quality === "low" ? 272 : params.quality === "medium" ? 1056 : 4160;
    return Math.round(base * Math.max(1, scale));
}

// ---- video json_unit items ----

function videoItems(entry: AutodlPriceEntry) {
    return ((entry.c as { items?: JsonItem[] } | undefined)?.items || []).filter((item) => !item.has_audio && !item.has_specified_voice);
}

function catalogResolution(model: string, params: CostParams) {
    const options = (findAutodlModel(model)?.resolutions || ["480", "720", "1080"]).map(Number);
    return nearestOption(Number.parseInt(params.resolution || "720", 10) || 720, options);
}

function catalogSeconds(model: string, params: CostParams, fallback: number[]) {
    return nearestOption(params.seconds || fallback[0], findAutodlModel(model)?.durations || fallback);
}

function videoDimensions(resolution: number) {
    return resolution >= 1000 ? [1920, 1080] : resolution >= 700 ? [1280, 720] : [854, 480];
}

function quoteVideo(entry: AutodlPriceEntry, model: string, params: CostParams): PriceQuote | null {
    const items = videoItems(entry);
    if (!items.length) return null;
    const mode = items[0].billing_mode;
    const res = catalogResolution(model, params);
    const pick = (item?: JsonItem, multiplier = 1, approximate = false, note?: string): PriceQuote | null =>
        item ? { original: round(yuan(item.price) * multiplier), member: round(((yuan(item.price) * entry.d) / 100) * multiplier), approximate, note } : null;

    if (items.some((item) => item.task_type?.startsWith("minimax_") && item.billing_mode === "fixed")) {
        // Same mapping as the MiniMax adapter: 480 → 512P (image-to-video only), 720 → 768P, 1080 → 1080P.
        const resolution = res >= 1000 ? "1080P" : res <= 540 && params.hasFirstFrame ? "512P" : "768P";
        const seconds = resolution === "1080P" ? 6 : catalogSeconds(model, params, [6, 10]);
        const task = params.hasFirstFrame ? "minimax_img2video" : "minimax_text2video";
        return pick(items.find((item) => item.task_type === task && item.resolution === resolution && item.duration_seconds === seconds) || items.find((item) => item.resolution === resolution && item.duration_seconds === seconds));
    }
    if (mode === "fixed") {
        // Kling: std (720) / pro (1080), 5 or 10 seconds, text2video / image2video.
        const quality = res >= 1000 ? "pro" : "std";
        const seconds = catalogSeconds(model, params, [5, 10]);
        const task = params.hasFirstFrame ? "image2video" : "text2video";
        return pick(items.find((item) => item.task_type === task && item.quality === quality && item.duration_seconds === seconds));
    }
    if (mode === "per_second") {
        const seconds = catalogSeconds(model, params, [5]);
        const item = items.find((candidate) => candidate.resolution?.toUpperCase() === `${res}P`) || items.find((candidate) => candidate.quality === (res >= 1000 ? "pro" : "std") && !candidate.has_reference_video) || items[0];
        return pick(item, seconds);
    }
    if (mode === "per_token") {
        // Seedance bills output video tokens ≈ width × height × 24fps × seconds / 1024.
        const seconds = catalogSeconds(model, params, [5]);
        const [w, h] = videoDimensions(res);
        const tokens = (w * h * 24 * seconds) / 1024;
        const item = items.find((candidate) => candidate.resolution?.toLowerCase() === `${res}p` && Boolean(candidate.has_reference_video) === Boolean(params.hasReferenceVideo)) || items[0];
        return pick(item, tokens / 1_000_000, true, "按 token 估算");
    }
    return null;
}

/** Estimated cost of one generation with the given settings, or null for models without a price. */
export function estimateAutodlCost(model: string, params: CostParams = {}): PriceQuote | null {
    const entry = findAutodlPrice(model);
    if (!entry) return null;
    const count = Math.max(1, params.count || 1);
    if (entry.t === "video") return quoteVideo(entry, model, params);
    if (entry.p === "simple_unit") {
        const fields = entry.c as Fields;
        const unit = fieldPair(entry, fields, "output_price");
        return { original: round(unit.original * count), member: round(unit.member * count), approximate: false };
    }
    if (entry.t === "image") {
        const fields = tokenFields(entry);
        if (!fields) return null;
        const unit = fieldPair(entry, fields, "output_image_price");
        const tokens = imageOutputTokens(entry.n, params) * count;
        return { original: round((unit.original * tokens) / 1_000_000), member: round((unit.member * tokens) / 1_000_000), approximate: true, note: "按 token 估算" };
    }
    return null;
}

export function formatQuote(quote: PriceQuote | null): PriceLabel | null {
    if (!quote) return null;
    const prefix = quote.approximate ? "约 " : "";
    return {
        member: `${prefix}${money(quote.member)}`,
        original: quote.original > quote.member + 0.0001 ? money(quote.original) : undefined,
        approximate: quote.approximate,
        note: quote.note,
    };
}

/** Short unit price shown next to a model, e.g. "¥0.12/张" or "输入 ¥5.6 · 输出 ¥19.6 /百万 token". */
export function describeAutodlPrice(model: string): PriceLabel | null {
    const entry = findAutodlPrice(model);
    if (!entry) return null;
    const discounted = entry.d < 100;
    if (entry.t === "video") {
        const items = videoItems(entry);
        if (!items.length) return null;
        const mode = items[0].billing_mode;
        const cheapest = items.reduce((low, item) => (item.price < low.price ? item : low), items[0]);
        const member = (yuan(cheapest.price) * entry.d) / 100;
        if (mode === "per_second") return { member: `${money(member)}/秒起`, original: discounted ? `${money(yuan(cheapest.price))}/秒` : undefined, approximate: false };
        if (mode === "per_token") {
            const quote = estimateAutodlCost(model, { resolution: "480", seconds: 5 });
            return quote ? { member: `约 ${money(quote.member)}/条起`, original: discounted ? `约 ${money(quote.original)}` : undefined, approximate: true, note: "按 token 计费，以 480p 5 秒估算" } : null;
        }
        return { member: `${money(member)}/条起`, original: discounted ? `${money(yuan(cheapest.price))}` : undefined, approximate: false };
    }
    if (entry.p === "simple_unit") {
        const unit = fieldPair(entry, entry.c as Fields, "output_price");
        return { member: `${money(unit.member)}/张`, original: discounted ? `${money(unit.original)}/张` : undefined, approximate: false };
    }
    if (entry.t === "image") {
        const quote = estimateAutodlCost(model, { count: 1, size: "1024x1024", quality: "auto" });
        return quote ? { member: `约 ${money(quote.member)}/张`, original: discounted ? `约 ${money(quote.original)}` : undefined, approximate: true, note: "按 token 计费，以 1024² 估算" } : null;
    }
    const fields = tokenFields(entry);
    if (!fields) return null;
    const input = fieldPair(entry, fields, "input_price");
    const output = fieldPair(entry, fields, "output_price");
    const tiered = Boolean((entry.c as { tiers?: unknown })?.tiers);
    return {
        member: `入 ${money(input.member)} · 出 ${money(output.member)} /百万token`,
        original: discounted ? `入 ${money(input.original)} · 出 ${money(output.original)}` : undefined,
        approximate: false,
        note: tiered ? "高峰时段价格，闲时半价" : Array.isArray(entry.c) ? "短上下文价格，长上下文更贵" : undefined,
    };
}

/** Maps the app's generation settings (AiConfig-like) to pricing parameters. */
export function generationCostParams(config: { count?: string; size?: string; quality?: string; vquality?: string; videoSeconds?: string }, hasFirstFrame = false, hasReferenceVideo = false): CostParams {
    return {
        count: Math.max(1, Number.parseInt(config.count || "1", 10) || 1),
        size: /^\d+x\d+$/.test(config.size || "") ? config.size : undefined,
        quality: config.quality,
        resolution: config.vquality,
        seconds: Number.parseInt(config.videoSeconds || "", 10) || undefined,
        hasFirstFrame,
        hasReferenceVideo,
    };
}
