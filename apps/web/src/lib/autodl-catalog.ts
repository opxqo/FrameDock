// FrameDock: AutoDL.Art model catalog. Endpoints and prices come from the AutoDL model market
// (https://www.autodl.art/large-model/market) and were verified with real calls on 2026-10-17/18.
// Users only provide an API key; channels, models and request formats are fixed here.

export const AUTODL_BASE_URL = "https://www.autodl.art/api/v1";
export const AUTODL_GEMINI_BASE_URL = "https://www.autodl.art/api/v1/gemini/v1beta";
// Token management lives in the AutoDL console sidebar ("令牌管理").
export const AUTODL_TOKEN_URL = "https://www.autodl.art/large-model/market";
export const AUTODL_CHANNEL_IDS = ["autodl", "autodl-gemini"] as const;

export type AutodlFamily = "openai-image" | "gemini-image" | "minimax" | "kling" | "ark" | "wan";

export type AutodlModel = {
    name: string;
    capability: "image" | "video";
    family: AutodlFamily;
    /** Cheapest price hint shown next to the model (member price). */
    price: string;
    /** Video: resolution choices in the settings panel's "vquality" units (480 / 720 / 1080). */
    resolutions?: string[];
    /** Video: allowed durations in seconds. */
    durations?: number[];
    /** Video: false when a first frame image is required. */
    textToVideo?: boolean;
    /** Image: exact sizes the model accepts; the closest ratio is picked. */
    imageSizes?: string[];
};

export const AUTODL_MODELS: AutodlModel[] = [
    { name: "Z-Image-Turbo", capability: "image", family: "openai-image", price: "¥0.12/张", imageSizes: ["1024x1024"] },
    { name: "Qwen-Image", capability: "image", family: "openai-image", price: "¥0.15/张", imageSizes: ["1328x1328", "1664x928", "928x1664", "1472x1140", "1140x1472"] },
    { name: "gpt-image-2", capability: "image", family: "openai-image", price: "按 token", imageSizes: ["1024x1024", "1536x1024", "1024x1536"] },
    { name: "gemini-2.5-flash-image", capability: "image", family: "gemini-image", price: "按 token" },
    { name: "gemini-3.1-flash-image-preview", capability: "image", family: "gemini-image", price: "按 token" },
    { name: "nano-banana-2", capability: "image", family: "gemini-image", price: "按 token" },
    // 480 maps to MiniMax 512P, which only exists for image-to-video (the cheapest tier).
    { name: "MiniMax-Hailuo-02", capability: "video", family: "minimax", price: "¥0.36/条起", resolutions: ["480", "720", "1080"], durations: [6, 10], textToVideo: true },
    { name: "MiniMax-Hailuo-2.3-Fast", capability: "video", family: "minimax", price: "¥0.81/条起", resolutions: ["720", "1080"], durations: [6, 10], textToVideo: false },
    { name: "MiniMax-Hailuo-2.3", capability: "video", family: "minimax", price: "¥1.20/条起", resolutions: ["720", "1080"], durations: [6, 10], textToVideo: true },
    // Kling: 720 = std mode, 1080 = pro mode.
    { name: "kling-v2-5-turbo", capability: "video", family: "kling", price: "¥0.90/条起", resolutions: ["720", "1080"], durations: [5, 10], textToVideo: true },
    { name: "kling-v2-6", capability: "video", family: "kling", price: "¥0.90/条起", resolutions: ["720", "1080"], durations: [5, 10], textToVideo: true },
    { name: "doubao-seedance-2-0-mini-260615", capability: "video", family: "ark", price: "约 ¥0.5/条起", resolutions: ["480", "720"], durations: [4, 5, 6, 8, 10, 12, 15], textToVideo: true },
    { name: "doubao-seedance-2-0-fast-260128", capability: "video", family: "ark", price: "约 ¥0.8/条起", resolutions: ["480", "720"], durations: [4, 5, 6, 8, 10, 12, 15], textToVideo: true },
    { name: "doubao-seedance-2-0-260128", capability: "video", family: "ark", price: "约 ¥1.5/条起", resolutions: ["480", "720", "1080"], durations: [4, 5, 6, 8, 10, 12, 15], textToVideo: true },
    { name: "wan3.0-video", capability: "video", family: "wan", price: "¥0.21/秒起", resolutions: ["480", "720", "1080"], durations: [2, 5, 10], textToVideo: true },
    { name: "wan3.0-video-prime", capability: "video", family: "wan", price: "¥0.38/秒起", resolutions: ["480", "720", "1080"], durations: [2, 5, 10], textToVideo: true },
];

export function findAutodlModel(model: string) {
    const name = model.includes("::") ? model.slice(model.indexOf("::") + 2) : model;
    return AUTODL_MODELS.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
}

/** Picks the accepted size whose aspect ratio is closest to the requested "WxH" size. */
export function closestAutodlImageSize(model: string, requested: string | undefined) {
    const sizes = findAutodlModel(model)?.imageSizes;
    if (!sizes?.length) return requested;
    const [w, h] = (requested || "").split("x").map(Number);
    const ratio = w > 0 && h > 0 ? w / h : 1;
    const score = (size: string) => {
        const [sw, sh] = size.split("x").map(Number);
        return Math.abs(Math.log(sw / sh / ratio));
    };
    return [...sizes].sort((a, b) => score(a) - score(b))[0];
}

/** Snaps a value to the nearest allowed option (used for durations and resolutions). */
export function nearestOption(value: number, options: number[]) {
    return options.reduce((best, option) => (Math.abs(option - value) < Math.abs(best - value) ? option : best), options[0]);
}
