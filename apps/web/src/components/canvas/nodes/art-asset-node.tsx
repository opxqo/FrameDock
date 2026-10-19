import { ArtAsset, ArtCharacterDerive, ArtCharacterMaster, ArtCostumeDerive, ArtCostumeMaster, ArtPropDerive, ArtPropMaster, ArtSceneDerive, ArtStoryboardMaster, ArtSceneMaster, ArtTool, type IconComponent } from "@/components/icons";
import { Segmented, Switch } from "antd";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { cn } from "@/lib/utils";
import { ART_ASSET_PACKS, ART_ASSET_TIERS, artAssetNodeType } from "@/lib/art-assets/packs";
import { ART_ASSET_CATEGORIES, ART_ASSET_DEFAULT_TEMPLATE, artAssetOptionValues, artAssetTemplates, composeArtAssetPrompt, findArtAssetTemplate, registerArtAssetTemplates, type ArtAssetCategory, type ArtAssetOption, type ArtAssetTemplate, type ArtAssetTier, type LocalText } from "@/lib/art-assets/templates";
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
    "storyboard-master": ArtStoryboardMaster,
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
    /** Top-level menu group (美术资产 / 镜头预演); the combined node uses 美术资产. */
    group?: LocalText;
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

type CanvasTheme = CanvasNodeContext["theme"];
/** A neutral wash of the node's text colour: the selected-row and hover fill of the design system (10% / 6%). */
const wash = (theme: CanvasTheme, percent = 10) => `color-mix(in srgb, ${theme.node.text} ${percent}%, transparent)`;
const ring = (theme: CanvasTheme) => `inset 0 0 0 1px ${theme.node.activeStroke}`;
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

function CardHeader({ title, tier, count, Icon, theme }: { title: string; tier?: ArtAssetTier; count: number; Icon: IconComponent; theme: CanvasTheme }) {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg" style={{ background: wash(theme, 8), color: theme.node.text }}>
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold leading-4">{title}</div>
                {tier ? (
                    <div className="mt-0.5 text-[11px] leading-4" style={{ color: theme.node.label }}>
                        {t(`artAsset.tiers.${tier}`)}
                    </div>
                ) : null}
            </div>
            <span className="tnum shrink-0 rounded-full px-2 py-0.5 text-[11px] leading-4" style={{ background: wash(theme, 6), color: count ? theme.node.text : theme.node.label }}>
                {t("artAsset.references", { count })}
            </span>
        </div>
    );
}

/** The images a node works from: its 母版 (定稿, with an on/off switch) or the connected 参考 (派生). */
function AssetStrip({ label, images, activeId, dimmed, onPick, onToggle, enabled, theme }: { label: string; images: CanvasNodeData[]; activeId?: string; dimmed?: boolean; onPick?: (id: string) => void; onToggle?: (on: boolean) => void; enabled?: boolean; theme: CanvasTheme }) {
    const { t } = useTranslation();
    const shown = images.slice(0, 4);
    return (
        <div className="space-y-2 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wide" style={{ color: theme.node.label }}>
                    {label}
                </span>
                {onToggle ? (
                    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: theme.node.label }} onPointerDown={stop} onClick={stop}>
                        {t(enabled ? "artAsset.sharingOn" : "artAsset.sharingOff")}
                        <Switch size="small" checked={enabled} onChange={onToggle} aria-label={t("artAsset.sharingLabel")} />
                    </span>
                ) : null}
            </div>
            <div className="flex items-center gap-2">
                {shown.map((image) => {
                    const active = image.id === activeId;
                    return (
                        <button key={image.id} type="button" disabled={!onPick} className="relative size-12 shrink-0 overflow-hidden rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-signal/60" style={{ boxShadow: active ? `${ring(theme)}, 0 0 0 2px ${wash(theme, 10)}` : undefined, opacity: dimmed ? 0.45 : 1 }} title={image.title} onClick={(event) => (stop(event), onPick?.(image.id))}>
                            <img src={image.metadata?.content} alt={image.title} draggable={false} className="size-full object-cover" />
                        </button>
                    );
                })}
                {images.length > shown.length ? (
                    <span className="tnum text-[11px]" style={{ color: theme.node.label }}>
                        +{images.length - shown.length}
                    </span>
                ) : null}
            </div>
        </div>
    );
}

