import { ArtAsset } from "@/components/icons";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import { ART_ASSET_CATEGORIES, ART_ASSET_DEFAULT_TEMPLATE, artAssetTemplates, composeArtAssetPrompt, findArtAssetTemplate, type ArtAssetCategory } from "@/lib/art-assets/templates";
import type { CanvasNodeData } from "@/types/canvas";
import type { CanvasNodeContext, CanvasNodeDefinition } from "@/types/canvas-plugin";

// FrameDock: 美术资产 — the first official preset node. The card picks an asset category and a preset template;
// the built-in image panel below supplies the model, settings and an optional extra description. Generation wraps
// that description (and any connected reference images) in the template and places the result to the right.

export const ART_ASSET_NODE_TYPE = "framedock:art-asset";

const templateOf = (node: CanvasNodeData) => findArtAssetTemplate(node.metadata?.artAsset?.templateId) ?? findArtAssetTemplate(ART_ASSET_DEFAULT_TEMPLATE);

function ArtAssetContent({ ctx }: { ctx: CanvasNodeContext }) {
    const { t } = useTranslation();
    const { node, theme } = ctx;
    const template = templateOf(node);
    const category = (template?.category ?? "character") as ArtAssetCategory;
    const references = ctx.getUpstream().filter((item) => item.type === "image" && item.metadata?.content).length;

    const choose = (templateId: string) => {
        const next = findArtAssetTemplate(templateId);
        if (!next) return;
        ctx.updateMetadata({ artAsset: { category: next.category, templateId: next.id }, size: next.size });
    };

    return (
        <div className="flex h-full w-full flex-col gap-3 p-3.5 text-left" style={{ color: theme.node.text }}>
            <div className="flex items-center gap-2 text-sm font-semibold">
                <ArtAsset className="size-4" style={{ color: theme.node.activeStroke }} />
                {t("artAsset.title")}
                <span className="ml-auto text-[11px] font-normal" style={{ color: theme.node.muted }}>
                    {t("artAsset.references", { count: references })}
                </span>
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-lg p-0.5" style={{ background: theme.node.fill }}>
                {ART_ASSET_CATEGORIES.map((item) => (
                    <button
                        key={item}
                        type="button"
                        className="h-7 rounded-md text-xs transition"
                        style={item === category ? { background: theme.node.activeStroke, color: "#fff" } : { color: theme.node.muted }}
                        onClick={(event) => {
                            event.stopPropagation();
                            choose(artAssetTemplates(item)[0]!.id);
                        }}
                    >
                        {t(`artAsset.categories.${item}`)}
                    </button>
                ))}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {artAssetTemplates(category).map((item) => {
                    const active = item.id === template?.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className="rounded-lg border px-3 py-2 text-left transition"
                            style={{ borderColor: active ? theme.node.activeStroke : theme.node.stroke, background: active ? theme.node.fill : "transparent" }}
                            onClick={(event) => {
                                event.stopPropagation();
                                choose(item.id);
                            }}
                        >
                            <div className="flex items-center gap-2 text-[13px] font-medium">
                                {t(`artAsset.templates.${item.id}.title`)}
                                <span className="ml-auto text-[10px] font-normal" style={{ color: theme.node.muted }}>
                                    {item.size === "auto" ? t("artAsset.sizeAuto") : item.size}
                                </span>
                            </div>
                            <div className="mt-0.5 text-[11px] leading-4" style={{ color: theme.node.muted }}>
                                {t(`artAsset.templates.${item.id}.summary`)}
                            </div>
                        </button>
                    );
                })}
            </div>
            {node.metadata?.status === "loading" ? (
                <div className="flex items-center gap-2 text-[11px]" style={{ color: theme.node.activeStroke }}>
                    <span className="size-3 animate-spin rounded-full border-2" style={{ borderColor: theme.node.stroke, borderTopColor: theme.node.activeStroke }} />
                    {t("artAsset.running")}
                </div>
            ) : node.metadata?.status === "error" && node.metadata.errorDetails ? (
                <div className="line-clamp-3 break-all text-[11px] leading-4 text-red-500" title={node.metadata.errorDetails}>
                    {node.metadata.errorDetails}
                </div>
            ) : template ? (
                <div className="text-[11px] leading-4" style={{ color: theme.node.muted }}>
                    {t(template.input === "image" ? "artAsset.needsImage" : "artAsset.imageOrText")}
                </div>
            ) : null}
        </div>
    );
}

const errorText = { noInput: "artAsset.errors.noInput", needsImage: "artAsset.errors.needsImage", noTemplate: "artAsset.errors.noTemplate" } as const;

export const artAssetNodeDefinition: CanvasNodeDefinition = {
    type: ART_ASSET_NODE_TYPE,
    title: i18n.t("artAsset.title"),
    description: i18n.t("artAsset.description"),
    icon: <ArtAsset className="size-4" />,
    defaultSize: { width: 320, height: 340 },
    defaultMetadata: { artAsset: { category: "character", templateId: ART_ASSET_DEFAULT_TEMPLATE }, size: findArtAssetTemplate(ART_ASSET_DEFAULT_TEMPLATE)?.size, status: "idle" },
    minimapColor: "#e879f9",
    resource: () => null,
    Content: ArtAssetContent,
    useBuiltinPanel: {
        mode: "image",
        allowEmptyPrompt: true,
        promptPlaceholder: (node) => {
            const template = templateOf(node);
            return i18n.t(template?.input === "image" ? "artAsset.placeholderImage" : "artAsset.placeholder");
        },
        composePrompt: (node, text, referenceCount) => {
            const result = composeArtAssetPrompt(templateOf(node), { description: text, referenceCount });
            return "error" in result ? { error: i18n.t(errorText[result.error]) } : result;
        },
        resultTitle: (node) => {
            const template = templateOf(node);
            return template ? `${i18n.t(`artAsset.categories.${template.category}`)} · ${i18n.t(`artAsset.templates.${template.id}.title`)}` : i18n.t("artAsset.title");
        },
    },
};
