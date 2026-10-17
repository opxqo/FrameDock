import type { ReactNode } from "react";
import { Hand, Map as MapIcon, Maximize, Minus, MousePointer2, Plus, Redo2, Undo2 } from "@/components/icons";
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
    canvasTool?: "select" | "pan";
    onCanvasToolChange?: (tool: "select" | "pan") => void;
};

const ZOOM_STEPS = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 2, 3, 4, 5];

// FrameDock: the bottom dock — one glass capsule centred under the canvas: tool (select / pan), zoom steps
// (click the percentage for 100%), fit, minimap, then history.
export function CanvasZoomControls({ scale, onScaleChange, onReset, isMiniMapOpen, onToggleMiniMap, onFit, canUndo, canRedo, onUndo, onRedo, canvasTool, onCanvasToolChange }: CanvasZoomControlsProps) {
    const { t } = useTranslation();
    const zoomOut = () => onScaleChange([...ZOOM_STEPS].reverse().find((step) => step < scale - 0.001) ?? ZOOM_STEPS[0]);
    const zoomIn = () => onScaleChange(ZOOM_STEPS.find((step) => step > scale + 0.001) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);

    return (
        <div data-canvas-bottom-toolbar className="glass absolute bottom-5 left-1/2 z-50 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-full px-2" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
            {onCanvasToolChange ? (
                <>
                    <ControlButton label={t("canvas.toolbar.select")} shortcut="V" active={canvasTool === "select"} onClick={() => onCanvasToolChange("select")}>
                        <MousePointer2 />
                    </ControlButton>
                    <ControlButton label={t("canvas.toolbar.pan")} shortcut="H" active={canvasTool === "pan"} onClick={() => onCanvasToolChange("pan")}>
                        <Hand />
                    </ControlButton>
                    <DockDivider />
                </>
            ) : null}
            <ControlButton label={t("canvas.zoomOut")} onClick={zoomOut}>
                <Minus />
            </ControlButton>
            <Tooltip title={<span className="inline-flex items-center gap-2">{t("canvas.resetView")}<kbd className="font-mono text-[11px] opacity-60">{MOD_KEY}0</kbd></span>} mouseEnterDelay={0.3}>
                <button type="button" onClick={onReset} className="tnum h-9 w-14 rounded-full font-mono text-[13px] text-foreground/85 transition-colors hover:bg-accent hover:text-foreground" aria-label={t("canvas.resetView")}>
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
            {onUndo ? (
                <>
                    <DockDivider />
                    <ControlButton label={t("canvas.undo")} shortcut={`${MOD_KEY}Z`} disabled={!canUndo} onClick={onUndo}>
                        <Undo2 />
                    </ControlButton>
                    <ControlButton label={t("canvas.redo")} shortcut={`${MOD_KEY}⇧Z`} disabled={!canRedo} onClick={onRedo}>
                        <Redo2 />
                    </ControlButton>
                </>
            ) : null}
        </div>
    );
}

function DockDivider() {
    return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
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
                className={cn("grid size-9 place-items-center rounded-full transition-colors duration-150 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-[18px]", active ? "bg-signal text-signal-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
            >
                {children}
            </button>
        </Tooltip>
    );
}
