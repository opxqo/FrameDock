// FrameDock: 美术资产 packs — the data that defines every preset node. A pack is one asset category with up to three
// nodes: 定稿 (master), 派生 (derive) and 工具 (tool). Adding a category means adding a pack file under ./packs and
// listing it below; node types, menus and one-click 派生 follow from this list. See docs/design/preset-nodes.md.

import type { ArtAssetCategory, ArtAssetTemplate, ArtAssetTier, LocalText } from "@/lib/art-assets/templates";
import { CHARACTER_PACK } from "@/lib/art-assets/packs/character";
import { SCENE_PACK } from "@/lib/art-assets/packs/scene";
import { COSTUME_PACK } from "@/lib/art-assets/packs/costume";
import { PROP_PACK } from "@/lib/art-assets/packs/prop";
import { STORYBOARD_PACK } from "@/lib/art-assets/packs/storyboard";
import { CAMERA_PACK } from "@/lib/art-assets/packs/camera";
import { ANIMATIC_PACK } from "@/lib/art-assets/packs/animatic";
import { LOOP_PACK } from "@/lib/art-assets/packs/loop";
import { FIGHT_PACK } from "@/lib/art-assets/packs/fight";
import { TOOL_PACK } from "@/lib/art-assets/packs/tool";

export type ArtAssetNodeSpec = {
    title: LocalText;
    /** One short line for the create menu (keep it under ~12 characters so the menu does not overflow). */
    description: LocalText;
    templates: ArtAssetTemplate[];
};

export type ArtAssetPack = {
    category: ArtAssetCategory;
    /** Top-level menu group the pack's nodes are listed under: 美术资产 for assets, 镜头预演 for shot planning. */
    group: LocalText;
    /** What the nodes generate: images (default), videos (镜头预演 运镜, 动态分镜, 循环动作) or text (动作戏导演), with the matching panel. */
    output?: "image" | "video" | "text";
    /** Text packs: MOKE skills (`skill/<owner>/<namespace>/<slug>`) the node writes with; each template's prompt is the node's own instructions after them. */
    mokeSkills?: string[];
    /** Text packs: what the card and the menus say about those skills (a readable name and the author), same order as `mokeSkills`. */
    skillInfo?: Array<{ name: string; author: string }>;
    /** Text packs: what the node writes ("六段式视频提示词") and what its template choice is called ("战斗类型"), for the skill card. */
    outputLabel?: LocalText;
    templateLabel?: LocalText;
    /** Category name, used in result titles ("人物 · 角色三视图"). */
    label: LocalText;
    master?: ArtAssetNodeSpec;
    derive?: ArtAssetNodeSpec;
    tool?: ArtAssetNodeSpec;
};

export const ART_ASSET_PACKS: ArtAssetPack[] = [CHARACTER_PACK, SCENE_PACK, COSTUME_PACK, PROP_PACK, STORYBOARD_PACK, CAMERA_PACK, ANIMATIC_PACK, LOOP_PACK, FIGHT_PACK, TOOL_PACK];

export const ART_ASSET_TIERS: ArtAssetTier[] = ["master", "derive", "tool"];

/** Node type of a pack's node, e.g. "framedock:character-master". */
export const artAssetNodeType = (category: ArtAssetCategory, tier: ArtAssetTier) => `framedock:${category}-${tier}`;
