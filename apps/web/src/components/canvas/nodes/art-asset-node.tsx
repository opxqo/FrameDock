import { ArtAsset, ArtCharacterDerive, ArtCharacterMaster, ArtCostumeDerive, ArtCostumeMaster, ArtPropDerive, ArtPropMaster, ArtSceneDerive, ArtSceneMaster, ArtTool, type IconComponent } from "@/components/icons";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { ART_ASSET_PACKS, ART_ASSET_TIERS, artAssetNodeType } from "@/lib/art-assets/packs";
import { ART_ASSET_CATEGORIES, ART_ASSET_DEFAULT_TEMPLATE, artAssetOptionValues, artAssetTemplates, composeArtAssetPrompt, findArtAssetTemplate, registerArtAssetTemplates, type ArtAssetCategory, type ArtAssetTemplate, type ArtAssetTier, type LocalText } from "@/lib/art-assets/templates";
import { ART_ASSET_NODE_TYPE, artAssetMaster, artAssetOutputs } from "@/lib/art-assets/node-types";
import { CanvasNodeType, type CanvasNodeData } from "@/types/canvas";
import type { CanvasNodeContext, CanvasNodeDefinition } from "@/types/canvas-plugin";

// FrameDock: 美术资产 preset nodes. Each node offers a fixed set of templates; the built-in image panel below supplies
// the model, settings and an optional description, and generation wraps them (plus connected reference images) in
// the chosen template, placing the result to the right. The nodes come from the packs in lib/art-assets/packs:
//   一级 · 定稿 — makes the master design (from a description, or from an existing image) and shares it as 母版;
//   二级 · 派生 — works from that master, so every image shows the same character / scene / object;
//   工具 — single image operations.
// The first, combined node (all categories, FrameDock's own prompts) stays registered for canvases that use it.

registerArtAssetTemplates(ART_ASSET_PACKS.flatMap((pack) => ART_ASSET_TIERS.flatMap((tier) => pack[tier]?.templates ?? [])));

/** Node icons by `<category>-<tier>`; a pack without its own falls back to the 美术资产 masks. */
const ICONS: Record<string, IconComponent> = {
    "character-master": ArtCharacterMaster,
    "character-derive": ArtCharacterDerive,
    "scene-master": ArtSceneMaster,
    "scene-derive": ArtSceneDerive,
    "costume-master": ArtCostumeMaster,
    "costume-derive": ArtCostumeDerive,
    "prop-master": ArtPropMaster,
    "prop-derive": ArtPropDerive,
};
const iconFor = (category: string | undefined, tier: ArtAssetTier | undefined) => (tier === "tool" ? ArtTool : ICONS[`${category}-${tier}`]) ?? ArtAsset;

/** Pack text in the app's language. */
const local = (text: LocalText) => (i18n.resolvedLanguage?.startsWith("en") ? text.en : text.zh);

type ArtAssetNodeConfig = {
    type: string;
    title: LocalText;
    description: LocalText;
    /** Category name for result titles; the combined node uses its locale keys instead. */
    label?: LocalText;
    templates: ArtAssetTemplate[];
    /** Pack category: picks the icon and the menu subgroup. */
    category?: ArtAssetCategory;
    /** Combined node only: category tabs on the card. */
    categoryTabs?: boolean;
    tier?: ArtAssetTier;
    height: number;
    showInCreateMenu?: boolean;
};

const templateOf = (node: CanvasNodeData, config: ArtAssetNodeConfig) => {
    const chosen = findArtAssetTemplate(node.metadata?.artAsset?.templateId);
    return chosen && config.templates.includes(chosen) ? chosen : config.templates[0];
};

const upstreamImages = (ctx: CanvasNodeContext) => ctx.getUpstream().filter((item) => item.type === CanvasNodeType.Image && item.metadata?.content);

