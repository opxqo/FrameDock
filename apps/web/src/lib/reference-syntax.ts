import i18n from "@/i18n";
import { buildImageReferencePromptText } from "@/lib/image-reference-prompt";

// FrameDock: prompts number their references "图片1 / 参考视频 1 / 参考音频 1" in send order. Models that
// document their own way of pointing at a reference get exactly that; the rest get a one-line legend
// that says which number is which picture. Sources: each model's YFAI page (input_hint / param descriptions).

type NativeSyntax = { image: (n: number) => string; video?: (n: number) => string; audio?: (n: number) => string };

const NATIVE: Array<{ match: RegExp; syntax: NativeSyntax | "keep" }> = [
    // "prompt 用 @图片1~@图片N 引用" / "@图片1/@视频1/@音频1 引用参考素材"
    { match: /^(seedance-|wan-3-0$)/, syntax: { image: (n) => `@图片${n}`, video: (n) => `@视频${n}`, audio: (n) => `@音频${n}` } },
    // "提示词里用 Image 1 / Image 2 指代参考图"
    { match: /^flux-3$/, syntax: { image: (n) => `Image ${n}` } },
    // "可上传参考图并在提示词里用「图1」「图2」指代"
    { match: /^kling-image-o3$/, syntax: { image: (n) => `图${n}` } },
    // MJ takes its references as image prompts in order; words in the prompt do not address them.
    { match: /^mj_imagine$/, syntax: "keep" },
];

export function nativeReferenceSyntax(modelId: string) {
    return NATIVE.find((entry) => entry.match.test(modelId))?.syntax;
}

function labelPattern(sample: (index: string) => string) {
    const [before = "", after = ""] = sample("\u0000").split("\u0000");
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`${escape(before)}\\s?(\\d+)${escape(after)}`, "g");
}

/** Matches "图片3" / "Image 3" (current language), capturing the number. */
export const imageLabelPattern = () => labelPattern((index) => i18n.t("imageReferences.label", { index }));

const LABELS = {
    image: imageLabelPattern,
    video: () => labelPattern((index) => `${i18n.t("canvas.configNode.videoReferences")} ${index}`),
    audio: () => labelPattern((index) => `${i18n.t("canvas.configNode.audioReferences")} ${index}`),
};

/**
 * Rewrites the reference numbers in a prompt into the target model's own syntax. A number higher than the
 * references actually sent is left untouched (the pre-run check reports it).
 */
export function compileReferenceSyntax(prompt: string, modelId: string, counts: { images: number; videos: number; audios: number }) {
    const syntax = nativeReferenceSyntax(modelId);
    if (syntax === "keep") return prompt;
    const imagePattern = LABELS.image();
    if (!syntax) {
        // No documented syntax: keep the numbers and say once which picture each one is.
        const mentionsImages = [...prompt.matchAll(imagePattern)].some((match) => Number(match[1]) <= counts.images);
        return mentionsImages ? buildImageReferencePromptText(prompt, Array.from({ length: counts.images }) as never[]) : prompt;
    }
    let text = prompt.replace(imagePattern, (label, n: string) => (Number(n) <= counts.images ? syntax.image(Number(n)) : label));
    if (syntax.video) text = text.replace(LABELS.video(), (label, n: string) => (Number(n) <= counts.videos ? syntax.video!(Number(n)) : label));
    if (syntax.audio) text = text.replace(LABELS.audio(), (label, n: string) => (Number(n) <= counts.audios ? syntax.audio!(Number(n)) : label));
    return text;
}
