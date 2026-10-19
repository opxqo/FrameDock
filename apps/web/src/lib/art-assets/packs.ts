// FrameDock: 美术资产 packs — the data that defines every preset node. A pack is one asset category with up to three
// nodes: 定稿 (master), 派生 (derive) and 工具 (tool). Adding a category means adding a pack file under ./packs and
// listing it below; node types, menus and one-click 派生 follow from this list. See docs/design/preset-nodes.md.

import type { ArtAssetCategory, ArtAssetTemplate, ArtAssetTier, LocalText } from "@/lib/art-assets/templates";
import { CHARACTER_PACK } from "@/lib/art-assets/packs/character";
import { SCENE_PACK } from "@/lib/art-assets/packs/scene";
import { COSTUME_PACK } from "@/lib/art-assets/packs/costume";
import { PROP_PACK } from "@/lib/art-assets/packs/prop";
import { TOOL_PACK } from "@/lib/art-assets/packs/tool";

export type ArtAssetNodeSpec = {
    title: LocalText;
    /** One short line for the create menu (keep it under ~12 characters so the menu does not overflow). */
    description: LocalText;
    templates: ArtAssetTemplate[];
};

export type ArtAssetPack = {
    category: ArtAssetCategory;
    /** Category name, used in result titles ("人物 · 角色三视图"). */
    label: LocalText;
    master?: ArtAssetNodeSpec;
    derive?: ArtAssetNodeSpec;
    tool?: ArtAssetNodeSpec;
};

export const ART_ASSET_PACKS: ArtAssetPack[] = [CHARACTER_PACK, SCENE_PACK, COSTUME_PACK, PROP_PACK, TOOL_PACK];

export const ART_ASSET_TIERS: ArtAssetTier[] = ["master", "derive", "tool"];

/** Node type of a pack's node, e.g. "framedock:character-master". */
export const artAssetNodeType = (category: ArtAssetCategory, tier: ArtAssetTier) => `framedock:${category}-${tier}`;
