// FrameDock: official art-asset presets — ready-made prompts that turn a reference image or a short description
// into production assets for video (characters, scenes, costumes, props). Written for FrameDock; the category
// layout follows common art-asset prompt libraries. Pure data and functions, no DOM.

export type ArtAssetCategory = "character" | "scene" | "costume" | "prop" | "storyboard" | "camera" | "animatic" | "loop" | "fight" | "tool";
/** Text shown in the UI, in both app languages (pack data carries its own wording; see lib/art-assets/packs). */
export type LocalText = { zh: string; en: string };
/** "image": needs a connected reference image. "either": an image or a description is enough. */
export type ArtAssetInput = "image" | "either";

/** 定稿 makes the master design; 派生 needs that master as its reference; 工具 is a single image operation. */
export type ArtAssetTier = "master" | "derive" | "tool";
/** A template choice that is written into the prompt as `{{id}}` (MOKE's 可选参数); the first choice is the default. */
export type ArtAssetOption = {
    id: string;
    label?: LocalText;
    /** Values written into the prompt. */
    choices: string[];
    /** Short button labels when a value is too long to show (same order as choices). */
    choiceLabels?: string[];
};

export type ArtAssetTemplate = {
    id: string;
    category: ArtAssetCategory;
    input: ArtAssetInput;
    /** Recommended image ratio, written to the node when the template is chosen ("auto" follows the reference). */
    size: string;
    prompt: string;
    tier?: ArtAssetTier;
    /** "moke": prompt text from the MOKE AIGC library, used as is; "framedock" (default): FrameDock's own wording. */
    source?: "moke" | "framedock";
    options?: ArtAssetOption[];
    /** Card title and one-line summary. Pack templates carry them; the first combined node's are in the locale files. */
    title?: LocalText;
    summary?: LocalText;
};

/** Category tabs of the first, combined 美术资产 node (T019). */
export const ART_ASSET_CATEGORIES: ArtAssetCategory[] = ["character", "scene", "costume", "prop"];

// What makes an output usable as a reference in later shots. Scenes keep their own background and light.
const STUDIO_RULES = "背景与光线：纯净的中性浅灰背景；柔和均匀的棚拍光，避免强烈阴影和戏剧化光效。";
const COMMON_RULES = "通用要求：画面中不要出现任何文字、标注、编号、水印或边框；只画要求的内容，不添加多余的人物或物体。";

export const ART_ASSET_TEMPLATES: ArtAssetTemplate[] = [
    {
        id: "character-turnaround",
        category: "character",
        input: "either",
        size: "16:9",
        prompt: "绘制一张角色设定图，横向排列四个视图：正面全身、左侧面全身、背面全身，以及一个四分之三侧面的头肩特写。四个视图必须是同一个角色，体型比例、发型、五官、服装、配色和配饰完全一致；三个全身视图等高并排、脚底对齐，站姿自然放松，双臂略微离开身体，便于看清服装结构。服装材质与配饰细节清晰，各视图之间结构对应正确。",
    },
    {
        id: "character-expressions",
        category: "character",
        input: "either",
        size: "1:1",
        prompt: "绘制同一角色的表情设定图，3×3 九宫格排列，每格是同一角度的头肩特写：平静、微笑、大笑、惊讶、愤怒、悲伤、恐惧、思考、坚定。每格的发型、五官、妆容、服装领口和画风保持完全一致，只有表情变化；表情自然、有辨识度，不夸张变形。各格大小相同、间距均匀。",
    },
    {
        id: "scene-clean-plate",
        category: "scene",
        input: "image",
        size: "auto",
        prompt: "基于参考图生成这个场景的空景：移除画面中的所有人物和临时性的手持物品，把被遮挡的背景按原有的结构、材质和纹理自然补全。保持原图的机位、构图、透视、光线方向、色调和时间氛围完全不变，场景中的固定陈设保持原位。输出应像同一机位在没有人时拍下的画面。",
    },
    {
        id: "scene-four-angles",
        category: "scene",
        input: "either",
        size: "16:9",
        prompt: "绘制同一个场景的四机位设定图，2×2 排列：正面平视的全景、侧面视角的全景、高处俯视的全景、与正面相反方向的反打视角。四个画面必须是同一个空间，建筑结构、陈设位置、材质、色调和光线方向前后一致，能互相对应。画面中不出现人物。",
    },
    {
        id: "costume-breakdown",
        category: "costume",
        input: "image",
        size: "1:1",
        prompt: "从参考图的角色身上提取整套服装，做成平铺展示图：上衣、外套、下装、鞋子、配饰等每件单品分开摆放、互不遮挡，按穿着顺序从上到下整齐排列，正面朝上铺平。保持每件单品的款式、版型、面料质感、颜色、图案和磨损细节与参考图完全一致。画面中不出现人物或人体。",
    },
    {
        id: "costume-turnaround",
        category: "costume",
        input: "either",
        size: "16:9",
        prompt: "绘制一套服装的三视图：把服装穿在无面部特征的中性灰色人台上，横向并排展示正面、侧面、背面。三个视图等高对齐，服装的款式、版型、层次、面料质感、颜色、图案、扣件和配饰完全一致，结构对应正确，能看清前后片和侧缝的设计。",
    },
    {
        id: "prop-turnaround",
        category: "prop",
        input: "either",
        size: "16:9",
        prompt: "绘制一件道具的多视图设定图：横向排列正面、侧面、背面和四十五度斜视四个视图，再加一个最有特征部位的细节特写。所有视图是同一件道具，形状、比例、材质、颜色、纹理和磨损痕迹完全一致，结构对应正确。道具居中摆放，不出现手或人物。",
    },
    {
        id: "prop-extract",
        category: "prop",
        input: "image",
        size: "1:1",
        prompt: "从参考图中提取补充描述里指定的道具（没有指定时取画面中最主要的物品），单独放在画面中央完整展示，被遮挡或被裁切的部分按原有结构合理补全。保持道具的形状、比例、材质、颜色、纹理和磨损细节与参考图一致，以平视略带俯视的角度呈现。不保留原图的背景、人物和其他物品。",
    },
];

