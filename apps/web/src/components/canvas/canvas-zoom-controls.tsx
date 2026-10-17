import type { ReactNode } from "react";
import { Map as MapIcon, Maximize, Minus, Plus, Redo2, Undo2 } from "@/components/icons";
import { Tooltip } from "antd";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { MOD_KEY } from "@/stores/use-command-store";

type CanvasZoomControlsProps = {
    scale: number;
    onScaleChange: (scale: number) => void;
    onReset: () => void;
    isMiniMapOpen: boolean;
    onToggleMiniMap: () => void;
    onFit?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
};

const ZOOM_STEPS = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3, 4, 5];

// FrameDock: bottom-left view controls — history, zoom steps (click the percentage for 100%), fit, minimap.
export function CanvasZoomControls({ scale, onScaleChange, onReset, isMiniMapOpen, onToggleMiniMap, onFit, canUndo, canRedo, onUndo, onRedo }: CanvasZoomControlsProps) {
    const { t } = useTranslation();
    const zoomOut = () => onScaleChange([...ZOOM_STEPS].reverse().find((step) => step < scale - 0.001) ?? ZOOM_STEPS[0]);
    const zoomIn = () => onScaleChange(ZOOM_STEPS.find((step) => step > scale + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);

    return (
        <div data-canvas-bottom-toolbar className="absolute bottom-3 left-3 z-50 flex items-center gap-1.5" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            {onUndo ? (
                <div className="flex h-9 items-center rounded-lg border border-border bg-card p-0.5 shadow-panel">
                    <ControlButton label={t("canvas.undo")} shortcut={`${MOD_KEY}Z`} disabled={!canUndo} onClick={onUndo}>
                        <Undo2 />
                    </ControlButton>
                    <ControlButton label={t("canvas.redo")} shortcut={`${MOD_KEY}⇧Z`} disabled={!canRedo} onClick={onRedo}>
                        <Redo2 />
                    </ControlButton>
                </div>
            ) : null}
            <div className="flex h-9 items-center rounded-lg border border-border bg-card p-0.5 shadow-panel">
                <ControlButton label={t("canvas.zoomOut")} onClick={zoomOut}>
                    <Minus />
                </ControlButton>
                <Tooltip title={<span className="inline-flex items-center gap-2">{t("canvas.resetView")}<kbd className="font-mono text-[11px] opacity-60">{MOD_KEY}0</kbd></span>} mouseEnterDelay={0.3}>
                    <button type="button" onClick={onReset} className="tnum h-8 w-12 rounded-md font-mono text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label={t("canvas.resetView")}>
                        {Math.round(scale * 100)}%
                    </button>
                </Tooltip>
                <ControlButton label={t("canvas.zoomIn")} onClick={zoomIn}>
                    <Plus />
                </ControlButton>
                {onFit ? (
                    <ControlButton label={t("canvas.shortcutGroups.fit")} shortcut="⇧1" onClick={onFit}>
                        <Maximize />
                    </ControlButton>
                ) : null}
                <ControlButton label={isMiniMapOpen ? t("canvas.miniMapClose") : t("canvas.miniMapOpen")} active={isMiniMapOpen} onClick={onToggleMiniMap}>
                    <MapIcon />
                </ControlButton>
            </div>
        </div>
    );
}

function ControlButton({ label, shortcut, active = false, disabled = false, onClick, children }: { label: string; shortcut?: string; active?: boolean; disabled?: boolean; onClick?: () => void; children: ReactNode }) {
    return (
        <Tooltip title={<span className="inline-flex items-center gap-2">{label}{shortcut ? <kbd className="font-mono text-[11px] opacity-60">{shortcut}</kbd> : null}</span>} mouseEnterDelay={0.3}>
            <button
                type="button"
                aria-label={label}
                aria-pressed={active || undefined}
                disabled={disabled}
                onClick={onClick}
                className={cn("grid size-8 place-items-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4", active ? "bg-signal/15 text-signal" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
            >
                {children}
            </button>
        </Tooltip>
    );
}
