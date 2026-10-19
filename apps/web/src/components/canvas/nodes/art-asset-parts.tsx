import { Segmented, Switch } from "antd";
import { useTranslation } from "react-i18next";

import i18n from "@/i18n";
import type { ArtAssetOption, LocalText } from "@/lib/art-assets/templates";
import type { CanvasNodeData } from "@/types/canvas";
import type { CanvasNodeContext } from "@/types/canvas-plugin";

// FrameDock: pieces shared by the two kinds of preset card — the prompt card (art-asset-node.tsx) and the skill card
// (skill-node-card.tsx): theme helpers, the strip of connected images, option rows and the status line.

/** Pack text in the app's language. */
export const local = (text: LocalText) => (i18n.resolvedLanguage?.startsWith("en") ? text.en : text.zh);

export type CanvasTheme = CanvasNodeContext["theme"];
/** A neutral wash of the node's text colour: the selected-row and hover fill of the design system (10% / 6%). */
export const wash = (theme: CanvasTheme, percent = 10) => `color-mix(in srgb, ${theme.node.text} ${percent}%, transparent)`;
export const ring = (theme: CanvasTheme) => `inset 0 0 0 1px ${theme.node.activeStroke}`;
export const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

/** The images a node works from: its 母版 (定稿, with an on/off switch) or the connected 参考 (派生). */
export function AssetStrip({ label, images, activeId, dimmed, onPick, onToggle, enabled, theme }: { label: string; images: CanvasNodeData[]; activeId?: string; dimmed?: boolean; onPick?: (id: string) => void; onToggle?: (on: boolean) => void; enabled?: boolean; theme: CanvasTheme }) {
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
export function MissingMaster({ text, theme }: { text: string; theme: CanvasTheme }) {
    return (
        <div className="flex min-h-12 items-center rounded-lg border border-dashed px-3 py-2 text-[11px] leading-4" style={{ borderColor: theme.node.activeStroke, color: theme.node.label }}>
            {text}
        </div>
    );
}

export function OptionRow({ option, value, onChange, theme }: { option: ArtAssetOption; value?: string; onChange: (value: string) => void; theme: CanvasTheme }) {
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
export function StatusLine({ status, error, hint, theme }: { status?: string; error?: string; hint?: string; theme: CanvasTheme }) {
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