export const ART_ASSET_DEFAULT_TEMPLATE = "character-turnaround";

const registry = new Map<string, ArtAssetTemplate>(ART_ASSET_TEMPLATES.map((template) => [template.id, template]));

/** Makes templates from other files (e.g. character-templates.ts) findable by id. */
export function registerArtAssetTemplates(templates: ArtAssetTemplate[]) {
    for (const template of templates) registry.set(template.id, template);
}

export function findArtAssetTemplate(id: string | undefined) {
    return id ? registry.get(id) : undefined;
}

export function artAssetTemplates(category: ArtAssetCategory) {
    return ART_ASSET_TEMPLATES.filter((template) => template.category === category);
}

export type ArtAssetComposeError = "noInput" | "needsImage" | "noTemplate";

/**
 * The final prompt: the template, the user's extra description and a consistency rule when references are
 * connected. A template that works from an image refuses to run without one; any template needs an image or text.
 */
export function composeArtAssetPrompt(template: ArtAssetTemplate | undefined, input: { description: string; referenceCount: number; options?: Record<string, string> }): { prompt: string } | { error: ArtAssetComposeError } {
    if (!template) return { error: "noTemplate" };
    const description = input.description.trim();
    if (template.input === "image" && input.referenceCount < 1) return { error: "needsImage" };
    if (!description && input.referenceCount < 1) return { error: "noInput" };
    // Pack templates (MOKE's and our own) are complete prompts: fill [主体] and options, add nothing else.
    if (template.source === "moke" || template.tier) return { prompt: fillMokePrompt(template, description, input.options, input.referenceCount) };
    const parts = [template.prompt];
    if (input.referenceCount > 0) parts.push(`一致性：严格以参考图为准，保持其中对象的外观、比例、配色和细节特征不变${input.referenceCount > 1 ? "；多张参考图描绘的是同一对象的不同方面，综合使用" : ""}。`);
    if (description) parts.push(`【补充描述】\n${description}`);
    if (template.category !== "scene") parts.push(STUDIO_RULES);
    parts.push(COMMON_RULES);
    return { prompt: parts.join("\n\n") };
}

/** A text preset's own instructions: the template with its `{{option}}` choices filled in (the node's choice, else the first). */
export function artAssetSystemPrompt(template: ArtAssetTemplate | undefined, chosen?: Record<string, string>) {
    if (!template) return "";
    const values = artAssetOptionValues(template, chosen);
    return template.prompt.replace(/\{\{(\w+)\}\}/g, (_, id: string) => values[id] ?? "");
}

/** The value of each option: the node's choice when it is one of the template's, else the first choice. */
export function artAssetOptionValues(template: ArtAssetTemplate, chosen: Record<string, string> = {}) {
    return Object.fromEntries((template.options ?? []).map((option) => [option.id, option.choices.includes(chosen[option.id] ?? "") ? chosen[option.id]! : option.choices[0]!]));
}

/**
 * MOKE prompts are sent as written: `{{option}}` takes the chosen value, and `[主体]` (MOKE's "参考角色或 [主体]") takes
 * the description — or is dropped when there is none, leaving "参考角色". With a description and no reference image,
 * "参考角色或 [主体]" becomes just the description. A description for a prompt without `[主体]` is added at the end.
 */
function fillMokePrompt(template: ArtAssetTemplate, description: string, chosen?: Record<string, string>, referenceCount = 1) {
    const values = artAssetOptionValues(template, chosen);
    let prompt = template.prompt.replace(/\{\{(\w+)\}\}/g, (_, id: string) => values[id] ?? "");
    if (prompt.includes("[主体]")) {
        if (description && referenceCount < 1) prompt = prompt.replace(/参考[^，。；、或\s]{0,8}或\s*\[主体\]/g, description);
        prompt = description ? prompt.replaceAll("[主体]", description) : prompt.replace(/或\s*\[主体\]\s*/g, "").replaceAll("[主体]", "参考图中的角色");
        return prompt;
    }
    return description ? `${prompt}\n\n【补充描述】\n${description}` : prompt;
}
