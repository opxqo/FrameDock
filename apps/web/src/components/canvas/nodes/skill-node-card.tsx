import { Segmented } from "antd";
import { useTranslation } from "react-i18next";

import { ArrowRight, SkillBook, type IconComponent } from "@/components/icons";
import { MissingMaster, OptionRow, StatusLine, local, stop, wash, type CanvasTheme } from "@/components/canvas/nodes/art-asset-parts";
import { artAssetOptionValues, findArtAssetTemplate, type ArtAssetTemplate, type LocalText } from "@/lib/art-assets/templates";
import { CanvasNodeType } from "@/types/canvas";
import type { CanvasNodeContext } from "@/types/canvas-plugin";

// FrameDock: the card of a Skill node (动作戏导演) — a different layout from the prompt cards on purpose, so the two
// kinds read apart at a glance: 来源 (the skills it is built on) → 输入 (connected images) → 设定 (type, length, impact)
// → 产出 (what it writes). Sections are separated by hairlines, never nested cards.

export type SkillCardConfig = {
    title: LocalText;
    templates: ArtAssetTemplate[];
    skills: Array<{ name: string; author: string }>;
    Icon: IconComponent;
    /** What the node writes, e.g. "六段式视频提示词". */
    outputLabel: LocalText;
    /** Name of the choice between templates, e.g. "战斗类型". */
    templateLabel: LocalText;
};

/**
 * Default height of a skill card: header with its skill lines, the input strip (the taller state, with images), the
 * settings block, and the output footer. Every section keeps its size, so a card that is too short overflows visibly
 * instead of squashing a control (see docs/design/preset-nodes.md 6.2).
 */
export const skillCardHeight = (skillCount: number, optionCount: number) => 342 + skillCount * 18 + optionCount * 61;

const Label = ({ children, theme }: { children: string; theme: CanvasTheme }) => (
    <div className="text-[11px] font-medium tracking-wide" style={{ color: theme.node.label }}>
        {children}
    </div>
);

export function SkillCard({ ctx, config }: { ctx: CanvasNodeContext; config: SkillCardConfig }) {
    const { t } = useTranslation();
    const { node, theme } = ctx;
    const { Icon } = config;
    const meta = node.metadata?.artAsset;
    const chosen = findArtAssetTemplate(meta?.templateId);
    const template = chosen && config.templates.includes(chosen) ? chosen : config.templates[0];
    const images = ctx.getUpstream().filter((item) => item.type === CanvasNodeType.Image && item.metadata?.content);
    const options = template ? artAssetOptionValues(template, meta?.options) : {};
    const shown = images.slice(0, 4);

    const choose = (id: string) => {
        const next = config.templates.find((item) => item.id === id);
        if (next) ctx.updateMetadata({ artAsset: { ...meta, category: next.category, templateId: next.id }, size: next.size });
    };
    const patch = (extra: object) => template && ctx.updateMetadata({ artAsset: { ...meta, category: template.category, templateId: template.id, ...extra } });

    return (
        <div className="flex h-full w-full flex-col gap-3 p-3.5 text-left" style={{ color: theme.node.text }}>
            <header className="shrink-0 space-y-2">
                <div className="flex items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-dashed" style={{ borderColor: theme.node.activeStroke, background: wash(theme, 6) }}>
                        <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-4">{local(config.title)}</div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4" style={{ borderColor: theme.node.stroke, color: theme.node.label }}>
                        <SkillBook className="size-3" />
                        {t("artAsset.skillBadge")}
                    </span>
                </div>
                <ul className="space-y-0.5 pl-[38px]">
                    {config.skills.map((skill) => (
                        <li key={skill.name} className="flex items-baseline gap-2 text-[11px] leading-4" style={{ color: theme.node.label }}>
                            <span className="min-w-0 truncate font-mono">{skill.name}</span>
                            <span className="shrink-0">{skill.author}</span>
                        </li>
                    ))}
                </ul>
            </header>

            <section className="shrink-0 space-y-2 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
                <div className="flex items-center justify-between">
                    <Label theme={theme}>{t("artAsset.skillInput")}</Label>
                    <span className="tnum text-[11px]" style={{ color: images.length ? theme.node.text : theme.node.label }}>
                        {images.length}
                    </span>
                </div>
                {images.length ? (
                    <div className="flex items-center gap-2">
                        {shown.map((image) => (
                            <span key={image.id} className="size-9 shrink-0 overflow-hidden rounded-lg" title={image.title}>
                                <img src={image.metadata?.content} alt={image.title} draggable={false} className="size-full object-cover" />
                            </span>
                        ))}
                        {images.length > shown.length ? (
                            <span className="tnum text-[11px]" style={{ color: theme.node.label }}>
                                +{images.length - shown.length}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <MissingMaster text={t("artAsset.skillInputEmpty")} theme={theme} />
                )}
            </section>

            <section className="shrink-0 space-y-3 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
                <div className="space-y-1.5" onPointerDown={stop} onClick={stop}>
                    <Label theme={theme}>{local(config.templateLabel)}</Label>
                    <Segmented block size="small" value={template?.id} onChange={(next) => choose(String(next))} options={config.templates.map((item) => ({ value: item.id, label: <span title={item.summary ? local(item.summary) : undefined}>{item.title ? local(item.title) : item.id}</span> }))} />
                    <p className="line-clamp-2 min-h-8 text-[11px] leading-4" style={{ color: theme.node.label }}>
                        {template?.summary ? local(template.summary) : ""}
                    </p>
                </div>
                {template?.options?.map((option) => <OptionRow key={option.id} option={option} value={options[option.id]} onChange={(value) => patch({ options: { ...meta?.options, [option.id]: value } })} theme={theme} />)}
            </section>

            <footer className="mt-auto shrink-0 space-y-2 border-t pt-3" style={{ borderColor: theme.node.stroke }}>
                <div className="flex items-center gap-1.5 text-[11px] leading-4" style={{ color: theme.node.label }}>
                    <ArrowRight className="size-3 shrink-0" />
                    <span className="truncate">{local(config.outputLabel)}</span>
                </div>
                <StatusLine status={node.metadata?.status} error={node.metadata?.errorDetails} hint={images.length ? undefined : t("artAsset.imageOrText")} theme={theme} />
            </footer>
        </div>
    );
}
