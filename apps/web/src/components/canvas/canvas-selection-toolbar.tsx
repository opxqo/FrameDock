import type { ReactNode } from "react";
import { Grid2x2, Group, Play, Ungroup } from "@/components/icons";
import { Dropdown, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { nodeBounds } from "@/lib/canvas/canvas-node-geometry";
import type { ArrangeMode } from "@/lib/canvas/canvas-arrange";
import { useThemeStore } from "@/stores/use-theme-store";
import type { CanvasNodeData, ViewportTransform } from "@/types/canvas";

const SELECTION_PAD = 14;

export function CanvasSelectionToolbar({
    nodes,
    viewport,
    showToolbar,
    canGroup,
    canUngroup,
    onGroup,
    onUngroup,
    onRun,
    onArrange,
}: {
    nodes: CanvasNodeData[];
    viewport: ViewportTransform;
    showToolbar: boolean;
    canGroup: boolean;
    canUngroup: boolean;
    onGroup: () => void;
    onUngroup: () => void;
    /** Run the selected nodes in dependency order. */
    onRun?: () => void;
    /** Present when at least two free-standing nodes can be tidied. */
    onArrange?: (mode: ArrangeMode) => void;
}) {
    const { t } = useTranslation();
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (nodes.length < 2) return null;

    const bounds = nodeBounds(nodes);
    const left = viewport.x + bounds.left * viewport.k - SELECTION_PAD;
    const top = viewport.y + bounds.top * viewport.k - SELECTION_PAD;
    const width = (bounds.right - bounds.left) * viewport.k + SELECTION_PAD * 2;
    const height = (bounds.bottom - bounds.top) * viewport.k + SELECTION_PAD * 2;
    const showActions = showToolbar && (canGroup || canUngroup || Boolean(onRun) || Boolean(onArrange));

    return (
        <>
            <svg className="pointer-events-none absolute z-[65] overflow-visible" style={{ left, top, width, height }}>
                <rect
                    x={1}
                    y={1}
                    width={Math.max(width - 2, 0)}
                    height={Math.max(height - 2, 0)}
                    rx={16}
                    ry={16}
                    fill={theme.canvas.selectionFill}
                    stroke={theme.canvas.selectionStroke}
                    strokeOpacity={0.55}
                    strokeWidth={1.5}
                    strokeDasharray="7 5"
                    strokeLinecap="round"
                />
            </svg>
            {showActions ? (
                <div
                    className="glass absolute z-[70] flex h-11 -translate-x-1/2 -translate-y-full items-center overflow-visible rounded-full px-1 text-[13px] text-popover-foreground"
                    style={{ left: left + width / 2, top: top - 8 }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    {canGroup ? <SelectionAction title={t("canvas.nodeToolbar.groupTitle")} label={t("canvas.nodeToolbar.group")} icon={<Group className="size-4" />} onClick={onGroup} /> : null}
                    {canUngroup ? <SelectionAction title={t("canvas.nodeToolbar.ungroupTitle")} label={t("canvas.nodeToolbar.ungroup")} icon={<Ungroup className="size-4" />} onClick={onUngroup} /> : null}
                    {onArrange ? (
                        <Dropdown
                            trigger={["click"]}
                            menu={{
                                items: (["row", "column", "grid"] as const).map((mode) => ({ key: mode, label: t(`canvas.arrange.${mode}`), onClick: () => onArrange(mode) })),
                            }}
                        >
                            <button type="button" className="group relative flex h-10 items-center whitespace-nowrap px-0.5" aria-label={t("canvas.arrange.title")}>
                                <span className="flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors duration-150 group-hover:bg-accent">
                                    <Grid2x2 className="size-4" />
                                    <span>{t("canvas.arrange.title")}</span>
                                </span>
                            </button>
                        </Dropdown>
                    ) : null}
                    {onRun ? <SelectionAction title={t("canvas.workflow.runSelectionTitle")} label={t("canvas.workflow.runSelectionShort")} icon={<Play className="size-4" />} onClick={onRun} /> : null}
                </div>
            ) : null}
        </>
    );
}

function SelectionAction({ title, label, icon, onClick }: { title: string; label: string; icon: ReactNode; onClick: () => void }) {
    return (
        <Tooltip title={title} placement="top" mouseEnterDelay={0.2}>
            <button type="button" className="group relative flex h-10 items-center whitespace-nowrap px-0.5" onClick={onClick} aria-label={title}>
                <span className="flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors duration-150 group-hover:bg-accent">
                    {icon}
                    <span>{label}</span>
                </span>
            </button>
        </Tooltip>
    );
}