/** The strip's empty state: says what will appear here, so the space is never just blank. */
function MissingMaster({ text, theme }: { text: string; theme: CanvasTheme }) {
    return (
        <div className="flex min-h-12 items-center rounded-lg border border-dashed px-3 py-2 text-[11px] leading-4" style={{ borderColor: theme.node.activeStroke, color: theme.node.label }}>
            {text}
        </div>
    );
}

function TemplateGrid({ templates, activeId, onChoose, theme }: { templates: ArtAssetTemplate[]; activeId?: string; onChoose: (template: ArtAssetTemplate) => void; theme: CanvasTheme }) {
    const { t } = useTranslation();
    const scrolls = templates.length > 8;
    return (
        <div className="thin-scrollbar grid max-h-[212px] min-h-0 grid-cols-2 gap-1 overflow-y-auto" style={scrolls ? { maskImage: "linear-gradient(to bottom, black calc(100% - 18px), transparent)" } : undefined} onWheel={stop}>
            {templates.map((item) => {
                const active = item.id === activeId;
                const name = item.title ? local(item.title) : t(`artAsset.templates.${item.id}.title`);
                return (
                    <button key={item.id} type="button" title={name} className={cn("flex h-8 min-w-0 items-center gap-1.5 rounded-lg px-2.5 text-left text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-signal/60", !active && "hover:bg-accent")} style={active ? { background: wash(theme), boxShadow: ring(theme), color: theme.node.text } : { color: theme.node.label }} onClick={(event) => (stop(event), onChoose(item))}>
                        <span className="size-1.5 shrink-0 rounded-full" style={{ background: active ? theme.node.text : "transparent" }} />
                        <span className="truncate">{name}</span>
                    </button>
                );
            })}
        </div>
    );
}

function TemplateNote({ template, theme }: { template?: ArtAssetTemplate; theme: CanvasTheme }) {
    const { t } = useTranslation();
    if (!template) return null;
    return (
        <div className="space-y-1 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
            <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-semibold leading-4">{template.title ? local(template.title) : t(`artAsset.templates.${template.id}.title`)}</span>
                <span className="tnum shrink-0 text-[11px]" style={{ color: theme.node.label }}>
                    {template.size === "auto" ? t("artAsset.sizeAuto") : template.size}
                </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-4" style={{ color: theme.node.label }}>
                {template.summary ? local(template.summary) : t(`artAsset.templates.${template.id}.summary`)}
            </p>
        </div>
    );
}

function OptionRow({ option, value, onChange, theme }: { option: ArtAssetOption; value?: string; onChange: (value: string) => void; theme: CanvasTheme }) {
    return (
        <div className="space-y-1.5" onPointerDown={stop} onClick={stop}>
            <div className="text-[11px] font-medium tracking-wide" style={{ color: theme.node.label }}>
                {option.label ? local(option.label) : option.id}
            </div>
            <Segmented block size="small" value={value} onChange={(next) => onChange(String(next))} options={option.choices.map((choice, index) => ({ value: choice, label: <span title={choice}>{option.choiceLabels?.[index] ?? choice}</span> }))} />
        </div>
    );
}