function ArtAssetCard({ ctx, config }: { ctx: CanvasNodeContext; config: ArtAssetNodeConfig }) {
    const { t } = useTranslation();
    const { node, theme } = ctx;
    const template = templateOf(node, config);
    const category = (template?.category ?? "character") as ArtAssetCategory;
    const images = upstreamImages(ctx);
    // 定稿 nodes: what this node has made, and the 母版 it shares with its next generations.
    const outputs = config.tier === "master" ? artAssetOutputs(node, ctx.getNodes(), ctx.getConnections()) : [];
    const master = config.tier === "master" ? artAssetMaster(node, ctx.getNodes(), ctx.getConnections()) : undefined;
    const sharing = node.metadata?.artAsset?.useMaster !== false;
    const referenceCount = images.length + (master ? 1 : 0);
    const templates = config.categoryTabs ? artAssetTemplates(category) : config.templates;
    const options = template ? artAssetOptionValues(template, node.metadata?.artAsset?.options) : {};

    const choose = (next: ArtAssetTemplate) => ctx.updateMetadata({ artAsset: { ...node.metadata?.artAsset, category: next.category, templateId: next.id }, size: next.size });
    const setOption = (id: string, value: string) => template && ctx.updateMetadata({ artAsset: { ...node.metadata?.artAsset, category: template.category, templateId: template.id, options: { ...node.metadata?.artAsset?.options, [id]: value } } });
    const setMaster = (patch: { masterId?: string; useMaster?: boolean }) => template && ctx.updateMetadata({ artAsset: { ...node.metadata?.artAsset, category: template.category, templateId: template.id, ...patch } });
    const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();
    const NodeIcon = iconFor(config.category, config.tier);

    return (
        <div className="flex h-full w-full flex-col gap-2.5 p-3.5 text-left" style={{ color: theme.node.text }}>
            <div className="flex items-center gap-2 text-sm font-semibold">
                <NodeIcon className="size-4" style={{ color: theme.node.activeStroke }} />
                {local(config.title)}
                {config.tier ? (
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-normal" style={{ background: theme.node.fill, color: theme.node.muted }}>
                        {t(`artAsset.tiers.${config.tier}`)}
                    </span>
                ) : null}
                <span className="ml-auto text-[11px] font-normal" style={{ color: theme.node.muted }}>
                    {t("artAsset.references", { count: referenceCount })}
                </span>
            </div>

            {outputs.length ? (
                <div className="flex items-center gap-1.5">
                    {outputs.slice(0, 4).map((image) => (
                        <button key={image.id} type="button" className="relative size-11 shrink-0 overflow-hidden rounded-md border-2 transition" style={{ borderColor: sharing && image.id === master?.id ? theme.node.activeStroke : "transparent", opacity: sharing ? 1 : 0.5 }} title={image.title} onClick={(event) => (stop(event), setMaster({ masterId: image.id, useMaster: true }))}>
                            <img src={image.metadata?.content} alt={image.title} draggable={false} className="size-full object-cover" />
                        </button>
                    ))}
                    <div className="min-w-0 flex-1 text-[11px] leading-4" style={{ color: theme.node.muted }}>
                        <div>{t(sharing ? "artAsset.sharingOn" : "artAsset.sharingOff")}</div>
                        <button type="button" className="underline underline-offset-2" onClick={(event) => (stop(event), setMaster({ useMaster: !sharing }))}>
                            {t(sharing ? "artAsset.sharingStop" : "artAsset.sharingStart")}
                        </button>
                    </div>
                </div>
            ) : null}

            {config.tier === "derive" ? (
                images.length ? (
                    <div className="flex items-center gap-1.5">
                        {images.slice(0, 4).map((image, index) => (
                            <div key={image.id} className="relative size-11 shrink-0 overflow-hidden rounded-md border" style={{ borderColor: index === 0 ? theme.node.activeStroke : theme.node.stroke }} title={image.title}>
                                <img src={image.metadata?.content} alt={image.title} draggable={false} className="size-full object-cover" />
                            </div>
                        ))}
                        <span className="min-w-0 text-[11px] leading-4" style={{ color: theme.node.muted }}>
                            {t(images.length > 1 ? "artAsset.masterMany" : "artAsset.masterOne")}
                        </span>
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed px-2.5 py-2 text-[11px] leading-4" style={{ borderColor: theme.node.stroke, color: theme.node.muted }}>
                        {t("artAsset.connectMaster")}
                    </div>
                )
            ) : null}

            {config.categoryTabs ? (
                <div className="grid grid-cols-4 gap-1 rounded-lg p-0.5" style={{ background: theme.node.fill }}>
                    {ART_ASSET_CATEGORIES.map((item) => (
                        <button key={item} type="button" className="h-7 rounded-md text-xs transition" style={item === category ? { background: theme.node.activeStroke, color: "#fff" } : { color: theme.node.muted }} onClick={(event) => (stop(event), choose(artAssetTemplates(item)[0]!))}>
                            {t(`artAsset.categories.${item}`)}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="thin-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5" onWheel={stop}>
                {templates.map((item) => {
                    const active = item.id === template?.id;
                    return (
                        <button key={item.id} type="button" className="rounded-lg border px-3 py-1.5 text-left transition" style={{ borderColor: active ? theme.node.activeStroke : theme.node.stroke, background: active ? theme.node.fill : "transparent" }} onClick={(event) => (stop(event), choose(item))}>
                            <div className="flex items-center gap-2 text-[13px] font-medium">
                                {item.title ? local(item.title) : t(`artAsset.templates.${item.id}.title`)}
                                <span className="ml-auto text-[10px] font-normal" style={{ color: theme.node.muted }}>
                                    {item.size === "auto" ? t("artAsset.sizeAuto") : item.size}
                                </span>
                            </div>
                            <div className="mt-0.5 text-[11px] leading-4" style={{ color: theme.node.muted }}>
                                {item.summary ? local(item.summary) : t(`artAsset.templates.${item.id}.summary`)}
                            </div>
                        </button>
                    );
                })}
            </div>

            {template?.options?.map((option) => (
                <div key={option.id} className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-[11px]" style={{ color: theme.node.muted }}>
                        {option.label ? local(option.label) : option.id}
                    </span>
                    {option.choices.map((choice, index) => (
                        <button key={choice} title={choice} type="button" className="h-6 rounded-md border px-2 text-[11px] transition" style={options[option.id] === choice ? { borderColor: theme.node.activeStroke, color: theme.node.text, background: theme.node.fill } : { borderColor: theme.node.stroke, color: theme.node.muted }} onClick={(event) => (stop(event), setOption(option.id, choice))}>
                            {option.choiceLabels?.[index] ?? choice}
                        </button>
                    ))}
                </div>
            ))}

            {node.metadata?.status === "loading" ? (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: theme.node.activeStroke }}>
                    <span className="size-3 animate-spin rounded-full border-2" style={{ borderColor: theme.node.stroke, borderTopColor: theme.node.activeStroke }} />
                    {t("artAsset.running")}
                </div>
            ) : node.metadata?.status === "error" && node.metadata.errorDetails ? (
                <div className="line-clamp-3 break-all text-[11px] leading-4 text-red-500" title={node.metadata.errorDetails}>
                    {node.metadata.errorDetails}
                </div>
            ) : template && config.tier !== "derive" && !master ? (
                <div className="text-[11px] leading-4" style={{ color: theme.node.muted }}>
                    {t(template.input === "image" ? (config.tier === "master" ? "artAsset.needsImageOrMaster" : "artAsset.needsImage") : "artAsset.imageOrText")}
                </div>
            ) : null}
        </div>
    );
}

const errorText = { noInput: "artAsset.errors.noInput", needsImage: "artAsset.errors.needsImage", noTemplate: "artAsset.errors.noTemplate" } as const;

function artAssetNode(config: ArtAssetNodeConfig): CanvasNodeDefinition {
    const first = config.templates[0]!;
    const Content = ({ ctx }: { ctx: CanvasNodeContext }) => <ArtAssetCard ctx={ctx} config={config} />;
    return {
        type: config.type,
        title: local(config.title),
        description: local(config.description),
        icon: (() => {
            const Icon = iconFor(config.category, config.tier);
            return <Icon className="size-4" />;
        })(),
        group: i18n.t("artAsset.group"),
        subgroup: config.label ? local(config.label) : undefined,
        defaultSize: { width: 320, height: config.height },
        defaultMetadata: { artAsset: { category: first.category, templateId: first.id }, size: first.size, status: "idle" },
        minimapColor: "#e879f9",
        showInCreateMenu: config.showInCreateMenu,
        resource: () => null,
        Content,
        useBuiltinPanel: {
            mode: "image",
            allowEmptyPrompt: true,
            promptPlaceholder: (node) => i18n.t(config.tier === "derive" ? "artAsset.placeholderDerive" : templateOf(node, config)?.input === "image" ? "artAsset.placeholderImage" : "artAsset.placeholder"),
            composePrompt: (node, text, referenceCount) => {
                const template = templateOf(node, config);
                if (config.tier === "derive" && referenceCount < 1) return { error: i18n.t("artAsset.errors.needsMaster") };
                const result = composeArtAssetPrompt(template, { description: text, referenceCount, options: node.metadata?.artAsset?.options });
                return "error" in result ? { error: i18n.t(errorText[result.error]) } : result;
            },
            // 定稿 nodes reuse what they made: switching to another template keeps working on the same character.
            ownReferences: config.tier === "master" ? (node, nodes, connections) => {
                const master = artAssetMaster(node, nodes, connections);
                return master ? [master] : [];
            } : undefined,
            resultTitle: (node) => {
                const template = templateOf(node, config);
                if (!template) return local(config.title);
                const category = config.label ? local(config.label) : i18n.t(`artAsset.categories.${template.category}`);
                return `${category} · ${template.title ? local(template.title) : i18n.t(`artAsset.templates.${template.id}.title`)}`;
            },
        },
    };
}

function combinedTemplates() {
    return ART_ASSET_CATEGORIES.flatMap((category) => artAssetTemplates(category)).sort((a, b) => (a.id === ART_ASSET_DEFAULT_TEMPLATE ? -1 : b.id === ART_ASSET_DEFAULT_TEMPLATE ? 1 : 0));
}

/** Card height per tier: 派生 cards list more templates and the master thumbnail. */
const HEIGHT: Record<ArtAssetTier, number> = { master: 400, derive: 470, tool: 420 };

export const artAssetNodeDefinitions: CanvasNodeDefinition[] = [
    ...ART_ASSET_PACKS.flatMap((pack) =>
        ART_ASSET_TIERS.flatMap((tier) => {
            const spec = pack[tier];
            return spec ? [artAssetNode({ type: artAssetNodeType(pack.category, tier), title: spec.title, description: spec.description, label: pack.label, category: pack.category, templates: spec.templates, tier, height: HEIGHT[tier] })] : [];
        }),
    ),
    // The first combined node: hidden from menus, kept so existing canvases still work.
    artAssetNode({ type: ART_ASSET_NODE_TYPE, title: { zh: "美术资产", en: "Art asset" }, description: { zh: "人物、场景、服装、道具设定图", en: "Character, scene, costume, prop sheets" }, templates: combinedTemplates(), categoryTabs: true, height: 340, showInCreateMenu: false }),
];
