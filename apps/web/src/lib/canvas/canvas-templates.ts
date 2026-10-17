// FrameDock: one-click workflow templates. Each template lays out a ready-to-run node graph: text inputs,
// config nodes carrying skills / prompt recipes, and the result nodes they write into. Generation in a
// chain goes through config nodes (see workflow-runner.ts), so skills sit on text-mode config nodes.
// The builder is pure: node creation and translation are injected so it can be unit-tested.
import { composePresetPrompt, PROMPT_PRESETS } from "@/lib/presets/prompt-presets";
import { findBuiltinSkill, type CanvasSkill } from "@/lib/skills/skills";
import type { CanvasConnection, CanvasNodeData, CanvasNodeMetadata, CanvasNodeTypeId, Position } from "@/types/canvas";

export type CanvasTemplateId = "short-film" | "character";

export const CANVAS_TEMPLATES: Array<{ id: CanvasTemplateId; titleKey: string; descriptionKey: string }> = [
    { id: "short-film", titleKey: "templates.shortFilm.title", descriptionKey: "templates.shortFilm.description" },
    { id: "character", titleKey: "templates.character.title", descriptionKey: "templates.character.description" },
];

type Translate = (key: string, options?: Record<string, unknown>) => string;
type CreateNode = (type: CanvasNodeTypeId, position: Position, metadata?: CanvasNodeMetadata) => CanvasNodeData;

const COLUMN = 460;
const ROW = 340;
const SHOT_SUBJECT = "镜头中的人物";

function recipe(ids: string[], subject = SHOT_SUBJECT) {
    return composePresetPrompt(PROMPT_PRESETS.filter((preset) => ids.includes(preset.id)), subject);
}

function skill(id: string): CanvasSkill {
    const found = findBuiltinSkill(id);
    if (!found) throw new Error(`Unknown built-in skill ${id}`);
    return found;
}

export function buildCanvasTemplate(id: CanvasTemplateId, t: Translate, create: CreateNode) {
    const nodes: CanvasNodeData[] = [];
    const connections: CanvasConnection[] = [];
    const add = (type: CanvasNodeTypeId, column: number, row: number, title: string, metadata?: CanvasNodeMetadata) => {
        const node = { ...create(type, { x: column * COLUMN, y: row * ROW }, metadata), title };
        nodes.push(node);
        return node;
    };
    const link = (from: CanvasNodeData, to: CanvasNodeData) => connections.push({ id: `${from.id}->${to.id}`, fromNodeId: from.id, toNodeId: to.id });

    if (id === "short-film") {
        const idea = add("text", 0, 0, t("templates.nodes.idea"), { content: t("templates.ideaPlaceholder") });
        const scriptConfig = add("config", 1, 0, t("templates.nodes.script"), { generationMode: "text", skill: skill("builtin/idea-to-script"), prompt: "把上游的故事灵感写成 3 个镜头的分镜脚本。" });
        const script = add("text", 2, 0, t("templates.nodes.script"));
        const breakdownConfig = add("config", 3, 0, t("templates.nodes.breakdown"), { generationMode: "text", skill: skill("builtin/shot-prompts"), prompt: "为上游分镜脚本的每个镜头各写一条生图提示词。" });
        const breakdown = add("text", 4, 0, t("templates.nodes.breakdown"));
        link(idea, scriptConfig);
        link(scriptConfig, script);
        link(script, breakdownConfig);
        link(breakdownConfig, breakdown);

        const shotRecipes = [["comp-ultrawide-depth", "light-golden-hour"], ["comp-split-focus", "light-motivated"], ["comp-profile", "comp-halation"]];
        const shots = shotRecipes.map((ids, index) => {
            const n = index + 1;
            const config = add("config", 5, index - 1, t("templates.nodes.shotConfig", { n }), { generationMode: "image", size: "16:9", count: 1, prompt: `只画上游逐镜提示词里“镜头 ${n}”那一条。\n${recipe(ids)}` });
            const shot = add("image", 6, index - 1, t("templates.nodes.shot", { n }));
            link(breakdown, config);
            link(config, shot);
            return shot;
        });

        const videoConfig = add("config", 7, 0, t("templates.nodes.videoConfig"), { generationMode: "video", prompt: `以参考图为首帧，延续镜头 1 的画面。\n${recipe(["motion-anticipation", "motion-follow-through"])}` });
        const video = add("video", 8, 0, t("templates.nodes.video"));
        link(script, videoConfig);
        link(shots[0], videoConfig);
        link(videoConfig, video);
        return { title: t("templates.shortFilm.title"), nodes, connections };
    }

    const brief = add("text", 0, 0, t("templates.nodes.bible"), { content: t("templates.characterPlaceholder") });
    const bibleConfig = add("config", 1, 0, t("templates.nodes.bible"), { generationMode: "text", skill: skill("builtin/character-bible"), prompt: "把上游的角色描述整理成角色设定。" });
    const bible = add("text", 2, 0, t("templates.nodes.bible"));
    const portraitConfig = add("config", 3, 0, t("templates.nodes.portraitConfig"), { generationMode: "image", size: "3:4", count: 1, prompt: "只按上游角色设定最后的“定妆照”提示词生成：中性灰背景，正面半身，光线柔和均匀。" });
    const portrait = add("image", 4, 0, t("templates.nodes.portrait"));
    link(brief, bibleConfig);
    link(bibleConfig, bible);
    link(bible, portraitConfig);
    link(portraitConfig, portrait);

    const scenes = [
        { text: "雨夜的码头边，他独自等船", ids: ["comp-tele-compress", "light-motivated"] },
        { text: "清晨的市集里，他穿过人群", ids: ["comp-ensemble", "light-window"] },
        { text: "灯塔顶上，他望向远方的海面", ids: ["comp-god-rays", "emotion-longing"] },
    ];
    scenes.forEach((scene, index) => {
        const n = index + 1;
        const config = add("config", 5, index - 1, t("templates.nodes.sceneConfig", { n }), { generationMode: "image", size: "16:9", count: 1, prompt: `场景 ${n}：${scene.text}。人物外貌与定妆图、角色设定中的固定特征完全一致。\n${recipe(scene.ids, "他")}` });
        const image = add("image", 6, index - 1, t("templates.nodes.scene", { n }));
        link(bible, config);
        link(portrait, config);
        link(config, image);
    });
    return { title: t("templates.character.title"), nodes, connections };
}