/** One fixed-height line, so the card never jumps: hint, running, or the error. */
function StatusLine({ status, error, hint, theme }: { status?: string; error?: string; hint?: string; theme: CanvasTheme }) {
    const { t } = useTranslation();
    const failed = status === "error" && Boolean(error);
    const running = status === "loading";
    return (
        <div className="flex h-5 items-center gap-2 text-[11px]" style={{ color: running ? theme.node.text : theme.node.label }} title={failed ? error : undefined}>
            {running ? <span className="size-1.5 shrink-0 animate-pulse rounded-full" style={{ background: theme.node.text }} /> : failed ? <span className="size-1.5 shrink-0 rounded-full bg-destructive" /> : null}
            <span className="truncate" style={failed ? { color: theme.node.label } : undefined}>
                {running ? t("artAsset.running") : failed ? error : hint}
            </span>
        </div>
    );
}

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
    const Icon = iconFor(config.category, config.tier);

    const meta = node.metadata?.artAsset;
    const choose = (next: ArtAssetTemplate) => ctx.updateMetadata({ artAsset: { ...meta, category: next.category, templateId: next.id }, size: next.size });
    const patch = (extra: object) => template && ctx.updateMetadata({ artAsset: { ...meta, category: template.category, templateId: template.id, ...extra } });
    const hint = template && config.tier !== "derive" && !master ? t(template.input === "image" ? (config.tier === "master" ? "artAsset.needsImageOrMaster" : "artAsset.needsImage") : "artAsset.imageOrText") : undefined;

    return (
        <div className="flex h-full w-full flex-col gap-3 p-3.5 text-left" style={{ color: theme.node.text }}>
            <CardHeader title={local(config.title)} tier={config.tier} count={referenceCount} Icon={Icon} theme={theme} />

            {config.tier === "master" && !outputs.length ? <MissingMaster text={t("artAsset.masterEmpty")} theme={theme} /> : null}
            {outputs.length ? <AssetStrip label={t("artAsset.master")} images={outputs} activeId={master?.id} dimmed={!sharing} enabled={sharing} onPick={(id) => patch({ masterId: id, useMaster: true })} onToggle={(on) => patch({ useMaster: on })} theme={theme} /> : null}
            {config.tier === "derive" ? images.length ? <AssetStrip label={t(images.length > 1 ? "artAsset.masterMany" : "artAsset.masterOne")} images={images} activeId={images[0]?.id} theme={theme} /> : <MissingMaster text={t("artAsset.connectMaster")} theme={theme} /> : null}

            {config.categoryTabs ? (
                <div onPointerDown={stop} onClick={stop}>
                    <Segmented block size="small" value={category} onChange={(next) => choose(artAssetTemplates(next as ArtAssetCategory)[0]!)} options={ART_ASSET_CATEGORIES.map((item) => ({ value: item, label: t(`artAsset.categories.${item}`) }))} />
                </div>
            ) : null}

            <TemplateGrid templates={templates} activeId={template?.id} onChoose={choose} theme={theme} />
            <TemplateNote template={template} theme={theme} />
            {template?.options?.map((option) => <OptionRow key={option.id} option={option} value={options[option.id]} onChange={(value) => patch({ options: { ...meta?.options, [option.id]: value } })} theme={theme} />)}

            <div className="mt-auto">
                <StatusLine status={node.metadata?.status} error={node.metadata?.errorDetails} hint={hint} theme={theme} />
            </div>
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
        group: config.group ? local(config.group) : i18n.t("artAsset.group"),
        // A pack with a single node named like the category (分镜, 图像处理) needs no sub-heading.
        subgroup: config.label && local(config.label) !== local(config.title) ? local(config.label) : undefined,
        defaultSize: { width: 320, height: config.height },
        defaultMetadata: { artAsset: { category: first.category, templateId: first.id }, size: first.size, status: "idle" },
        minimapColor: "#a3a3a3",
        showInCreateMenu: config.showInCreateMenu,
        resource: () => null,
        Content,
        useBuiltinPanel: {
            mode: "image",
            allowEmptyPrompt: true,
            promptPlaceholder: (node) => i18n.t(config.category === "storyboard" ? "artAsset.placeholderStoryboard" : config.tier === "derive" ? "artAsset.placeholderDerive" : templateOf(node, config)?.input === "image" ? "artAsset.placeholderImage" : "artAsset.placeholder"),
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

/**
 * Default card height from its content: header, asset strip, template note and status line are about 262px (164px for tools, which have no asset strip), the
 * template grid takes 36px per row (six rows at most, then it scrolls) and an option row adds 56px.
 */
const cardHeight = (templates: ArtAssetTemplate[], tier: ArtAssetTier) => (tier === "tool" ? 164 : 262) + Math.min(6, Math.ceil(templates.length / 2)) * 36 + (templates.some((template) => template.options?.length) ? 56 : 0);

export const artAssetNodeDefinitions: CanvasNodeDefinition[] = [
    ...ART_ASSET_PACKS.flatMap((pack) =>
        ART_ASSET_TIERS.flatMap((tier) => {
            const spec = pack[tier];
            return spec ? [artAssetNode({ type: artAssetNodeType(pack.category, tier), title: spec.title, description: spec.description, label: pack.label, category: pack.category, group: pack.group, templates: spec.templates, tier, height: cardHeight(spec.templates, tier) })] : [];
        }),
    ),
    // The first combined node: hidden from menus, kept so existing canvases still work.
    artAssetNode({ type: ART_ASSET_NODE_TYPE, title: { zh: "美术资产", en: "Art asset" }, description: { zh: "人物、场景、服装、道具设定图", en: "Character, scene, costume, prop sheets" }, templates: combinedTemplates(), categoryTabs: true, height: 340, showInCreateMenu: false }),
];
